// Academic Blockchain Frontend Application
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

const STAGES = [
  'SUBMITTED',
  'FACULTY_APPROVED',
  'HOD_APPROVED',
  'DAC_APPROVED',
  'EXAM_LOCKED',
  'DEAN_APPROVED',
  'ADMIN_FINALIZED'
];

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initTabs();
  initNetworkHealth();
  initStudentRegistration();
  initWorkflow();
  initVerification();
  initRevocation();
  initLedgerExplorer();
  initLedgerHistory();
  initLiveEventStream();

  setInterval(initNetworkHealth, 10000);
});

// ==========================================
// Theme Engine (Light / Dark)
// ==========================================
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

// ==========================================
// Tabs Navigation
// ==========================================
function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      contents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const target = document.getElementById(btn.dataset.tab);
      if (target) target.classList.add('active');

      if (btn.dataset.tab === 'register-tab') loadStudents();
      if (btn.dataset.tab === 'ledger-tab') loadCertificates();
    });
  });
}

// ==========================================
// Network Health
// ==========================================
async function initNetworkHealth() {
  const badge = document.getElementById('netStatusBadge');
  const text = document.getElementById('networkStatusText');
  const dot = badge ? badge.querySelector('.status-dot') : null;

  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();

    if (data.status === 'UP' || data.network?.allHealthy) {
      if (dot) dot.className = 'status-dot online';
      if (text) text.textContent = '3-Org Network Online (Fabric 2.5 + IPFS)';
    } else {
      if (dot) dot.className = 'status-dot';
      if (text) text.textContent = 'Fabric Initializing / Partial';
    }
  } catch (e) {
    if (dot) dot.className = 'status-dot offline';
    if (text) text.textContent = 'Network Disconnected';
  }
}

// ==========================================
// Student Registration
// ==========================================
function initStudentRegistration() {
  const form = document.getElementById('studentForm');
  const refreshBtn = document.getElementById('refreshStudentsBtn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        studentId: document.getElementById('stuId').value.trim(),
        name: document.getElementById('stuName').value.trim(),
        email: document.getElementById('stuEmail').value.trim(),
        department: document.getElementById('stuDept').value.trim(),
        enrollmentYear: document.getElementById('stuYear').value.trim()
      };

      try {
        const res = await fetch(`${API_BASE}/students`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          alert(`✅ Student ${payload.studentId} successfully registered on Ledger (Org 1)!`);
          loadStudents();
        } else {
          alert(`❌ Registration failed: ${data.error}`);
        }
      } catch (err) {
        alert(`❌ Network error: ${err.message}`);
      }
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadStudents);
  }
}

async function loadStudents() {
  const tbody = document.getElementById('studentsTbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-hint">Fetching students...</td></tr>';
    const res = await fetch(`${API_BASE}/students`);
    const students = await res.json();

    if (!Array.isArray(students) || students.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-hint">No students registered yet.</td></tr>';
      return;
    }

    tbody.innerHTML = students.map(s => `
      <tr>
        <td><code>${s.studentId}</code></td>
        <td><strong>${s.name}</strong></td>
        <td>${s.email}</td>
        <td>${s.department}</td>
        <td>${s.enrollmentYear}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-hint">Error: ${err.message}</td></tr>`;
  }
}

// ==========================================
// Workflow & 7-Stage State Machine
// ==========================================
let currentTrackedRequest = null;

function initWorkflow() {
  const reqForm = document.getElementById('reqForm');
  const genReqBtn = document.getElementById('genReqIdBtn');
  const trackBtn = document.getElementById('trackReqBtn');
  const autoBtn = document.getElementById('autoAdvanceBtn');
  const issueBtn = document.getElementById('issueCertBtn');

  if (genReqBtn) {
    genReqBtn.addEventListener('click', () => {
      const rand = Math.floor(1000 + Math.random() * 9000);
      document.getElementById('reqIdInput').value = `REQ-2024-${rand}`;
    });
  }

  if (reqForm) {
    reqForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const requestId = document.getElementById('reqIdInput').value.trim();
      const studentId = document.getElementById('reqStudentId').value.trim();
      const certType = document.getElementById('reqCertType').value;

      try {
        const res = await fetch(`${API_BASE}/requests`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestId, studentId, certType })
        });
        const data = await res.json();
        if (res.ok) {
          alert(`✅ Request ${requestId} submitted! Status: SUBMITTED`);
          document.getElementById('activeReqInput').value = requestId;
          trackRequest(requestId);
        } else {
          alert(`❌ Submission failed: ${data.error}`);
        }
      } catch (err) {
        alert(`❌ Network error: ${err.message}`);
      }
    });
  }

  if (trackBtn) {
    trackBtn.addEventListener('click', () => {
      const reqId = document.getElementById('activeReqInput').value.trim();
      if (reqId) trackRequest(reqId);
    });
  }

  if (autoBtn) {
    autoBtn.addEventListener('click', autoAdvanceStages);
  }

  if (issueBtn) {
    issueBtn.addEventListener('click', executeCertificateIssuance);
  }
}

