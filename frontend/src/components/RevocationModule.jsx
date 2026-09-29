import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { parseBlockchainError } from '../utils/errorHandler';
import ConfirmModal from './ConfirmModal';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function RevocationModule() {
  const [certId, setCertId] = useState('');
  const [reason, setReason] = useState('');
  const [officer, setOfficer] = useState('Dean / Controller of Academic Integrity');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { showSuccess, showError, showWarning } = useToast();

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!certId.trim() || !reason.trim()) {
      showWarning('Please enter both the Certificate ID and the Official Revocation Reason.', 'Missing Fields');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmRevoke = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId: certId.trim(),
          reason: reason.trim(),
          revokedBy: officer
        })
      });
      const data = await res.json();
      if (res.ok) {
        const successText = `Certificate ${certId.trim()} has been PERMANENTLY REVOKED on Hyperledger Fabric ledger!`;
        setMessage({ type: 'success', text: successText });
        showSuccess(successText, 'Certificate Revoked');
        setCertId('');
        setReason('');
        setIsConfirmOpen(false);
      } else {
        const cleanErr = parseBlockchainError(data.error || 'Revocation failed');
        setMessage({ type: 'error', text: cleanErr });
        showError(data.error || 'Revocation failed', 'Revocation Rejected');
        setIsConfirmOpen(false);
      }
    } catch (err) {
      const cleanErr = parseBlockchainError(err);
      setMessage({ type: 'error', text: cleanErr });
      showError(err, 'Network Connection Error');
      setIsConfirmOpen(false);
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

      <form id="revokeForm" onSubmit={handleOpenConfirm}>
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
          {loading ? 'Processing...' : '⚠️ Execute Immutable Revocation on Blockchain'}
        </button>
      </form>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Confirm Ledger Revocation"
        message={
          <div>
            <p>Are you sure you want to permanently revoke certificate <strong>{certId}</strong>?</p>
            <p style={{ marginTop: '0.5rem', color: 'var(--danger)', fontSize: '0.85rem' }}>
              ⚠️ This writes a permanent revocation transaction to the immutable Hyperledger Fabric ledger and cannot be undone.
            </p>
          </div>
        }
        confirmText="Confirm Permanent Revocation"
        cancelText="Cancel"
        variant="danger"
        loading={loading}
        onConfirm={handleConfirmRevoke}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
