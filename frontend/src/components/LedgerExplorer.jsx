import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, History, Activity, Radio, FileText } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function LedgerExplorer() {
  const [certs, setCerts] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(false);
  
  // History state
  const [historyKey, setHistoryKey] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRecords, setHistoryRecords] = useState(null);

  // SSE Events state
  const [events, setEvents] = useState([]);
  const [sseActive, setSseActive] = useState(false);

  useEffect(() => {
    fetchCertificates();
    initSseListener();
  }, []);

  const fetchCertificates = async () => {
    setLoadingCerts(true);
    try {
      const res = await fetch(`${API_BASE}/certificates`);
      const data = await res.json();
      if (Array.isArray(data)) setCerts(data);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoadingCerts(false);
    }
  };

  const queryHistory = async () => {
    if (!historyKey.trim()) {
      alert('Please enter a Certificate ID or Request ID.');
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/history/${encodeURIComponent(historyKey.trim())}`);
      const data = await res.json();
      setHistoryRecords(data.history || []);
    } catch (err) {
      alert(`History query error: ${err.message}`);
    } finally {
      setHistoryLoading(false);
    }
  };

  const initSseListener = () => {
    try {
      const eventSource = new EventSource(`${API_BASE}/events`);
      eventSource.addEventListener('ready', () => setSseActive(true));
      eventSource.addEventListener('ledger', (e) => {
        try {
          const payload = JSON.parse(e.data);
          setEvents(prev => [payload, ...prev].slice(0, 50));
        } catch (err) {
          console.warn('Failed to parse SSE event:', err);
        }
      });
      eventSource.onerror = () => setSseActive(false);
    } catch (err) {
      console.warn('SSE initiation failed:', err);
    }
  };

  return (
    <div>
      {/* 1. Certificates World State */}
      <div className="card full-width-card">
        <div className="card-title">
          <h3>
            <Database size={18} className="text-primary" />
            Immutable Ledger Certificates
          </h3>
          <button 
            className="btn-secondary btn-sm" 
            id="refreshCertsBtn"
            onClick={fetchCertificates}
            disabled={loadingCerts}
          >
            <RefreshCw size={14} className={loadingCerts ? 'animate-spin' : ''} />
            Refresh Ledger
          </button>
        </div>
        <p className="subtitle">Current state database snapshot across Org1, Org2, and Org3 CouchDB replicas.</p>

        <div className="table-container">
          <table id="certsTable">
            <thead>
              <tr>
                <th>Cert ID</th>
                <th>Student ID</th>
                <th>Degree Title</th>
                <th>Status</th>
                <th>IPFS CID</th>
                <th>SHA-256 Hash</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="certsTbody">
              {loadingCerts && certs.length === 0 ? (
                <tr><td colSpan="7" className="empty-hint">Querying ledger records...</td></tr>
              ) : certs.length === 0 ? (
                <tr><td colSpan="7" className="empty-hint">No certificate records found on ledger.</td></tr>
              ) : (
                certs.map((c) => (
                  <tr key={c.certId}>
                    <td><code>{c.certId}</code></td>
                    <td>{c.studentId}</td>
                    <td><strong>{c.certType}</strong></td>
                    <td>
                      <span className={`badge-status ${c.status === 'ISSUED' ? 'VERIFIED' : 'REVOKED'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.ipfsHash ? (
                        <a href={`http://localhost:8080/ipfs/${c.ipfsHash}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>
                          {c.ipfsHash.substring(0, 10)}...
                        </a>
                      ) : 'N/A'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                      {c.docHash ? `${c.docHash.substring(0, 16)}...` : 'N/A'}
                    </td>
                    <td>
                      <a href={`${API_BASE}/certificates/${c.certId}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">
                        <FileText size={12} /> PDF
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Key History & Live Event Ticker Grid */}
      <div className="panel-grid" style={{ marginTop: '1.5rem' }}>
        {/* GetHistoryForKey */}
        <div className="card">
          <div className="card-title">
            <h3>
              <History size={18} className="text-primary" />
              State History Inspector
            </h3>
            <span className="step-num">GetHistoryForKey</span>
          </div>
          <p className="subtitle">Inspect cryptographic provenance and block-by-block transitions for any key.</p>

          <div className="lookup-bar">
            <input 
              type="text" 
              id="historyKeyInput" 
              placeholder="e.g. CERT-2024-001 or REQ-2024-001"
              value={historyKey}
              onChange={(e) => setHistoryKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') queryHistory(); }}
            />
            <button type="button" className="btn-primary" id="queryHistoryBtn" onClick={queryHistory} disabled={historyLoading}>
              Inspect Trail
            </button>
          </div>

          <div id="historyTimelineDisplay" style={{ minHeight: '120px' }}>
            {historyLoading ? (
              <p className="placeholder-text">⏳ Traversing ledger historical blocks...</p>
            ) : !historyRecords ? (
              <p className="placeholder-text">Enter a Certificate or Request ID above to query its immutable lifecycle blocks.</p>
            ) : historyRecords.length === 0 ? (
              <p className="placeholder-text">No ledger historical records found for key <code>{historyKey}</code>.</p>
            ) : (
              <div className="timeline-feed">
                {historyRecords.map((r, i) => (
                  <div key={i} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1.25rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-7px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: r.isDelete ? 'var(--danger)' : 'var(--primary)' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                        #{i + 1} • Tx: <code style={{ fontSize: '0.72rem' }}>{r.txId ? r.txId.substring(0, 16) + '...' : 'N/A'}</code>
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {r.timestamp ? new Date(r.timestamp).toLocaleString() : ''}
                      </span>
                    </div>
                    {r.isDelete && (
                      <span style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px' }}>
                        DELETED
                      </span>
                    )}
                    <pre style={{ background: 'var(--bg-card-subtle)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem', overflowX: 'auto', maxHeight: '120px', marginTop: '0.35rem', color: 'var(--text-secondary)' }}>
                      {typeof r.value === 'object' ? JSON.stringify(r.value, null, 2) : String(r.value || '')}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Real-Time SSE Activity Stream */}
        <div className="card">
          <div className="card-title">
            <h3>
              <Activity size={18} className="text-primary" />
              Live Network Activity Feed
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`status-dot ${sseActive ? 'online' : 'offline'}`} />
              <span className="step-num">{sseActive ? 'SSE Active' : 'Disconnected'}</span>
              <button 
                type="button" 
                className="btn-secondary btn-sm" 
                id="clearEventsBtn"
                onClick={() => setEvents([])}
              >
                Clear
              </button>
            </div>
          </div>
          <p className="subtitle">Real-time Server-Sent Events stream (<code>GET /api/events</code>) emitted directly from Fabric chaincode blocks.</p>

          <div className="event-feed-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
            <ul id="eventTickerList" className="activity-feed" style={{ listStyle: 'none' }}>
              {events.length === 0 ? (
                <li className="empty-hint">Waiting for consortium block events...</li>
              ) : (
                events.map((e, idx) => (
                  <li key={idx} style={{ padding: '0.6rem 0.8rem', marginBottom: '0.5rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--primary)', fontSize: 'var(--text-sm)' }}>
                        ⚡ {e.eventName || e.type || 'LedgerEvent'}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <span>Tx: <code>{e.txId ? e.txId.substring(0, 14) + '...' : 'Consensus'}</code></span>
                      {e.payload && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {typeof e.payload === 'object' ? JSON.stringify(e.payload) : String(e.payload)}
                        </div>
                      )}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