async function trackRequest(requestId) {
  try {
    const res = await fetch(`${API_BASE}/requests/${requestId}`);
    if (!res.ok) {
      alert(`Request ${requestId} not found.`);
      return;
    }
    const request = await res.json();
    currentTrackedRequest = request;
    renderStepper(request.status);
    renderActionControls(request);
    renderHistory(request.history || []);

    if (request.status === 'ADMIN_FINALIZED') {
      document.getElementById('issueCertId').value = `CERT-${request.requestId.replace('REQ-', '')}`;
    }
  } catch (err) {
    alert(`Error tracking request: ${err.message}`);
  }
}

function renderStepper(currentStatus) {
  const currentIndex = STAGES.indexOf(currentStatus);

  STAGES.forEach((stage, idx) => {
    const el = document.getElementById(`step-${stage}`);
    if (!el) return;

    el.classList.remove('active', 'completed');
    if (idx < currentIndex) {
      el.classList.add('completed');
    } else if (idx === currentIndex) {
      el.classList.add('active');
    }
  });

  const lines = document.querySelectorAll('.step-line');
  lines.forEach((line, idx) => {
    if (idx < currentIndex) {
      line.classList.add('completed');
    } else {
      line.classList.remove('completed');
    }
  });
}

function renderActionControls(request) {
  const container = document.getElementById('actionControls');
  if (!container) return;

  const status = request.status;
  const reqId = request.requestId;

  let html = '';
  switch (status) {
    case 'SUBMITTED':
      html = `<button class="btn-primary" onclick="advanceStage('faculty-approve', '${reqId}', 'Faculty approval granted')">✍️ Org 1: Approve as Faculty</button>`;
      break;
    case 'FACULTY_APPROVED':
      html = `<button class="btn-primary" onclick="advanceStage('hod-approve', '${reqId}', 'HOD recommendation approved')">✍️ Org 1: Approve as HOD</button>`;
      break;
    case 'HOD_APPROVED':
      html = `<button class="btn-primary" onclick="advanceStage('dac-approve', '${reqId}', 'Department Academic Committee approval complete')">✍️ Org 1: Approve as DAC</button>`;
      break;
    case 'DAC_APPROVED':
      html = `<button class="btn-primary" style="background:#f59e0b;" onclick="advanceStage('exam-lock', '${reqId}', 'Grades locked by Controller of Examinations')">🔒 Org 2: Lock Exam Grades</button>`;
      break;
    case 'EXAM_LOCKED':
      html = `<button class="btn-primary" style="background:#10b981;" onclick="advanceStage('dean-approve', '${reqId}', 'Dean Academic clearance granted')">✍️ Org 3: Sanction as Dean</button>`;
      break;
    case 'DEAN_APPROVED':
      html = `<button class="btn-primary" style="background:#10b981;" onclick="advanceStage('admin-finalize', '${reqId}', 'Administrative clearance finalized')">🏛️ Org 3: Finalize by Administration</button>`;
      break;
    case 'ADMIN_FINALIZED':
      html = `<p style="color:#34d399; font-weight:600;">✅ Request is ADMIN_FINALIZED! Ready for PDF & IPFS Issuance below.</p>`;
      break;
    case 'CERTIFICATE_ISSUED':
      html = `<p style="color:#38bdf8; font-weight:600;">🎓 Certificate Issued on Ledger! Cert ID: <code>${request.certificateId || 'N/A'}</code></p>`;
      break;
    default:
      html = `<p class="placeholder-text">Status: ${status}</p>`;
  }

  container.innerHTML = html;
}

