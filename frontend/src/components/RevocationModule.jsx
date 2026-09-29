import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function RevocationModule() {
  const [certId, setCertId] = useState('');
  const [reason, setReason] = useState('');
  const [officer, setOfficer] = useState('Dean / Controller of Academic Integrity');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!certId || !reason) {
      alert('Please fill out Certificate ID and Revocation Reason.');
      return;
    }

    if (!window.confirm(`⚠️ WARNING: Are you sure you want to permanently revoke certificate ${certId} on the immutable Fabric ledger? This operation cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId,
          reason,
          revokedBy: officer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Certificate ${certId} successfully REVOKED on Hyperledger Fabric ledger!` });
        setCertId('');
        setReason('');
      } else {
        setMessage({ type: 'error', text: data.error || 'Revocation failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '750px', margin: '0 auto' }}>
      <div className="card-title">
        <h3 style={{ color: 'var(--danger)' }}>
          <ShieldAlert size={20} />
          Revoke Academic Certificate
        </h3>
        <span className="step-num" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)' }}>
          Admin / Org 3
        </span>
      </div>
      <p className="subtitle">
        Revoke an academic credential for disciplinary breach, clerical withdrawal, or fraudulent claim. Revocation state is recorded permanently on the immutable blockchain ledger.
      </p>

      {message && (
        <div className={`result-banner status-${message.type === 'success' ? 'verified' : 'invalid'}`} style={{ padding: '0.75rem', marginBottom: '1rem' }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{message.text}</p>
        </div>
      )}

      <form id="revokeForm" onSubmit={handleRevoke}>
        <div className="form-group">
          <label htmlFor="revokeCertId">Certificate ID to Revoke:</label>
          <input 
            type="text" 
            id="revokeCertId" 
            required 
            placeholder="e.g. CERT-2024-001"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="revokeReason">Official Revocation Reason:</label>
          <textarea 
            id="revokeReason" 
            rows="3" 
            required 
            placeholder="State official audit, committee resolution, or disciplinary rationale..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="revokeOfficer">Revoking Authority:</label>
          <input 
            type="text" 
            id="revokeOfficer" 
            value={officer}
            onChange={(e) => setOfficer(e.target.value)}
          />
        </div>

        <button 
          type="submit" 
          className="btn-danger full-width"
          disabled={loading}
        >
          {loading ? 'Executing Revocation on Ledger...' : '⚠️ Execute Immutable Revocation on Blockchain'}
        </button>
      </form>
    </div>
  );
}
