
// ==========================================
// In-App Toast & Error Sanitizer
// ==========================================
function parseBlockchainError(rawError) {
  if (!rawError) return 'An unexpected blockchain error occurred.';
  let str = typeof rawError === 'string' ? rawError : (rawError.error || rawError.message || JSON.stringify(rawError));
  
  const chaincodeMatch = str.match(/chaincode response \d+,\s*([^\n\r"'`]+)/i);
  if (chaincodeMatch && chaincodeMatch[1]) return cleanSentence(chaincodeMatch[1]);
  
  const statusMsgMatch = str.match(/(?:status:\s*\d+,\s*message:\s*["'])([^"'\n\r]+)/i);
  if (statusMsgMatch && statusMsgMatch[1]) return cleanSentence(statusMsgMatch[1]);

  if (str.includes('already been revoked') || str.includes('already revoked')) {
    return 'This certificate has already been revoked on the blockchain.';
  }
  if (str.includes('already exists') || str.includes('already registered')) {
    const idMatch = str.match(/([A-Z0-9_-]+)\s+already (?:exists|registered)/i);
    return idMatch ? `Record ${idMatch[1]} already exists on the ledger.` : 'This record already exists on the blockchain.';
  }
  if (str.includes('does not exist') || str.includes('not found')) {
    return 'The requested record was not found on the Hyperledger Fabric ledger.';
  }
  if (str.includes('ECONNREFUSED') || str.includes('Network error')) {
    return 'Consortium Network Error: Could not connect to the Fabric peer network.';
  }
  if (str.includes('docker exec') || str.includes('Command failed')) {
    const lastErrorMatch = str.match(/(?:Error|error):\s*([^\n\r]+)$/);
    if (lastErrorMatch && lastErrorMatch[1] && !lastErrorMatch[1].includes('docker')) {
      return cleanSentence(lastErrorMatch[1]);
    }
    return 'Blockchain peer query rejected by the consortium network.';
  }
  return cleanSentence(str.split('\n')[0].replace(/^Error:\s*/i, ''));
}

function cleanSentence(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('Error:')) cleaned = cleaned.replace(/^Error:\s*/i, '');
  if (cleaned.startsWith('error:')) cleaned = cleaned.replace(/^error:\s*/i, '');
  if (cleaned.length > 0) cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (!cleaned.endsWith('.') && !cleaned.endsWith('!') && !cleaned.endsWith('?')) cleaned += '.';
  return cleaned;
}

function showToast(message, type = 'info', title = '', technicalDetails = null) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-portal-container';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }

  const defaultTitles = {
    success: 'Verification Succeeded',
    error: 'Verification Error',
    warning: 'Notice',
    info: 'Information'
  };

  const toastTitle = title || defaultTitles[type] || 'Notice';
  const toastId = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  const toastEl = document.createElement('div');
  toastEl.id = toastId;
  toastEl.className = `toast-notification toast-${type}`;
  toastEl.setAttribute('role', 'alert');

  let techHtml = '';
  if (technicalDetails && (technicalDetails.includes('docker') || technicalDetails.includes('Command failed') || technicalDetails.includes('chaincode'))) {
    techHtml = `
      <div class="toast-tech-section">
        <button type="button" class="toast-tech-toggle" onclick="const p=document.getElementById('${toastId}_details'); p.style.display = p.style.display === 'none' ? 'block' : 'none';">
          Details
        </button>
        <pre id="${toastId}_details" class="toast-tech-details" style="display: none;">${escapeHtml(technicalDetails)}</pre>
      </div>
    `;
  }

  toastEl.innerHTML = `
    <div class="toast-content-wrapper">
      <div class="toast-icon-col">
        <span class="toast-icon ${type}" style="font-weight: bold; font-size: 16px;">${icons[type] || 'ℹ'}</span>
      </div>
      <div class="toast-body-col">
        <div class="toast-header-row">
          <h4 class="toast-title">${escapeHtml(toastTitle)}</h4>
          <button type="button" class="toast-close-btn" onclick="document.getElementById('${toastId}')?.remove()">✕</button>
        </div>
        <p class="toast-message">${escapeHtml(message)}</p>
        ${techHtml}
      </div>
    </div>
  `;

  container.appendChild(toastEl);

  const duration = type === 'error' ? 7000 : 5000;
  setTimeout(() => {
    if (toastEl.parentNode) toastEl.remove();
  }, duration);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

'use strict';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';
let html5QrCode = null;
let isScanning = false;
let selectedPdfFile = null;

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupEventListeners();
  checkNetwork();
  setInterval(checkNetwork, 10000);

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

function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const toggleIcon = document.getElementById('themeToggleIcon');

  const savedTheme = localStorage.getItem('academic_theme') || 
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  applyTheme(savedTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('academic_theme', next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (toggleIcon) {
      toggleIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }
  }
}

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
      if (dot) dot.className = 'status-dot online';
    } else {
      text.textContent = 'Consortium Partial';
      if (dot) {
        dot.className = 'status-dot';
        dot.style.background = '#f59e0b';
      }
    }
  } catch (err) {
    text.textContent = 'Ledger Disconnected';
    if (dot) dot.className = 'status-dot offline';
  }
}

function setupEventListeners() {
  const startBtn = document.getElementById('startCameraBtn');
  const stopBtn = document.getElementById('stopCameraBtn');
  if (startBtn) startBtn.addEventListener('click', startCameraScanner);
  if (stopBtn) stopBtn.addEventListener('click', stopCameraScanner);

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
      if (e.dataTransfer.files.length > 0) handleQrFile(e.dataTransfer.files[0]);
    });
  }

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
      if (e.dataTransfer.files.length > 0) setPdfFile(e.dataTransfer.files[0]);
    });
  }

  if (verifyPdfBtn) {
    verifyPdfBtn.addEventListener('click', verifySelectedPdf);
  }

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

  document.querySelectorAll('.sample-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const sample = btn.getAttribute('data-sample');
      document.getElementById('manualInput').value = sample;
      verifyById(sample);
    });
  });

  const printBtn = document.getElementById('printReportBtn');
  if (printBtn) {
    printBtn.addEventListener('click', () => window.print());
  }
}

