'use strict';

const API_BASE = 'http://localhost:4000/api';
let html5QrCode = null;
let isScanning = false;
let selectedPdfFile = null;

// ==========================================
// Initialization on DOM Load
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  checkNetwork();
  setInterval(checkNetwork, 10000);

  // Check URL query params for auto-verification (e.g. ?certId=CERT-2024-001 or ?hash=...)
  const urlParams = new URLSearchParams(window.location.search);
  const certIdParam = urlParams.get('certId') || urlParams.get('id');
  const hashParam = urlParams.get('hash');

  if (certIdParam) {
    document.getElementById('manualInput').value = certIdParam;
    await verifyById(certIdParam);
  } else if (hashParam) {
    document.getElementById('manualInput').value = hashParam;
    await verifyByHash(hashParam);
  }
});

// ==========================================
// Network Health
// ==========================================
async function checkNetwork() {
  const badge = document.getElementById('netStatusBadge');
  const text = document.getElementById('networkStatusText');
  const dot = badge ? badge.querySelector('.status-dot') : null;

  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('API Offline');
    const data = await res.json();
    
    if (data.status === 'UP') {
      text.textContent = 'Consortium Online (Org1, Org2, Org3)';
      if (dot) {
        dot.className = 'status-dot online';
      }
    } else {
      text.textContent = 'Consortium Partial';
      if (dot) {
        dot.className = 'status-dot';
        dot.style.background = '#f59e0b';
      }
    }
  } catch (err) {
    text.textContent = 'Ledger Disconnected';
    if (dot) {
      dot.className = 'status-dot offline';
    }
  }
}

// ==========================================
// Event Listeners & UI Binding
// ==========================================
function setupEventListeners() {
  // 1. Camera QR Scanner controls
  const startBtn = document.getElementById('startCameraBtn');
  const stopBtn = document.getElementById('stopCameraBtn');
  if (startBtn) startBtn.addEventListener('click', startCameraScanner);
  if (stopBtn) stopBtn.addEventListener('click', stopCameraScanner);

  // 2. QR Image File Dropzone
  const qrDropzone = document.getElementById('qrDropzone');
  const qrFileInput = document.getElementById('qrFileInput');
  if (qrDropzone && qrFileInput) {
    qrDropzone.addEventListener('click', () => qrFileInput.click());
    qrFileInput.addEventListener('change', handleQrFileSelect);

    qrDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      qrDropzone.classList.add('dragover');
    });
    qrDropzone.addEventListener('dragleave', () => qrDropzone.classList.remove('dragover'));
    qrDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      qrDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleQrFile(e.dataTransfer.files[0]);
      }
    });
  }

  // 3. PDF File Dropzone
  const pdfDropzone = document.getElementById('pdfDropzone');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const verifyPdfBtn = document.getElementById('verifyPdfBtn');

  if (pdfDropzone && pdfFileInput) {
    pdfDropzone.addEventListener('click', () => pdfFileInput.click());
    pdfFileInput.addEventListener('change', handlePdfFileSelect);

    pdfDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pdfDropzone.classList.add('dragover');
    });
    pdfDropzone.addEventListener('dragleave', () => pdfDropzone.classList.remove('dragover'));
    pdfDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      pdfDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        setPdfFile(e.dataTransfer.files[0]);
      }
    });
  }

  if (verifyPdfBtn) {
    verifyPdfBtn.addEventListener('click', verifySelectedPdf);
  }

  // 4. Manual Search Form
  const manualForm = document.getElementById('manualLookupForm');
  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = document.getElementById('manualInput').value.trim();
      if (!val) return;
      if (val.length === 64 && /^[0-9a-fA-F]+$/.test(val)) {
        await verifyByHash(val);
      } else {
        await verifyById(val);
      }
    });
  }

  // Sample Chips
  document.querySelectorAll('.sample-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const sample = btn.getAttribute('data-sample');
      document.getElementById('manualInput').value = sample;
      verifyById(sample);
    });
  });

  // Print Report Button
  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

// ==========================================
// Camera QR Scanner (Html5Qrcode)
// ==========================================
async function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    alert('QR scanning library is loading. Please check internet access or try uploading the QR image.');
    return;
  }

  const qrReaderDiv = document.getElementById('qrReader');
  const startBtn = document.getElementById('startCameraBtn');
  const stopBtn = document.getElementById('stopCameraBtn');

  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode('qrReader');
    }

    qrReaderDiv.style.display = 'block';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';
    isScanning = true;

    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 }
      },
      (decodedText, decodedResult) => {
        console.log('QR Code scanned:', decodedText);
        stopCameraScanner();
        handleDecodedQrText(decodedText);
      },
      (errorMessage) => {
        // frame parse error, ignore
      }
    );
  } catch (err) {
    console.error('Error starting camera:', err);
    alert(`Could not start camera: ${err.message || err}. You can also upload a QR image.`);
    stopCameraScanner();
  }
}

