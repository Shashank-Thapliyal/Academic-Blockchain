import React, { useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

export default function RevocationModule({ onRevoked }) {
  const { API_BASE } = useNetwork();
  const [form, setForm] = useState({
    certId: '',
    reason: '',
    revokedBy: 'Dean / Controller of Academic Integrity'
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!window.confirm(`Are you sure you want to permanently revoke certificate ${form.certId} on the blockchain?`)) {
      return;
    }

    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `⚠️ Certificate ${form.certId} has been successfully REVOKED on Hyperledger Fabric!` });
        setForm({ certId: '', reason: '', revokedBy: 'Dean / Controller of Academic Integrity' });
        if (onRevoked) onRevoked();
      } else {
        setFeedback({ type: 'error', message: `Revocation failed: ${data.error}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Network error: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="card-title">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={20} color="#ef4444" />
          Revoke Academic Certificate
        </h3>
        <span className="step-num" style={{ borderColor: '#ef4444', color: '#f87171' }}>Admin / Org 3</span>
      </div>
      <p className="subtitle">
        Revoke a fraudulent, withdrawn, or administratively canceled certificate on the immutable Fabric ledger.
      </p>

      {feedback && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
          background: feedback.type === 'success' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          color: feedback.type === 'success' ? '#f87171' : '#fbbf24',
          border: `1px solid ${feedback.type === 'success' ? '#ef4444' : '#f59e0b'}`
        }}>
          {feedback.message}
        </div>
      )}

      <form onSubmit={handleRevoke}>
        <div className="form-group">
          <label htmlFor="revokeCertId">Certificate ID to Revoke:</label>
          <input 
            type="text" 
            id="revokeCertId"
            required 
            placeholder="e.g. CERT-2024-001"
            value={form.certId}
            onChange={(e) => setForm({ ...form, certId: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="revokeReason">Revocation Reason:</label>
          <textarea 
            id="revokeReason"
            rows="3" 
            required 
            placeholder="State official audit or disciplinary reason..."
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label htmlFor="revokeOfficer">Revoking Authority:</label>
          <input 
            type="text" 
            id="revokeOfficer"
            value={form.revokedBy}
            onChange={(e) => setForm({ ...form, revokedBy: e.target.value })}
          />
        </div>

        <button type="submit" className="btn-danger full-width" disabled={loading}>
          <AlertTriangle size={16} />
          {loading ? 'Executing on Fabric...' : 'Execute Immutable Revocation'}
        </button>
      </form>
    </div>
  );
}