async function startCameraScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('QR scanning library is initializing. Please check internet access or try uploading the QR image.', 'warning', 'Scanner Initializing');
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
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        stopCameraScanner();
        handleDecodedQrText(decodedText);
      },
      () => {}
    );
  } catch (err) {
    showToast(`Could not start camera: ${err.message || err}. You can also upload a QR image.`, 'error', 'Camera Error');
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
      console.warn(e);
    }
    isScanning = false;
  }

  if (qrReaderDiv) qrReaderDiv.style.display = 'none';
  if (startBtn) startBtn.style.display = 'inline-block';
  if (stopBtn) stopBtn.style.display = 'none';
}

async function handleQrFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    await handleQrFile(e.target.files[0]);
  }
}

async function handleQrFile(file) {
  if (!file) return;
  if (typeof Html5Qrcode === 'undefined') {
    showToast('QR library is still loading. Please retry in a few seconds.', 'warning', 'Library Loading');
    return;
  }

  try {
    const scanner = new Html5Qrcode('qrReader');
    const decodedText = await scanner.scanFile(file, true);
    handleDecodedQrText(decodedText);
  } catch (err) {
    showToast('No clear QR code could be found in the uploaded image. Please ensure the QR is clear and well-lit.', 'warning', 'QR Not Detected');
  }
}

function handleDecodedQrText(text) {
  try {
    if (text.startsWith('http://') || text.startsWith('https://')) {
      const url = new URL(text);
      const certId = url.searchParams.get('certId') || url.searchParams.get('id');
      const hash = url.searchParams.get('hash');
      if (certId) {
        document.getElementById('manualInput').value = certId;
        return verifyById(certId);
      }
      if (hash) {
        document.getElementById('manualInput').value = hash;
        return verifyByHash(hash);
      }
    }

    if (text.startsWith('{')) {
      const parsed = JSON.parse(text);
      if (parsed.certId) {
        document.getElementById('manualInput').value = parsed.certId;
        return verifyById(parsed.certId);
      }
    }

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

function handlePdfFileSelect(e) {
  if (e.target.files && e.target.files.length > 0) {
    setPdfFile(e.target.files[0]);
  }
}

function setPdfFile(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Please select a valid PDF certificate file.', 'warning', 'Invalid File Type');
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
    const arrayBuffer = await selectedPdfFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await verifyByHash(calculatedHash, selectedPdfFile.name);
  } catch (err) {
    showToast(parseBlockchainError(err), 'error', 'Verification Failed', err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify PDF Hash on Ledger';
  }
}

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
    banner.className = 'result-banner status-verified';
    bannerIcon.textContent = '✅';
    bannerTitle.textContent = 'OFFICIAL CREDENTIAL VERIFIED & AUTHENTIC';
    bannerSubtitle.textContent = fileName
      ? `PDF file '${fileName}' cryptographic digest matches the immutable blockchain record perfectly.`
      : 'This academic degree was confirmed authentic by 3-Organization Hyperledger Fabric consensus.';

    revocationBox.style.display = 'none';
    populateCertificateData(cert, 'ISSUED / ACTIVE', 'verified');
  } else if (data.verificationStatus === 'REVOKED') {
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