async function stopCameraScanner() {
  const qrReaderDiv = document.getElementById('qrReader');
  const startBtn = document.getElementById('startCameraBtn');
  const stopBtn = document.getElementById('stopCameraBtn');

  if (html5QrCode && isScanning) {
    try {
      await html5QrCode.stop();
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
    isScanning = false;
  }

  if (qrReaderDiv) qrReaderDiv.style.display = 'none';
  if (startBtn) startBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
}

// ==========================================
// QR Image File Decoder
// ==========================================
async function handleQrFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    await handleQrFile(e.target.files[0]);
  }
}

async function handleQrFile(file) {
  if (!file) return;
  if (typeof Html5Qrcode === 'undefined') {
    alert('QR library not loaded yet');
    return;
  }

  try {
    const scanner = new Html5Qrcode('qrReader');
    const decodedText = await scanner.scanFile(file, true);
    console.log('Decoded QR from file:', decodedText);
    handleDecodedQrText(decodedText);
  } catch (err) {
    console.error('QR decode failed:', err);
    alert('No clear QR code could be found in the uploaded image. Please try another image or enter the Certificate ID.');
  }
}

function handleDecodedQrText(text) {
  try {
    // Check if it's a verification URL
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const certId = url.searchParams.get('certId') || url.searchParams.get('id');
      const hash = url.searchParams.get('hash');
      if (certId) {
        document.getElementById('manualInput').value = certId;
        verifyById(certId);
        return;
      }
      if (hash) {
        document.getElementById('manualInput').value = hash;
        verifyByHash(hash);
        return;
      }
    }

    // If it's a plain string or JSON
    if (text.startsWith('{')) {
      const parsed = JSON.parse(text);
      if (parsed.certId) {
        document.getElementById('manualInput').value = parsed.certId;
        verifyById(parsed.certId);
        return;
      }
    }

    // Default assume certId or hash
    document.getElementById('manualInput').value = text;
    if (text.length === 64 && /^[0-9a-fA-F]+$/.test(text)) {
      verifyByHash(text);
    } else {
      verifyById(text);
    }
  } catch (e) {
    document.getElementById('manualInput').value = text;
    verifyById(text);
  }
}

// ==========================================
// PDF File Tamper Check & SHA-256
// ==========================================
function handlePdfFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    setPdfFile(e.target.files[0]);
  }
}

function setPdfFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('Please select a valid PDF file.');
    return;
  }
  selectedPdfFile = file;
  document.getElementById('pdfFileName').textContent = file.name;
  document.getElementById('pdfFileSelectedInfo').style.display = 'block';
}

