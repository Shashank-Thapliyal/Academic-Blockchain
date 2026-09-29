import React, { useState } from 'react';
import { Send, Zap, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

const STAGES = [
  { key: 'SUBMITTED', label: 'SUBMITTED', org: 'Student', num: 1 },
  { key: 'FACULTY_APPROVED', label: 'FACULTY', org: 'Org 1', num: 2 },
  { key: 'HOD_APPROVED', label: 'HOD', org: 'Org 1', num: 3 },
  { key: 'DAC_APPROVED', label: 'DAC', org: 'Org 1', num: 4 },
  { key: 'EXAM_LOCKED', label: 'EXAM LOCK', org: 'Org 2', num: 5 },
  { key: 'DEAN_APPROVED', label: 'DEAN', org: 'Org 3', num: 6 },
  { key: 'ADMIN_FINALIZED', label: 'ADMIN', org: 'Org 3', num: 7 }
];

export default function WorkflowModule({ currentRequest, setCurrentRequest }) {
  const [reqIdInput, setReqIdInput] = useState('');
  const [studentId, setStudentId] = useState('');
  const [certType, setCertType] = useState('Bachelor of Technology in CSE');
  const [activeReqInput, setActiveReqInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');

  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const generateReqId = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const newId = `REQ-2024-${rand}`;
    setReqIdInput(newId);
    showInfo(`Generated Request ID: ${newId}`, 'Auto-generated ID');
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!reqIdInput.trim()) {
      showWarning('Please provide a valid Request ID.', 'Missing ID');
      return;
    }
    if (!studentId.trim()) {
      showWarning('Please provide a registered Student ID.', 'Missing Student ID');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: reqIdInput.trim(), 
          studentId: studentId.trim(), 
          certType 
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(`Certificate Request ${reqIdInput} submitted successfully to the ledger! Status: SUBMITTED`, 'Request Submitted');
        setActiveReqInput(reqIdInput.trim());
        trackRequest(reqIdInput.trim());
      } else {
        showError(data.error || 'Request submission rejected by blockchain.', 'Submission Rejected');
      }
    } catch (err) {
      showError(err, 'Network Connection Error');
    }
  };

  const trackRequest = async (idToTrack) => {
    const id = idToTrack || activeReqInput;
    if (!id || !id.trim()) {
      showWarning('Please enter a Request ID to track.', 'Empty Lookup');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id.trim())}`);
      if (!res.ok) {
        showWarning(`Request ${id.trim()} was not found on the blockchain ledger.`, 'Record Not Found');
        return;
      }
      const data = await res.json();
      setCurrentRequest(data);
      showInfo(`Loaded request ${data.requestId} (Status: ${data.status})`, 'Request Tracked');
    } catch (err) {
      showError(err, 'Tracking Query Error');
    }
  };

  const advanceStage = async (endpoint, defaultComments) => {
    if (!currentRequest) {
      showWarning('Please track or select a request first.', 'No Active Request');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          requestId: currentRequest.requestId, 
          comments: comments || defaultComments 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setComments('');
        showSuccess(`Stage transition recorded on blockchain! New status: ${data.status || 'Updated'}`, 'Stage Endorsed');
        await trackRequest(currentRequest.requestId);
      } else {
        showError(data.error || 'Stage approval rejected by chaincode policy.', 'Stage Approval Rejected');
      }
    } catch (err) {
      showError(err, 'Endorsement Error');
    } finally {
      setActionLoading(false);
    }
  };

  const autoAdvanceStages = async () => {
    if (!currentRequest) {
      showWarning('Please track or submit a request first before auto-advancing.', 'No Active Request');
      return;
    }
    const reqId = currentRequest.requestId;
    const flow = [
      { endpoint: 'faculty-approve', from: 'SUBMITTED', comment: 'Auto-approved by Faculty' },
      { endpoint: 'hod-approve', from: 'FACULTY_APPROVED', comment: 'Auto-approved by HOD' },
      { endpoint: 'dac-approve', from: 'HOD_APPROVED', comment: 'Auto-approved by DAC' },
      { endpoint: 'exam-lock', from: 'DAC_APPROVED', comment: 'Auto-locked by Exam Board' },
      { endpoint: 'dean-approve', from: 'EXAM_LOCKED', comment: 'Auto-sanctioned by Dean' },
      { endpoint: 'admin-finalize', from: 'DEAN_APPROVED', comment: 'Auto-finalized by Administration' }
    ];

    setActionLoading(true);
    try {
      for (const step of flow) {
        const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(reqId)}`);
        const cur = await res.json();
        if (cur.status === step.from) {
          const stepRes = await fetch(`${API_BASE}/workflow/${step.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, comments: step.comment })
          });
          if (!stepRes.ok) {
            const errData = await stepRes.json();
            showError(errData.error || `Step ${step.endpoint} failed.`, 'Workflow Halt');
            break;
          }
        }
      }
      await trackRequest(reqId);
      showSuccess(`🎉 Auto-advanced request ${reqId} through all endorsement stages to ADMIN_FINALIZED!`, 'Workflow Completed');
    } catch (err) {
      showError(err, 'Auto-Advance Sequence Error');
    } finally {
      setActionLoading(false);
    }
  };

  const currentStatus = currentRequest?.status || '';
  const currentStageIndex = STAGES.findIndex(s => s.key === currentStatus);

  return (
    <div className="panel-grid">
      {/* 1. Submission Form */}
      <div className="card">
        <div className="card-title">
          <h3>
            <Send size={18} className="text-primary" />
            1. Submit Certificate Request
          </h3>
          <span className="step-num">Module 1</span>
        </div>
        <p className="subtitle">Initiates the cryptographic endorsement pipeline across Org 1, 2, and 3.</p>

        <form id="reqForm" onSubmit={handleRequestSubmit}>
          <div className="form-group">
            <label htmlFor="reqIdInput">Request ID:</label>
            <div className="input-with-action">
              <input 
                type="text" 
                id="reqIdInput" 
                required 
                placeholder="e.g. REQ-2024-001"
                value={reqIdInput}
                onChange={(e) => setReqIdInput(e.target.value)}
              />
              <button type="button" className="btn-secondary" id="genReqIdBtn" onClick={generateReqId}>
                Auto
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reqStudentId">Registered Student ID:</label>
            <input 
              type="text" 
              id="reqStudentId" 
              required 
              placeholder="e.g. STU-2024-001"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reqCertType">Degree / Certificate Type:</label>
            <select 
              id="reqCertType"
              value={certType}
              onChange={(e) => setCertType(e.target.value)}
            >
              <option value="Bachelor of Technology in CSE">Bachelor of Technology in CSE</option>
              <option value="Master of Science in Data Science">Master of Science in Data Science</option>
              <option value="Bachelor of Science in AI & Robotics">Bachelor of Science in AI & Robotics</option>
              <option value="Executive Post Graduate Diploma">Executive Post Graduate Diploma</option>
            </select>
          </div>

          <button type="submit" className="btn-primary full-width" id="submitReqBtn">
            Submit Certificate Request
          </button>
        </form>
      </div>

      {/* 2. 7-Stage State Machine */}
      <div className="card wide-card">
        <div className="card-title">
          <h3>
            <Clock size={18} className="text-primary" />
            2. 7-Stage Approval Workflow State Machine
          </h3>
          <span className="step-num">Module 2</span>
        </div>
        <p className="subtitle">Execute endorsements sequentially across University (Org1), Exam Board (Org2), and Dean/Admin (Org3).</p>

        <div className="lookup-bar">
          <input 
            type="text" 
            id="activeReqInput" 
            placeholder="Enter Request ID to track (e.g. REQ-2024-001)"
            value={activeReqInput}
            onChange={(e) => setActiveReqInput(e.target.value)}
          />
          <button type="button" className="btn-primary" id="trackReqBtn" onClick={() => trackRequest(activeReqInput)}>
            Track Request
          </button>
          <button type="button" className="btn-secondary" id="autoAdvanceBtn" onClick={autoAdvanceStages} disabled={actionLoading || !currentRequest}>
            <Zap size={14} />
            ⚡ Auto-Advance All Stages
          </button>
        </div>

        {/* Stepper Pipeline */}
        <div className="stepper" id="workflowStepper">
          {STAGES.map((stage, idx) => {
            const isCompleted = currentStageIndex > idx || currentStatus === 'ADMIN_FINALIZED' || currentStatus === 'CERTIFICATE_ISSUED';
            const isActive = currentStageIndex === idx && currentStatus !== 'CERTIFICATE_ISSUED';

            return (
              <React.Fragment key={stage.key}>
                <div 
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                  id={`step-${stage.key}`}
                >
                  <div className="step-circle">
                    {isCompleted ? '✓' : stage.num}
                  </div>
                  <div className="step-label">{stage.label}</div>
                  <div className="step-org">{stage.org}</div>
                </div>
                {idx < STAGES.length - 1 && (
                  <div className={`step-line ${isCompleted && currentStageIndex > idx ? 'completed' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Dynamic Approval Actions */}
        <div className="action-box" id="approvalActions">
          <h4>Next Pending Action:</h4>
          <div id="actionControls" className="action-buttons">
            {!currentRequest ? (
              <p className="placeholder-text">Submit or track a request above to perform stage approvals.</p>
            ) : currentStatus === 'SUBMITTED' ? (
              <button 
                className="btn-primary" 
                onClick={() => advanceStage('faculty-approve', 'Faculty endorsement granted')}
                disabled={actionLoading}
              >
                ✍️ Org 1: Approve as Faculty
              </button>
            ) : currentStatus === 'FACULTY_APPROVED' ? (
              <button 
                className="btn-primary" 
                onClick={() => advanceStage('hod-approve', 'HOD recommendation verified')}
                disabled={actionLoading}
              >
                ✍️ Org 1: Approve as HOD
              </button>
            ) : currentStatus === 'HOD_APPROVED' ? (
              <button 
                className="btn-primary" 
                onClick={() => advanceStage('dac-approve', 'Department Academic Committee approval complete')}
                disabled={actionLoading}
              >
                ✍️ Org 1: Approve as DAC
              </button>
            ) : currentStatus === 'DAC_APPROVED' ? (
              <button 
                className="btn-primary" 
                style={{ background: '#f59e0b' }}
                onClick={() => advanceStage('exam-lock', 'Grades locked by Controller of Examinations')}
                disabled={actionLoading}
              >
                🔒 Org 2: Lock Exam Grades
              </button>
            ) : currentStatus === 'EXAM_LOCKED' ? (
              <button 
                className="btn-primary" 
                style={{ background: '#10b981' }}
                onClick={() => advanceStage('dean-approve', 'Dean Academic clearance granted')}
                disabled={actionLoading}
              >
                ✍️ Org 3: Sanction as Dean
              </button>
            ) : currentStatus === 'DEAN_APPROVED' ? (
              <button 
                className="btn-primary" 
                style={{ background: '#6366f1' }}
                onClick={() => advanceStage('admin-finalize', 'Administrative clearance verified')}
                disabled={actionLoading}
              >
                🏛️ Org 3: Finalize by Administration
              </button>
            ) : currentStatus === 'ADMIN_FINALIZED' ? (
              <div style={{ color: 'var(--success)', fontWeight: 600 }}>
                🎉 Request is ADMIN_FINALIZED! Proceed to Certificate Issuance below.
              </div>
            ) : currentStatus === 'CERTIFICATE_ISSUED' ? (
              <div style={{ color: 'var(--primary)', fontWeight: 600 }}>
                🎓 Certificate Issued on Ledger! Cert ID: <code>{currentRequest.certificateId || 'N/A'}</code>
              </div>
            ) : (
              <p className="placeholder-text">Current State: {currentStatus}</p>
            )}
          </div>
        </div>

        {/* Transition Audit Log */}
        <div className="history-box">
          <h4>Ledger Transition History:</h4>
          <ul id="historyList" className="history-list">
            {!currentRequest || !currentRequest.history || currentRequest.history.length === 0 ? (
              <li className="empty-hint">No audit transitions recorded yet</li>
            ) : (
              currentRequest.history.map((h, i) => (
                <li key={i}>
                  <span><strong>{h.stage}</strong> by <code>{h.updatedBy || 'N/A'}</code></span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''} - {h.comments || ''}
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
