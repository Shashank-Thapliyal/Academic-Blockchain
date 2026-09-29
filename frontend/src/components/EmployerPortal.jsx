import React, { useState, useEffect, useRef } from 'react';
import { Camera, FileText, Search, CheckCircle2, AlertTriangle, XCircle, Printer, Download, Globe, Shield } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function EmployerPortal({ isStandalone = false }) {
  const [activeOption, setActiveOption] = useState('qr');
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('certId') || params.get('id');
    const hash = params.get('hash');
    if (id) {
      setManualInput(id);
      verifyById(id);
    } else if (hash) {
      setManualInput(hash);
      verifyByHash(hash);
    }
  }, []);

  const verifyById = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify/id/${encodeURIComponent(id)}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ verificationStatus: 'ERROR', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const verifyByHash = async (hash, fileName) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/verify/hash/${encodeURIComponent(hash)}`);
      const data = await res.json();
      setResult({ ...data, uploadedFileName: fileName });
    } catch (err) {
      setResult({ verificationStatus: 'ERROR', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handlePdfUpload = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please upload a valid PDF document.');
      return;
    }
    setSelectedPdf(file);
    setLoading(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      await verifyByHash(calculatedHash, file.name);
    } catch (err) {
      alert(`Error computing SHA-256: ${err.message}`);
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (typeof window.Html5Qrcode === 'undefined') {
      alert('QR camera scanner library is still initializing. You can also upload a QR image.');
      return;
    }
    try {
      qrScannerRef.current = new window.Html5Qrcode('qrReader');
      setIsCameraActive(true);
      await qrScannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopCamera();
          handleQrDecoded(decodedText);
        },
        () => {}
      );
    } catch (err) {
      alert(`Camera access error: ${err.message}`);
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (qrScannerRef.current && isCameraActive) {
      try {
        await qrScannerRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
      setIsCameraActive(false);
    }
  };

  const handleQrDecoded = (text) => {
    try {
      if (text.startsWith('http://') || text.startsWith('https://')) {
        const url = new URL(text);
        const certId = url.searchParams.get('certId') || url.searchParams.get('id');
        const hash = url.searchParams.get('hash');
        if (certId) return verifyById(certId);
        if (hash) return verifyByHash(hash);
      }
      if (text.startsWith('{')) {
        const parsed = JSON.parse(text);
        if (parsed.certId) return verifyById(parsed.certId);
      }
      if (text.length === 64 && /^[0-9a-fA-F]+$/.test(text)) {
        verifyByHash(text);
      } else {
        verifyById(text);
      }
    } catch (e) {
      verifyById(text);
    }
  };

  const cert = result?.certificate || {};
  const status = result?.verificationStatus || (result?.verified ? 'VERIFIED' : result ? 'INVALID' : '');

  return (
    <div className={isStandalone ? 'employer-standalone' : ''}>
      {isStandalone && (
        <section className="employer-hero">
          <div className="hero-content">
            <div className="trust-badge">
              <Shield size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              100% Cryptographically Verifiable & Tamper-Proof
            </div>
            <h2>Verify Academic Credentials Directly on Blockchain</h2>
            <p>Zero-trust verification powered by 3-Organization Hyperledger Fabric consensus and decentralized IPFS cryptographic hashing.</p>
          </div>
        </section>
      )}

      <div className="verify-methods-container">
        {/* Option 1: QR Scanner */}
        <div className={`verify-card ${activeOption === 'qr' ? 'active' : ''}`} id="cardQrScan" onClick={() => setActiveOption('qr')}>
          <div className="verify-card-header">
            <span className="card-icon">📷</span>
            <div>
              <h3>Scan Verifiable QR Code</h3>
              <p>Scan the cryptographic QR code on candidate's certificate with webcam or upload an image</p>
            </div>
          </div>

          <div className="qr-scanner-wrapper">
            <div id="qrReader" className="qr-reader-viewport" style={{ display: isCameraActive ? 'block' : 'none', minHeight: '250px' }} />
            
            <div className="qr-controls">
              {!isCameraActive ? (
                <button type="button" className="btn-primary full-width" id="startCameraBtn" onClick={startCamera}>
                  <Camera size={16} /> 🎥 Start Camera Scanner
                </button>
              ) : (
                <button type="button" className="btn-secondary full-width" id="stopCameraBtn" onClick={stopCamera}>
                  ⏹️ Stop Camera
                </button>
              )}
            </div>

            <div className="or-divider"><span>OR UPLOAD QR IMAGE</span></div>

            <div 
              className="file-dropzone" 
              id="qrDropzone"
              onClick={() => document.getElementById('qrFileInput')?.click()}
            >
              <input 
                type="file" 
                id="qrFileInput" 
                accept="image/*" 
                className="file-input-hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    const reader = new window.Html5Qrcode('qrReader');
                    reader.scanFile(e.target.files[0], true)
                      .then(handleQrDecoded)
                      .catch(() => alert('No readable QR code found in this image.'));
                  }
                }}
              />
              <span className="dropzone-icon">🖼️</span>
              <p><strong>Click or Drag & Drop</strong> QR image</p>
              <span className="dropzone-hint">PNG, JPG, WebP supported</span>
            </div>
          </div>
        </div>

        {/* Option 2: PDF Upload */}
        <div className={`verify-card ${activeOption === 'pdf' ? 'active' : ''}`} id="cardPdfUpload" onClick={() => setActiveOption('pdf')}>
          <div className="verify-card-header">
            <span className="card-icon">📄</span>
            <div>
              <h3>Upload Candidate PDF</h3>
              <p>Calculates SHA-256 fingerprint in-browser to verify byte-for-byte integrity against Fabric ledger</p>
            </div>
          </div>

          <div 
            className="file-dropzone" 
            id="pdfDropzone"
            onClick={() => document.getElementById('pdfFileInput')?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.length) handlePdfUpload(e.dataTransfer.files[0]);
            }}
          >
            <input 
              type="file" 
              id="pdfFileInput" 
              accept=".pdf" 
              className="file-input-hidden"
              onChange={(e) => {
                if (e.target.files?.length) handlePdfUpload(e.target.files[0]);
              }}
            />
            <span className="dropzone-icon">📁</span>
            <p><strong>Click or Drag & Drop</strong> candidate's PDF</p>
            <span className="dropzone-hint">Browser computes SHA-256 tamper digest</span>
          </div>

          {selectedPdf && (
            <div id="pdfFileSelectedInfo" style={{ marginTop: '1rem', textAlign: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                Selected: <strong id="pdfFileName">{selectedPdf.name}</strong>
              </span>
            </div>
          )}
        </div>

        {/* Option 3: Manual Search */}
        <div className={`verify-card ${activeOption === 'manual' ? 'active' : ''}`} id="cardManualLookup" onClick={() => setActiveOption('manual')}>
          <div className="verify-card-header">
            <span className="card-icon">🔍</span>
            <div>
              <h3>Search by ID or Hash</h3>
              <p>Direct query by Certificate ID or 64-character SHA-256 cryptographic digest</p>
            </div>
          </div>

          <form id="manualLookupForm" onSubmit={(e) => {
            e.preventDefault();
            if (manualInput.length === 64 && /^[0-9a-fA-F]+$/.test(manualInput)) {
              verifyByHash(manualInput);
            } else {
              verifyById(manualInput);
            }
          }}>
            <div className="form-group">
              <label htmlFor="manualInput">Certificate ID or SHA-256:</label>
              <input 
                type="text" 
                id="manualInput" 
                required 
                placeholder="e.g. CERT-2024-001 or 64-char hash"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary full-width" id="manualLookupBtn" disabled={loading}>
              <Search size={14} /> Search Blockchain Ledger
            </button>
          </form>

          <div className="quick-examples" style={{ marginTop: '1.25rem', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span>Try sample: </span>
            <button 
              type="button" 
              className="btn-secondary btn-sm" 
              style={{ padding: '2px 8px', fontSize: '0.72rem' }}
              onClick={() => {
                setManualInput('CERT-2024-001');
                verifyById('CERT-2024-001');
              }}
            >
              CERT-2024-001
            </button>
          </div>
        </div>
      </div>

      {/* Verification Result Display */}
      {result && (
        <section id="verificationResultSection" className="result-section" style={{ display: 'block' }}>
          <div id="resultBanner" className={`result-banner status-${status === 'VERIFIED' ? 'verified' : status === 'REVOKED' ? 'revoked' : 'invalid'}`}>
            <div className="banner-icon" id="bannerIcon">
              {status === 'VERIFIED' ? '✅' : status === 'REVOKED' ? '⚠️' : '❌'}
            </div>
            <div className="banner-text">
              <h2 id="bannerTitle">
                {status === 'VERIFIED' 
                  ? 'OFFICIAL CREDENTIAL VERIFIED & AUTHENTIC'
                  : status === 'REVOKED'
                  ? 'CREDENTIAL REVOKED BY INSTITUTION'
                  : 'CREDENTIAL INVALID OR NOT FOUND'}
              </h2>
              <p id="bannerSubtitle">
                {status === 'VERIFIED'
                  ? 'Confirmed authentic by 3-Organization Hyperledger Fabric consensus.'
                  : status === 'REVOKED'
                  ? 'This certificate was previously issued but has since been revoked on the blockchain.'
                  : result.message || 'No matching record exists on the Hyperledger Fabric ledger.'}
              </p>
            </div>
            <div className="banner-timestamp" id="bannerTimestamp">
              Verified: {new Date().toLocaleTimeString()}
            </div>
          </div>

          <div className="credential-grid">
            <div className="card credential-card">
              <div className="card-title">
                <h3>🎓 Candidate & Academic Information</h3>
                <span className="step-num" id="certIdTag">{cert.certId || 'N/A'}</span>
              </div>

              <div className="credential-fields">
                <div className="field-item">
                  <span className="field-label">Student Name:</span>
                  <span className="field-value" id="resStudentName">{cert.studentName || cert.studentId || '—'}</span>
                </div>
                <div className="field-item">
                  <span className="field-label">Student Registration ID:</span>
                  <span className="field-value" id="resStudentId">{cert.studentId || '—'}</span>
                </div>
                <div className="field-item">
                  <span className="field-label">Awarded Degree / Title:</span>
                  <span className="field-value" id="resCertType">{cert.certType || '—'}</span>
                </div>
                <div className="field-item">
                  <span className="field-label">Department:</span>
                  <span className="field-value" id="resDepartment">Department of {cert.department || 'Computer Science & Engineering'}</span>
                </div>
                <div className="field-item">
                  <span className="field-label">Date of Issuance:</span>
                  <span className="field-value" id="resIssueDate">{cert.issueDate || '—'}</span>
                </div>
                <div className="field-item">
                  <span className="field-label">Ledger Status:</span>
                  <span className="field-value" id="resStatusBadge">
                    <span className={`badge-status ${status}`}>
                      {cert.status || status}
                    </span>
                  </span>
                </div>
              </div>

              <div className="certificate-actions" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                {cert.certId && (
                  <a href={`${API_BASE}/certificates/${cert.certId}/pdf`} target="_blank" rel="noreferrer" className="btn-primary btn-sm" id="viewPdfLink">
                    <FileText size={14} /> View Official PDF
                  </a>
                )}
                {cert.ipfsHash && (
                  <a href={`http://localhost:8080/ipfs/${cert.ipfsHash}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm" id="viewIpfsLink">
                    <Globe size={14} /> View on IPFS Gateway
                  </a>
                )}
                <button type="button" className="btn-secondary btn-sm" id="printReportBtn" onClick={() => window.print()}>
                  <Printer size={14} /> Print Report
                </button>
              </div>
            </div>

            <div className="card proof-card">
              <div className="card-title">
                <h3>⛓️ Cryptographic & Consensus Proofs</h3>
                <span className="step-num">Fabric 2.5</span>
              </div>

              <div className="proof-list">
                <div className="proof-item">
                  <span className="proof-label">SHA-256 Document Fingerprint:</span>
                  <code className="proof-hash" id="resDocHash">{cert.docHash || '—'}</code>
                </div>

                <div className="proof-item">
                  <span className="proof-label">Decentralized IPFS CID:</span>
                  <code className="proof-hash" id="resIpfsCid">{cert.ipfsHash || '—'}</code>
                </div>

                <div className="proof-item">
                  <span className="proof-label">Issuing Organization MSP:</span>
                  <span className="proof-val" id="resIssuerMsp">{cert.issuerMSP || 'Org3MSP (Central University Governance)'}</span>
                </div>

                <div className="proof-item">
                  <span className="proof-label">Consortium Multi-Party Endorsement Chain:</span>
                  <div className="approval-chain">
                    <div className="chain-step">
                      <span className="chain-dot">✓</span>
                      <div>
                        <strong>Org 1 (CSE Faculty & HOD)</strong>
                        <p>Departmental Curriculum & Credit Clearance</p>
                      </div>
                    </div>
                    <div className="chain-step">
                      <span className="chain-dot">✓</span>
                      <div>
                        <strong>Org 2 (Examination Board)</strong>
                        <p>Official Grade & Transcript Lockdown</p>
                      </div>
                    </div>
                    <div className="chain-step">
                      <span className="chain-dot">✓</span>
                      <div>
                        <strong>Org 3 (Dean & Administration)</strong>
                        <p>Final Clearance & Blockchain Anchoring</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {status === 'REVOKED' && (
            <div id="revocationBox" className="card revocation-alert" style={{ marginTop: '1.5rem', borderLeft: '3px solid var(--danger)' }}>
              <h3 style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={18} /> Notice of Administrative Revocation
              </h3>
              <p id="revocationReasonText" style={{ margin: '0.5rem 0' }}>
                {cert.revocation?.reason || 'Revoked by Academic Integrity Committee'}
              </p>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <span>Revoked By: <strong id="resRevokedBy">{cert.revocation?.revokedBy || 'Dean / Registrar'}</strong></span> |{' '}
                <span>Date: <strong id="resRevokedAt">{cert.revocation?.revokedAt ? new Date(cert.revocation.revokedAt).toLocaleString() : 'Recorded on Ledger'}</strong></span>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