async function verifySelectedPdf() {
  if (!selectedPdfFile) return;

  const btn = document.getElementById('verifyPdfBtn');
  btn.disabled = true;
  btn.textContent = 'Computing SHA-256 & Querying Blockchain...';

  try {
    // 1. Calculate SHA-256 in browser
    const arrayBuffer = await selectedPdfFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    console.log(`Computed SHA-256 for ${selectedPdfFile.name}:`, calculatedHash);

    // 2. Query ledger by calculated hash
    await verifyByHash(calculatedHash, selectedPdfFile.name);
  } catch (err) {
    console.error('PDF verification error:', err);
    alert(`Verification error: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify PDF Hash on Ledger';
  }
}

// ==========================================
// Blockchain Ledger Verification Queries
// ==========================================
async function verifyById(certId) {
  showLoadingState();
  try {
    const res = await fetch(`${API_BASE}/verify/id/${encodeURIComponent(certId)}`);
    const data = await res.json();
    renderVerificationResult(data, certId);
  } catch (err) {
    renderErrorResult(err.message, certId);
  }
}

async function verifyByHash(hash, originalFileName) {
  showLoadingState();
  try {
    const res = await fetch(`${API_BASE}/verify/hash/${encodeURIComponent(hash)}`);
    const data = await res.json();
    renderVerificationResult(data, null, hash, originalFileName);
  } catch (err) {
    renderErrorResult(err.message, null, hash);
  }
}

// ==========================================
// UI Rendering
// ==========================================
function showLoadingState() {
  const section = document.getElementById('verificationResultSection');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });

  const banner = document.getElementById('resultBanner');
  banner.className = 'result-banner status-loading';
  document.getElementById('bannerIcon').textContent = '⏳';
  document.getElementById('bannerTitle').textContent = 'QUERYING HYPERLEDGER FABRIC CONSORTIUM...';
  document.getElementById('bannerSubtitle').textContent = 'Consulting peers peer0.org1, peer0.org2, and peer0.org3 for state confirmation.';
  document.getElementById('bannerTimestamp').textContent = new Date().toLocaleTimeString();
}

function renderVerificationResult(data, queriedId, queriedHash, fileName) {
  const section = document.getElementById('verificationResultSection');
  section.style.display = 'block';
  section.scrollIntoView({ behavior: 'smooth' });

  const banner = document.getElementById('resultBanner');
  const bannerIcon = document.getElementById('bannerIcon');
  const bannerTitle = document.getElementById('bannerTitle');
  const bannerSubtitle = document.getElementById('bannerSubtitle');
  const bannerTimestamp = document.getElementById('bannerTimestamp');
  const revocationBox = document.getElementById('revocationBox');

  bannerTimestamp.textContent = `Verified: ${new Date().toLocaleString()}`;

  const cert = data.certificate || {};

  if (data.verificationStatus === 'VERIFIED') {
    // 1. VERIFIED
    banner.className = 'result-banner status-verified';
    bannerIcon.textContent = '✅';
    bannerTitle.textContent = 'OFFICIAL CREDENTIAL VERIFIED & AUTHENTIC';
    bannerSubtitle.textContent = fileName
      ? `PDF file '${fileName}' cryptographic digest matches the immutable blockchain record perfectly.`
      : 'This academic degree was confirmed authentic by 3-Organization Hyperledger Fabric consensus.';

    revocationBox.style.display = 'none';
    populateCertificateData(cert, 'ISSUED / ACTIVE', 'verified');
  } else if (data.verificationStatus === 'REVOKED') {
    // 2. REVOKED
    banner.className = 'result-banner status-revoked';
    bannerIcon.textContent = '⚠️';
    bannerTitle.textContent = 'CREDENTIAL REVOKED BY INSTITUTION';
    bannerSubtitle.textContent = 'This certificate was previously issued but has since been revoked on the blockchain.';

    revocationBox.style.display = 'block';
    if (cert.revocation) {
      document.getElementById('revocationReasonText').textContent = cert.revocation.reason || 'Revoked by Academic Committee';
      document.getElementById('resRevokedBy').textContent = cert.revocation.revokedBy || 'Dean / Registrar';
      document.getElementById('resRevokedAt').textContent = cert.revocation.revokedAt ? new Date(cert.revocation.revokedAt).toLocaleString() : 'N/A';
    }
    populateCertificateData(cert, 'REVOKED', 'revoked');
  } else {
    // 3. INVALID
    banner.className = 'result-banner status-invalid';
    bannerIcon.textContent = '❌';
    bannerTitle.textContent = 'CREDENTIAL INVALID OR NOT FOUND';
    bannerSubtitle.textContent = queriedHash
      ? `The SHA-256 fingerprint (${queriedHash.substring(0, 16)}...) was not found on the blockchain. The document may have been altered or forged.`
      : `Certificate ID '${queriedId || 'N/A'}' does not exist on the Hyperledger Fabric ledger.`;

    revocationBox.style.display = 'none';
    populateCertificateData({
      certId: queriedId || 'NOT_FOUND',
      studentName: 'Invalid / Unregistered',
      studentId: 'N/A',
      certType: 'Unverified Credential',
      department: 'N/A',
      issueDate: 'N/A',
      docHash: queriedHash || 'NO_MATCH',
      ipfsHash: 'N/A'
    }, 'INVALID', 'invalid');
  }
}

function populateCertificateData(cert, statusText, statusClass) {
  document.getElementById('certIdTag').textContent = cert.certId || 'N/A';
  document.getElementById('resStudentName').textContent = cert.studentName || 'Student Name';
  document.getElementById('resStudentId').textContent = cert.studentId || 'N/A';
  document.getElementById('resCertType').textContent = cert.certType || 'Degree Certificate';
  document.getElementById('resDepartment').textContent = cert.department ? `Department of ${cert.department}` : 'Department of Computer Science & Engineering';
  document.getElementById('resIssueDate').textContent = cert.issueDate || 'N/A';
  
  const statusBadge = document.getElementById('resStatusBadge');
  statusBadge.innerHTML = `<span class="badge-status-pill ${statusClass}">${statusText}</span>`;

  document.getElementById('resDocHash').textContent = cert.docHash || '—';
  document.getElementById('resIpfsCid').textContent = cert.ipfsHash || '—';

  // Update Action Links
  const viewPdfLink = document.getElementById('viewPdfLink');
  const viewIpfsLink = document.getElementById('viewIpfsLink');

  if (cert.certId && cert.certId !== 'NOT_FOUND') {
    viewPdfLink.href = `${API_BASE}/certificates/${encodeURIComponent(cert.certId)}/pdf`;
    viewPdfLink.style.display = 'inline-flex';
  } else {
    viewPdfLink.style.display = 'none';
  }

  if (cert.ipfsHash && cert.ipfsHash !== 'N/A') {
    viewIpfsLink.href = `http://localhost:8080/ipfs/${encodeURIComponent(cert.ipfsHash)}`;
    viewIpfsLink.style.display = 'inline-flex';
  } else {
    viewIpfsLink.style.display = 'none';
  }
}

function renderErrorResult(errMsg, queriedId, queriedHash) {
  const section = document.getElementById('verificationResultSection');
  section.style.display = 'block';

  const banner = document.getElementById('resultBanner');
  banner.className = 'result-banner status-invalid';
  document.getElementById('bannerIcon').textContent = '⚠️';
  document.getElementById('bannerTitle').textContent = 'VERIFICATION ERROR';
  document.getElementById('bannerSubtitle').textContent = `Could not reach the blockchain ledger: ${errMsg}`;
  document.getElementById('bannerTimestamp').textContent = new Date().toLocaleTimeString();
}
