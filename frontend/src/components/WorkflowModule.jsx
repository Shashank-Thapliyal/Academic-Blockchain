import React, { useState } from 'react';
import { Send, Zap, Clock, CheckCircle2, ChevronRight } from 'lucide-react';

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

  const generateReqId = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    setReqIdInput(`REQ-2024-${rand}`);
  };

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: reqIdInput, studentId, certType })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Request ${reqIdInput} submitted! Current Status: SUBMITTED`);
        setActiveReqInput(reqIdInput);
        trackRequest(reqIdInput);
      } else {
        alert(`Submission failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    }
  };

  const trackRequest = async (idToTrack) => {
    const id = idToTrack || activeReqInput;
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE}/requests/${encodeURIComponent(id)}`);
      if (!res.ok) {
        alert(`Request ${id} not found.`);
        return;
      }
      const data = await res.json();
      setCurrentRequest(data);
    } catch (err) {
      alert(`Error tracking request: ${err.message}`);
    }
  };

  const advanceStage = async (endpoint, defaultComments) => {
    if (!currentRequest) return;
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
        await trackRequest(currentRequest.requestId);
      } else {
        alert(`Approval failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const autoAdvanceStages = async () => {
    if (!currentRequest) {
      alert('Please track or submit a request first.');
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
        const res = await fetch(`${API_BASE}/requests/${reqId}`);
        const cur = await res.json();
        if (cur.status === step.from) {
          await fetch(`${API_BASE}/workflow/${step.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId: reqId, comments: step.comment })
          });
        }
      }
      await trackRequest(reqId);
      alert(`🎉 Auto-advanced request ${reqId} to completed workflow state!`);
    } catch (err) {
      alert(`Auto-advance error: ${err.message}`);
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
