import React, { useState } from 'react';
import { Award, FileText, Globe, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function IssuanceModule({ currentRequest, setCurrentRequest }) {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [issuedData, setIssuedData] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const { showSuccess, showError, showWarning, showInfo } = useToast();

  React.useEffect(() => {
    if (currentRequest?.status === 'ADMIN_FINALIZED') {
      setCertId(`CERT-${currentRequest.requestId.replace('REQ-', '')}`);
    }
  }, [currentRequest]);

  const handleIssue = async () => {
    if (!certId.trim()) {
      showWarning('Please enter a valid Certificate ID to issue.', 'Missing Certificate ID');
      return;
    }
    if (!currentRequest) {
      showWarning('Please select or track an ADMIN_FINALIZED request first before issuing.', 'No Request Selected');
      return;
    }
    if (currentRequest.status !== 'ADMIN_FINALIZED') {
      showWarning(`Request is currently in stage '${currentRequest.status}'. It must reach 'ADMIN_FINALIZED' before Org 3 can anchor it.`, 'Prerequisite Not Met');
      return;
    }

    setLoading(true);
    setIssuedData(null);

    try {
      const res = await fetch(`${API_BASE}/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId: certId.trim(),
          requestId: currentRequest.requestId,
          studentId: currentRequest.studentId,
          certType: currentRequest.certType,
          studentName: currentRequest.details?.studentName || currentRequest.studentName || undefined,
          department: currentRequest.details?.department || currentRequest.department || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setIssuedData(data);
        showSuccess(`Certificate ${data.certId} successfully minted, pinned to IPFS, and anchored to Fabric ledger!`, 'Certificate Anchored');
        // Refresh request
        const reqRes = await fetch(`${API_BASE}/requests/${currentRequest.requestId}`);
        if (reqRes.ok) {
          const updated = await reqRes.json();
          setCurrentRequest(updated);
        }
      } else {
        showError(data.error || 'Issuance transaction rejected by blockchain.', 'Issuance Rejected');
      }
    } catch (err) {
      showError(err, 'Network Connection Error');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, field, label) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showInfo(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="card issuance-card">
      <div className="card-title">
        <h3>
          <Award size={18} className="text-primary" />
          3. PDF Generation → IPFS Upload → SHA-256 → Fabric Anchoring
        </h3>
        <span className="step-num">Module 3 & 4</span>
      </div>
      <p className="subtitle">
        Once a request reaches <code>ADMIN_FINALIZED</code>, Org3 generates the official PDF, pins it to decentralized IPFS, computes the SHA-256 digest, and anchors the certificate on the immutable ledger.
      </p>

      <div className="issuance-grid">
        <div className="issuance-form">
          <div className="form-group">
            <label htmlFor="issueCertId">Certificate ID to Issue:</label>
            <input 
              type="text" 
              id="issueCertId" 
              placeholder="e.g. CERT-2024-001"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
            />
          </div>
          <button 
            type="button" 
            className="btn-success full-width" 
            id="issueCertBtn"
            onClick={handleIssue}
            disabled={loading}
          >
            {loading ? 'Generating PDF & Pinning to IPFS...' : '🚀 Issue Certificate & Anchor to Blockchain'}
          </button>
        </div>

        <div className="issuance-output" id="issueResultPanel">
          {loading ? (
            <div className="result-placeholder">
              ⏳ Generating tamper-proof PDF, uploading to IPFS node, and committing transaction to Fabric peers...
            </div>
          ) : issuedData ? (
            <div style={{ width: '100%', borderLeft: '3px solid var(--success)', paddingLeft: '1rem' }}>
              <h4 style={{ color: 'var(--success)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={18} />
                Certificate Successfully Issued & Anchored!
              </h4>
              <p><strong>Certificate ID:</strong> <code>{issuedData.certId}</code></p>
              
              <p style={{ marginTop: '0.35rem' }}>
                <strong>IPFS Content ID:</strong>{' '}
                <code>{issuedData.ipfsCid}</code>
                <button 
                  type="button" 
                  className="btn-secondary btn-sm"
                  style={{ marginLeft: '0.5rem', padding: '1px 6px' }}
                  onClick={() => copyToClipboard(issuedData.ipfsCid, 'cid', 'IPFS CID')}
                >
                  <Copy size={12} /> {copiedField === 'cid' ? 'Copied!' : 'Copy'}
                </button>
              </p>

              <p style={{ marginTop: '0.35rem' }}>
                <strong>SHA-256 Digest:</strong>{' '}
                <code style={{ wordBreak: 'break-all', fontSize: '0.72rem' }}>{issuedData.sha256Hash}</code>
                <button 
                  type="button" 
                  className="btn-secondary btn-sm"
                  style={{ marginLeft: '0.5rem', padding: '1px 6px' }}
                  onClick={() => copyToClipboard(issuedData.sha256Hash, 'hash', 'SHA-256 Digest')}
                >
                  <Copy size={12} /> {copiedField === 'hash' ? 'Copied!' : 'Copy'}
                </button>
              </p>

              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a 
                  href={`${API_BASE}/certificates/${issuedData.certId}/pdf`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-primary btn-sm"
                >
                  <FileText size={14} /> View Generated PDF
                </a>
                <a 
                  href={`http://localhost:8080/ipfs/${issuedData.ipfsCid}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="btn-secondary btn-sm"
                >
                  <Globe size={14} /> View on IPFS Gateway
                </a>
              </div>
            </div>
          ) : (
            <div className="result-placeholder">
              Issued certificate details, cryptographic proofs, and IPFS links will appear here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