window.advanceStage = async function(endpoint, requestId, comments) {
  try {
    const res = await fetch(`${API_BASE}/workflow/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, comments })
    });
    const data = await res.json();
    if (res.ok) {
      trackRequest(requestId);
    } else {
      alert(`Approval failed: ${data.error}`);
    }
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
};

async function autoAdvanceStages() {
  if (!currentTrackedRequest) {
    alert('Please track a request first or submit a new one.');
    return;
  }

  const reqId = currentTrackedRequest.requestId;
  const flow = [
    { endpoint: 'faculty-approve', from: 'SUBMITTED' },
    { endpoint: 'hod-approve', from: 'FACULTY_APPROVED' },
    { endpoint: 'dac-approve', from: 'HOD_APPROVED' },
    { endpoint: 'exam-lock', from: 'DAC_APPROVED' },
    { endpoint: 'dean-approve', from: 'EXAM_LOCKED' },
    { endpoint: 'admin-finalize', from: 'DEAN_APPROVED' }
  ];

  for (const step of flow) {
    await trackRequest(reqId);
    if (currentTrackedRequest.status === step.from) {
      await fetch(`${API_BASE}/workflow/${step.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqId })
      });
    }
  }

  await trackRequest(reqId);
  alert(`🎉 Auto-advanced request ${reqId} to ${currentTrackedRequest.status}!`);
}

function renderHistory(history) {
  const list = document.getElementById('historyList');
  if (!list) return;

  if (history.length === 0) {
    list.innerHTML = '<li class="empty-hint">No history records</li>';
    return;
  }

  list.innerHTML = history.map(h => `
    <li>
      <span><strong>${h.stage}</strong> by <code>${h.updatedBy || 'N/A'}</code></span>
      <span style="color:var(--text-muted);">${h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''} - ${h.comments || ''}</span>
    </li>
  `).join('');
}

