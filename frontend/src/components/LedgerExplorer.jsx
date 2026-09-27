import React, { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { RefreshCw, FileText, Radio } from 'lucide-react';

export default function LedgerExplorer() {
  const { API_BASE } = useNetwork();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventStatus, setEventStatus] = useState('CONNECTING');

  const fetchCerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/certificates`);
      const data = await res.json();
      setCerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  useEffect(() => {
    const source = new EventSource(`${API_BASE}/events`);

    source.addEventListener('ready', (event) => {
      const status = JSON.parse(event.data);
      setEventStatus(status.started ? 'LIVE' : 'UNAVAILABLE');
    });

    source.addEventListener('ledger', (event) => {
      const ledgerEvent = JSON.parse(event.data);
      setEvents((current) => [ledgerEvent, ...current].slice(0, 12));
      setEventStatus('LIVE');
      if (ledgerEvent.type === 'chaincode') {
        fetchCerts();
      }
    });

    source.onerror = () => setEventStatus('DISCONNECTED');
    return () => source.close();
  }, [API_BASE]);

  return (
    <div className="card">
      <div className="card-title">
        <h3>Immutable Ledger Certificates</h3>
        <button className="btn-secondary btn-sm" onClick={fetchCerts}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Ledger
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cert ID</th>
              <th>Student ID</th>
              <th>Degree Title</th>
              <th>Status</th>
              <th>IPFS CID</th>
              <th>SHA-256 Digest</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="empty-hint">Querying ledger records...</td></tr>
            ) : certs.length === 0 ? (
              <tr><td colSpan="7" className="empty-hint">No certificates on ledger yet.</td></tr>
            ) : (
              certs.map((c) => (
                <tr key={c.certId}>
                  <td><code>{c.certId}</code></td>
                  <td>{c.studentId}</td>
                  <td><strong>{c.certType}</strong></td>
                  <td>
                    <span className={`status-pill ${c.status === 'ISSUED' ? 'issued' : 'revoked'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    {c.ipfsHash ? (
                      <a href={`http://localhost:8080/ipfs/${c.ipfsHash}`} target="_blank" rel="noreferrer" style={{ color: '#38bdf8', textDecoration: 'none' }}>
                        {c.ipfsHash.substring(0, 10)}...
                      </a>
                    ) : '—'}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.75rem' }}>
                      {c.docHash ? `${c.docHash.substring(0, 14)}...` : '—'}
                    </code>
                  </td>
                  <td>
                    <a href={`${API_BASE}/certificates/${c.certId}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                      <FileText size={12} /> PDF
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="ledger-events">
        <div className="ledger-events-title">
          <div>
            <h4>Live Fabric Events</h4>
            <p>Block commits and academic lifecycle events received from the ledger.</p>
          </div>
          <span className={`event-connection ${eventStatus.toLowerCase()}`}>
            <Radio size={13} /> {eventStatus}
          </span>
        </div>
        {events.length === 0 ? (
          <p className="empty-hint">Waiting for the next ledger event...</p>
        ) : (
          <div className="ledger-event-list">
            {events.map((event, index) => {
              const payload = event.payload || {};
              const label = event.type === 'chaincode'
                ? `${payload.action || event.eventName} · ${payload.entityId || 'ledger'}`
                : `Block ${event.blockNumber} committed`;
              return (
                <div className="ledger-event-row" key={`${event.transactionId || event.blockNumber}-${index}`}>
                  <span className="ledger-event-kind">{event.type}</span>
                  <strong>{label}</strong>
                  <code>{event.transactionId ? `${event.transactionId.substring(0, 12)}...` : `#${event.blockNumber}`}</code>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
