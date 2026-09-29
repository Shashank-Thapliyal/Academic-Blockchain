import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { Database, RefreshCw, History, Activity, Radio, FileText, CheckCircle2, ChevronRight, Layers, Copy, Check } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function LedgerExplorer() {
  const [certs, setCerts] = useState([]);
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [loadingCerts, setLoadingCerts] = useState(false);
  
  const [copiedField, setCopiedField] = useState(null);

  const copyToClipboard = (text, field, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showInfo(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // History state
  const [historyKey, setHistoryKey] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [activeHistoryTab, setActiveHistoryTab] = useState('workflow'); // 'workflow' | 'certificate'

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

  const queryHistory = async (explicitKey) => {
    const raw = explicitKey !== undefined ? explicitKey : historyKey;
    if (!raw || !raw.trim()) {
      showWarning('Please enter a Certificate ID or Request ID.', 'Missing Identifier');
      return;
    }
    const cleanKey = raw.trim();
    setHistoryKey(cleanKey);
    setHistoryLoading(true);

    try {
      const res = await fetch(`${API_BASE}/history/${encodeURIComponent(cleanKey)}`);
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'History query failed', 'Provenance Query Failed');
        return;
      }
      setHistoryData(data);

      // Auto-set the active tab: if requestHistory exists, default to 'workflow' (where all the 8 endorsement transactions are!)
      if (data.requestHistory && data.requestHistory.length > 0) {
        setActiveHistoryTab('workflow');
      } else {
        setActiveHistoryTab('certificate');
      }

      const totalTxs = (data.history?.length || 0) + (data.requestHistory?.length || 0) + (data.certHistory?.length || 0);
      showInfo(`Loaded ledger provenance for '${data.key || cleanKey}' (${totalTxs} total block transitions found).`, 'Provenance Retrieved');
    } catch (err) {
      showError(err, 'History Query Error');
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

  // Determine which transaction records to show based on active tab
  const getDisplayRecords = () => {
    if (!historyData) return [];
    if (activeHistoryTab === 'workflow') {
      return historyData.requestHistory && historyData.requestHistory.length > 0 
        ? historyData.requestHistory 
        : historyData.history || [];
    }
    return historyData.certHistory && historyData.certHistory.length > 0 
      ? historyData.certHistory 
      : historyData.history || [];
  };

  const displayRecords = getDisplayRecords();
  const hasBothHistories = Boolean(
    (historyData?.requestHistory && historyData?.requestHistory.length > 0) || 
    (historyData?.certHistory && historyData?.certHistory.length > 0)
  );

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
                <th style={{ minWidth: "190px" }}>IPFS CID</th>
                <th style={{ minWidth: "220px" }}>SHA-256 Hash</th>
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
                    <td>
                      <code 
                        style={{ cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                        title="Click to inspect lifecycle in State History Inspector"
                        onClick={() => queryHistory(c.certId)}
                      >
                        {c.certId}
                      </code>
                    </td>
                    <td>{c.studentId}</td>
                    <td><strong>{c.certType}</strong></td>
                    <td>
                      <span className={`badge-status ${c.status === 'ISSUED' ? 'VERIFIED' : 'REVOKED'}`} style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.ipfsHash ? (
                        <div className="ledger-hash-cell">
                          <a 
                            href={`http://localhost:8080/ipfs/${c.ipfsHash}`} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="ledger-cid-link"
                            title={c.ipfsHash}
                          >
                            {c.ipfsHash}
                          </a>
                          <button 
                            type="button" 
                            className="btn-icon-copy" 
                            title="Copy IPFS CID"
                            onClick={() => copyToClipboard(c.ipfsHash, `cid-${c.certId}`, "IPFS CID")}
                          >
                            {copiedField === `cid-${c.certId}` ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      {c.docHash ? (
                        <div className="ledger-hash-cell">
                          <span className="ledger-hash-full" title={c.docHash}>
                            {c.docHash}
                          </span>
                          <button 
                            type="button" 
                            className="btn-icon-copy" 
                            title="Copy full SHA-256 Hash"
                            onClick={() => copyToClipboard(c.docHash, `hash-${c.certId}`, "SHA-256 Hash")}
                          >
                            {copiedField === `hash-${c.certId}` ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted">N/A</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                          onClick={() => queryHistory(c.certId)}
                        >
                          <History size={12} /> Inspect Trail
                        </button>
                        <a 
                          href={`${API_BASE}/certificates/${c.certId}/pdf`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn-secondary btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                        >
                          <FileText size={12} /> PDF
                        </a>
                      </div>
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
          <p className="subtitle">
            Inspect cryptographic block-by-block transitions for any Certificate (<code>CERT-...</code>) or Workflow Request (<code>REQ-...</code>).
          </p>

          <div className="lookup-bar">
            <input 
              type="text" 
              id="historyKeyInput" 
              placeholder="e.g. CERT-2024-1872 or REQ-2024-1872 (prefixes auto-resolved)"
              value={historyKey}
              onChange={(e) => setHistoryKey(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') queryHistory(); }}
            />
            <button type="button" className="btn-primary" id="queryHistoryBtn" onClick={() => queryHistory()} disabled={historyLoading}>
              Inspect Trail
            </button>
          </div>

          <div id="historyTimelineDisplay" style={{ minHeight: '120px' }}>
            {historyLoading ? (
              <p className="placeholder-text">⏳ Traversing ledger historical blocks...</p>
            ) : !historyData ? (
              <p className="placeholder-text">Enter a Certificate or Request ID above to query its immutable lifecycle blocks.</p>
            ) : (
              <div>
                {/* Architectural Explainer Banner */}
                <div style={{
                  background: 'var(--bg-card-subtle)',
                  border: '1px solid var(--border)',
                  borderLeft: '4px solid var(--primary)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '1rem',
                  fontSize: 'var(--text-xs)'
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💡 Dual-Entity Ledger Architecture:</strong>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    The <strong>Workflow Request</strong> records all 7 sequential stage endorsements (Student → Faculty → HOD → DAC → Exam Lock → Dean → Admin). The final <strong>Certificate</strong> is minted as an anchored credential in 1 final transaction once all endorsements are complete.
                  </p>
                </div>

                {/* Segmented View Switcher if both histories exist */}
                {hasBothHistories && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                      type="button"
                      className={`btn-sm ${activeHistoryTab === 'workflow' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setActiveHistoryTab('workflow')}
                    >
                      <Layers size={13} />
                      Approval Lifecycle ({historyData.requestHistory?.length || historyData.history?.length} Txs)
                    </button>
                    <button
                      type="button"
                      className={`btn-sm ${activeHistoryTab === 'certificate' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setActiveHistoryTab('certificate')}
                    >
                      <CheckCircle2 size={13} />
                      Minted Certificate ({historyData.certHistory?.length || (historyData.requestHistory ? historyData.history?.length : 1)} Tx)
                    </button>
                  </div>
                )}

                {displayRecords.length === 0 ? (
                  <p className="placeholder-text">No ledger historical records found for key <code>{historyData.key || historyKey}</code>.</p>
                ) : (
                  <div className="timeline-feed">
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      Showing {displayRecords.length} block transition(s) for ledger key: <code>{activeHistoryTab === 'workflow' ? (historyData.linkedRequestKey || historyData.key) : (historyData.linkedCertKey || historyData.key)}</code>
                    </p>

                    {displayRecords.map((r, i) => {
                      const val = r.value || {};
                      const stageName = val.status || (activeHistoryTab === 'workflow' ? val.history?.[val.history.length - 1]?.stage : 'ISSUED');
                      const signer = val.history?.[val.history.length - 1]?.updatedBy || val.issuerMSP || 'Peer Node';
                      const comments = val.history?.[val.history.length - 1]?.comments || '';

                      return (
                        <div key={i} style={{ borderLeft: '2px solid var(--primary)', paddingLeft: '1rem', marginBottom: '1.25rem', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-7px', top: '2px', width: '12px', height: '12px', borderRadius: '50%', background: r.isDelete ? 'var(--danger)' : 'var(--primary)' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem' }}>
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
                              #{i + 1} • <span style={{ color: 'var(--primary)' }}>{stageName}</span> • Tx: <code style={{ fontSize: '0.72rem' }}>{r.txId ? r.txId.substring(0, 16) + '...' : 'N/A'}</code>
                            </span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            Signed by: <code>{signer}</code>
                            {comments && <span style={{ marginLeft: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>— "{comments}"</span>}
                          </div>

                          <pre style={{
                            marginTop: '0.35rem',
                            background: 'var(--bg-input)',
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.68rem',
                            color: 'var(--text-secondary)',
                            maxHeight: '120px',
                            overflowY: 'auto'
                          }}>
                            {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live SSE Event Stream */}
        <div className="card">
          <div className="card-title">
            <h3>
              <Activity size={18} className="text-primary" />
              Live Network Activity Feed
            </h3>
            <span className={`step-num ${sseActive ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Radio size={12} className={sseActive ? 'animate-pulse' : ''} />
              {sseActive ? 'SSE ACTIVE' : 'CONNECTING...'}
            </span>
          </div>
          <p className="subtitle">Real-time Server-Sent Events stream (<code>GET /api/events</code>) emitted directly from Fabric chaincode blocks.</p>

          <div className="event-stream-container" id="eventsContainer">
            {events.length === 0 ? (
              <p className="placeholder-text">Waiting for consortium block events...</p>
            ) : (
              events.map((ev, idx) => (
                <div key={idx} className="event-item" style={{ borderLeft: '3px solid var(--primary)', padding: '0.5rem 0.75rem', marginBottom: '0.5rem', background: 'var(--bg-card-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                    <strong style={{ color: 'var(--primary)' }}>{ev.eventName || 'Block Event'}</strong>
                    <span style={{ color: 'var(--text-muted)' }}>Block #{ev.blockNumber || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    TxId: <code>{ev.transactionId ? ev.transactionId.substring(0, 16) + '...' : 'N/A'}</code>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