// ==========================================
// Certificate Issuance (Module 3 & 4)
// ==========================================
async function executeCertificateIssuance() {
  const certId = document.getElementById('issueCertId').value.trim();
  const panel = document.getElementById('issueResultPanel');

  if (!certId) {
    alert('Please enter a Certificate ID.');
    return;
  }

  if (!currentTrackedRequest) {
    alert('Please select or track an ADMIN_FINALIZED request first.');
    return;
  }

  try {
    panel.innerHTML = '<div class="result-placeholder">⏳ Generating Certificate PDF, uploading to IPFS, and committing to Hyperledger Fabric...</div>';

    const res = await fetch(`${API_BASE}/certificates/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        certId,
        requestId: currentTrackedRequest.requestId,
        studentId: currentTrackedRequest.studentId,
        certType: currentTrackedRequest.certType
      })
    });

    const data = await res.json();
    if (res.ok) {
      panel.innerHTML = `
        <div style="border-left: 3px solid #10b981; padding-left: 1rem;">
          <h4 style="color:#10b981; margin-bottom: 0.5rem;">🎉 Certificate Successfully Issued & Anchored!</h4>
          <p><strong>Certificate ID:</strong> <code>${data.certId}</code></p>
          <p><strong>IPFS Content ID (CID):</strong> <code>${data.ipfsCid}</code></p>
          <p><strong>SHA-256 Digest:</strong> <code style="word-break:break-all;">${data.sha256Hash}</code></p>
          <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <a href="${API_BASE}/certificates/${data.certId}/pdf" target="_blank" class="btn-primary" style="text-decoration:none; display:inline-block;">📄 View Generated PDF</a>
            <a href="http://localhost:8080/ipfs/${data.ipfsCid}" target="_blank" class="btn-secondary" style="text-decoration:none; display:inline-block;">🌐 View on IPFS Gateway</a>
          </div>
        </div>
      `;
      trackRequest(currentTrackedRequest.requestId);
    } else {
      panel.innerHTML = `<div style="color:#ef4444;">❌ Issuance failed: ${data.error}</div>`;
    }
  } catch (err) {
    panel.innerHTML = `<div style="color:#ef4444;">❌ Error: ${err.message}</div>`;
  }
}

// ==========================================
// Verification Portal
// ==========================================
function initVerification() {
  const idBtn = document.getElementById('verifyByIdBtn');
  const hashBtn = document.getElementById('verifyByHashBtn');
  const fileBtn = document.getElementById('verifyByFileBtn');

  if (idBtn) {
    idBtn.addEventListener('click', async () => {
      const certId = document.getElementById('verifyCertIdInput').value.trim();
      if (!certId) return alert('Enter Certificate ID');
      verifyEndpoint(`/verify/id/${certId}`);
    });
  }

  if (hashBtn) {
    hashBtn.addEventListener('click', async () => {
      const hash = document.getElementById('verifyHashInput').value.trim();
      if (!hash) return alert('Enter SHA-256 Hash');
      verifyEndpoint(`/verify/hash/${hash}`);
    });
  }

  if (fileBtn) {
    fileBtn.addEventListener('click', async () => {
      const fileInput = document.getElementById('verifyFileInput');
      if (!fileInput.files || fileInput.files.length === 0) {
        return alert('Please select a certificate PDF file.');
      }

      const formData = new FormData();
      formData.append('certificate', fileInput.files[0]);

      try {
        const display = document.getElementById('verifyResultDisplay');
        display.style.display = 'flex';
        document.getElementById('badgeStatus').textContent = 'CHECKING...';
        document.getElementById('badgeDetails').innerHTML = 'Hashing file and checking blockchain ledger...';

        const res = await fetch(`${API_BASE}/verify/file`, {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        renderVerificationBadge(data.verification, data.calculatedHash);
      } catch (err) {
        alert(`Error verifying file: ${err.message}`);
      }
    });
  }
}

async function verifyEndpoint(url) {
  const display = document.getElementById('verifyResultDisplay');
  display.style.display = 'flex';
  document.getElementById('badgeStatus').textContent = 'CHECKING...';
  document.getElementById('badgeDetails').innerHTML = 'Connecting to Fabric Ledger...';

  try {
    const res = await fetch(`${API_BASE}${url}`);
    const data = await res.json();
    renderVerificationBadge(data);
  } catch (err) {
    alert(`Verification call failed: ${err.message}`);
  }
}

function renderVerificationBadge(data, computedHash) {
  const statusEl = document.getElementById('badgeStatus');
  const detailsEl = document.getElementById('badgeDetails');

  const status = data.verificationStatus || (data.verified ? 'VERIFIED' : 'INVALID');
  statusEl.className = `badge-status ${status}`;
  statusEl.textContent = status;

  if (status === 'VERIFIED') {
    const c = data.certificate || {};
    detailsEl.innerHTML = `
      <h4 style="color:#34d399; margin-bottom: 0.25rem;">Authentic Blockchain Record Confirmed</h4>
      <p><strong>Student:</strong> ${c.studentName || c.studentId} | <strong>Degree:</strong> ${c.certType}</p>
      <p><strong>Cert ID:</strong> <code>${c.certId}</code> | <strong>Issue Date:</strong> ${c.issueDate}</p>
      <p><strong>IPFS CID:</strong> <code>${c.ipfsHash}</code></p>
      <p><strong>Fabric Anchor MSP:</strong> <code>${c.issuerMSP || 'Org3MSP'}</code></p>
      ${computedHash ? `<p style="font-size:0.8rem; color:var(--text-muted);">Uploaded File SHA-256: <code>${computedHash}</code></p>` : ''}
    `;
  } else if (status === 'REVOKED') {
    const c = data.certificate || {};
    detailsEl.innerHTML = `
      <h4 style="color:#f87171; margin-bottom: 0.25rem;">Warning: Certificate Has Been Revoked</h4>
      <p><strong>Cert ID:</strong> <code>${c.certId}</code></p>
      <p><strong>Revocation Reason:</strong> ${c.revocation?.reason || 'Administrative revocation'}</p>
      <p><strong>Revoked By:</strong> ${c.revocation?.revokedBy || 'Authority'}</p>
      <p><strong>Revoked At:</strong> ${c.revocation?.revokedAt || 'Recorded on ledger'}</p>
    `;
  } else {
    detailsEl.innerHTML = `
      <h4 style="color:#fbbf24; margin-bottom: 0.25rem;">Invalid Certificate</h4>
      <p>${data.message || 'No matching record exists on the Hyperledger Fabric ledger.'}</p>
    `;
  }
}

// ==========================================
// Revocation Manager
// ==========================================
function initRevocation() {
  const form = document.getElementById('revokeForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const certId = document.getElementById('revokeCertId').value.trim();
    const reason = document.getElementById('revokeReason').value.trim();
    const revokedBy = document.getElementById('revokeOfficer').value.trim();

    if (!confirm(`Are you sure you want to permanently revoke certificate ${certId} on the blockchain?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/certificates/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ certId, reason, revokedBy })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`⚠️ Certificate ${certId} has been REVOKED on Hyperledger Fabric!`);
        form.reset();
      } else {
        alert(`Revocation failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  });
}

// ==========================================
// Ledger Explorer
// ==========================================
function initLedgerExplorer() {
  const refreshBtn = document.getElementById('refreshCertsBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadCertificates);
  }
}

async function loadCertificates() {
  const tbody = document.getElementById('certsTbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-hint">Querying ledger...</td></tr>';
    const res = await fetch(`${API_BASE}/certificates`);
    const certs = await res.json();

    if (!Array.isArray(certs) || certs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty-hint">No certificates on ledger yet.</td></tr>';
      return;
    }

    tbody.innerHTML = certs.map(c => `
      <tr>
        <td><code>${c.certId}</code></td>
        <td>${c.studentId}</td>
        <td>${c.certType}</td>
        <td><span class="step-tag" style="background:${c.status === 'ISSUED' ? '#065f46' : '#991b1b'}; padding:2px 6px; border-radius:4px;">${c.status}</span></td>
        <td><a href="http://localhost:8080/ipfs/${c.ipfsHash}" target="_blank" style="color:var(--primary);">${c.ipfsHash ? c.ipfsHash.substring(0, 10) + '...' : 'N/A'}</a></td>
        <td style="font-family:monospace; font-size:0.75rem;">${c.docHash ? c.docHash.substring(0, 16) + '...' : 'N/A'}</td>
        <td>
          <a href="${API_BASE}/certificates/${c.certId}/pdf" target="_blank" class="btn-secondary btn-sm" style="text-decoration:none;">PDF</a>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-hint">Error: ${err.message}</td></tr>`;
  }
}

// ==========================================
// Ledger State History (GetHistoryForKey)
// ==========================================
function initLedgerHistory() {
  const queryBtn = document.getElementById('queryHistoryBtn');
  const input = document.getElementById('historyKeyInput');

  if (queryBtn && input) {
    queryBtn.addEventListener('click', () => {
      const key = input.value.trim();
      if (!key) {
        alert('Please enter a Certificate ID or Request ID to inspect.');
        return;
      }
      queryKeyHistory(key);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        queryBtn.click();
      }
    });
  }
}

async function queryKeyHistory(key) {
  const container = document.getElementById('historyTimelineDisplay');
  if (!container) return;

  container.innerHTML = '<p class="placeholder-text">⏳ Traversing ledger historical blocks for key: <code>' + key + '</code>...</p>';

  try {
    const res = await fetch(`${API_BASE}/history/${encodeURIComponent(key)}`);
    const data = await res.json();

    if (!res.ok || !data.history || data.history.length === 0) {
      container.innerHTML = `<p class="placeholder-text">No ledger historical records found for key <code>${key}</code>.</p>`;
      return;
    }

    const itemsHtml = data.history.map((record, index) => {
      const isDelete = record.isDelete;
      const txId = record.txId || 'N/A';
      const timestamp = record.timestamp ? new Date(record.timestamp).toLocaleString() : 'N/A';
      let valueStr = '';
      try {
        valueStr = typeof record.value === 'object' ? JSON.stringify(record.value, null, 2) : String(record.value || '');
      } catch (e) {
        valueStr = String(record.value || '');
      }

      return `
        <div class="timeline-item" style="display: flex; gap: 1rem; margin-bottom: 1.25rem; border-left: 2px solid var(--primary); padding-left: 1rem; position: relative;">
          <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: ${isDelete ? 'var(--danger)' : 'var(--primary)'};"></div>
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
              <span style="font-weight: 600; font-size: var(--text-sm); color: var(--text-primary);">
                #${index + 1} • Tx: <code style="font-size: 0.75rem;">${txId.substring(0, 16)}...</code>
              </span>
              <span style="font-size: var(--text-xs); color: var(--text-muted);">${timestamp}</span>
            </div>
            ${isDelete ? '<span class="step-tag" style="background: rgba(239,68,68,0.2); color: #f87171;">DELETED</span>' : ''}
            <pre style="background: var(--bg-card-subtle); padding: 0.5rem; border-radius: var(--radius-sm); font-size: 0.72rem; overflow-x: auto; max-height: 120px; color: var(--text-secondary); margin-top: 0.25rem;">${valueStr}</pre>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="timeline-feed">${itemsHtml}</div>`;
  } catch (err) {
    container.innerHTML = `<p class="placeholder-text" style="color: var(--danger);">Error querying history: ${err.message}</p>`;
  }
}

// ==========================================
// Real-Time Event Ticker (Server-Sent Events)
// ==========================================
function initLiveEventStream() {
  const feed = document.getElementById('eventTickerList');
  const clearBtn = document.getElementById('clearEventsBtn');
  const statusBadge = document.getElementById('sseStatusBadge');
  const dot = document.getElementById('sseDot');

  if (clearBtn && feed) {
    clearBtn.addEventListener('click', () => {
      feed.innerHTML = '<li class="empty-hint">Waiting for live ledger activity...</li>';
    });
  }

  try {
    const eventSource = new EventSource(`${API_BASE}/events`);

    eventSource.addEventListener('ready', () => {
      if (statusBadge) statusBadge.textContent = 'SSE Active';
      if (dot) dot.className = 'status-dot online';
    });

    eventSource.addEventListener('ledger', (e) => {
      try {
        const payload = JSON.parse(e.data);
        appendLiveEvent(payload);
      } catch (err) {
        console.warn('Failed to parse SSE ledger event:', err);
      }
    });

    eventSource.onerror = () => {
      if (statusBadge) statusBadge.textContent = 'Reconnecting...';
      if (dot) dot.className = 'status-dot offline';
    };
  } catch (err) {
    console.warn('SSE not supported or failed to initiate:', err);
  }
}

function appendLiveEvent(event) {
  const feed = document.getElementById('eventTickerList');
  if (!feed) return;

  const emptyHint = feed.querySelector('.empty-hint');
  if (emptyHint) emptyHint.remove();

  const li = document.createElement('li');
  li.style.cssText = 'padding: 0.6rem 0.8rem; margin-bottom: 0.5rem; background: var(--bg-card-subtle); border-radius: var(--radius-sm); border-left: 3px solid var(--primary); display: flex; flex-direction: column; gap: 0.2rem;';

  const timeStr = event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
  const nameStr = event.eventName || event.type || 'LedgerEvent';
  const txStr = event.txId ? event.txId.substring(0, 12) + '...' : 'Consensus';

  li.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 600; color: var(--primary); font-size: var(--text-sm);">⚡ ${nameStr}</span>
      <span style="font-size: var(--text-xs); color: var(--text-muted);">${timeStr}</span>
    </div>
    <div style="font-size: var(--text-xs); color: var(--text-secondary);">
      <span>Tx: <code>${txStr}</code></span>
      ${event.payload ? `<div style="font-family: monospace; font-size: 0.7rem; color: var(--text-muted); margin-top: 2px;">${typeof event.payload === 'object' ? JSON.stringify(event.payload) : event.payload}</div>` : ''}
    </div>
  `;

  feed.prepend(li);

  while (feed.children.length > 50) {
    feed.lastElementChild.remove();
  }
}
