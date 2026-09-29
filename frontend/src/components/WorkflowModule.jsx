import React, { useState } from 'react';
import { Send, Zap, Clock, CheckCircle2, ChevronRight, Award, Lock } from 'lucide-react';
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
  const [certType, setCertType] = useState('Bachelor of Technology in Computer Science & Engineering');
  const [customCertType, setCustomCertType] = useState('');
  const [activeReqInput, setActiveReqInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');

  // Exam Grading states (Org 2)
  const [examClassification, setExamClassification] = useState('WITH FIRST CLASS HONORS & ACADEMIC DISTINCTION');
  const [examCgpa, setExamCgpa] = useState('9.42');
  const [examGradeLetter, setExamGradeLetter] = useState('A+');
  const [customHonors, setCustomHonors] = useState('');
  const [examComments, setExamComments] = useState('Transcripts and curriculum credits audited; examination records locked.');

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
          certType: certType === 'CUSTOM' ? customCertType.trim() : certType
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
    const finalHonors = examClassification === 'CUSTOM' ? (customHonors.trim() || 'WITH FIRST CLASS HONORS') : examClassification;
    const flow = [
      { endpoint: 'faculty-approve', from: 'SUBMITTED', body: { requestId: reqId, comments: 'Auto-approved by Faculty' } },
      { endpoint: 'hod-approve', from: 'FACULTY_APPROVED', body: { requestId: reqId, comments: 'Auto-approved by HOD' } },
      { endpoint: 'dac-approve', from: 'HOD_APPROVED', body: { requestId: reqId, comments: 'Auto-approved by DAC' } },
      { endpoint: 'exam-lock', from: 'DAC_APPROVED', body: { 
          requestId: reqId, 
          examOfficerId: 'ExamController-Org2', 
          grade: examGradeLetter || 'A+', 
          cgpa: examCgpa || '9.42', 
          honors: finalHonors, 
          comments: `Auto-locked by Exam Board: ${finalHonors}` 
        } 
      },
      { endpoint: 'dean-approve', from: 'EXAM_LOCKED', body: { requestId: reqId, comments: 'Auto-sanctioned by Dean' } },
      { endpoint: 'admin-finalize', from: 'DEAN_APPROVED', body: { requestId: reqId, comments: 'Auto-finalized by Administration' } }
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
            body: JSON.stringify(step.body)
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

  const handleLockGrades = async () => {
    if (!currentRequest) {
      showWarning('Please track a request first.', 'No Active Request');
      return;
    }
    const finalHonors = examClassification === 'CUSTOM'
      ? (customHonors.trim() || 'WITH FIRST CLASS HONORS')
      : examClassification;
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/workflow/exam-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: currentRequest.requestId,
          examOfficerId: 'ExamController-Org2',
          grade: examGradeLetter || 'A+',
          cgpa: examCgpa || '9.42',
          honors: finalHonors,
          comments: examComments || `Grades locked by Exam Board: ${finalHonors}`
        })
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(
          `🔒 Exam grades sealed on ledger! Honors: ${finalHonors} | CGPA: ${examCgpa} | Grade: ${examGradeLetter}`,
          'Grades Locked'
        );
        await trackRequest(currentRequest.requestId);
      } else {
        showError(data.error || 'Exam grade lock rejected by chaincode.', 'Grade Lock Failed');
      }
    } catch (err) {
      showError(err, 'Exam Lock Error');
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
            <label htmlFor="reqCertType">Degree / Academic Program:</label>
            <select 
              id="reqCertType"
              value={certType}
              onChange={(e) => setCertType(e.target.value)}
            >
              <optgroup label="Undergraduate Degrees (Bachelor's)">
                <option value="Bachelor of Technology in Computer Science & Engineering">Bachelor of Technology in Computer Science & Engineering (B.Tech CSE)</option>
                <option value="Bachelor of Technology in Electronics & Communication Engineering">Bachelor of Technology in Electronics & Communication Engineering (B.Tech ECE)</option>
                <option value="Bachelor of Technology in Electrical & Electronics Engineering">Bachelor of Technology in Electrical & Electronics Engineering (B.Tech EEE)</option>
                <option value="Bachelor of Technology in Mechanical Engineering">Bachelor of Technology in Mechanical Engineering (B.Tech ME)</option>
                <option value="Bachelor of Technology in Civil Engineering">Bachelor of Technology in Civil Engineering (B.Tech CE)</option>
                <option value="Bachelor of Technology in Information Technology">Bachelor of Technology in Information Technology (B.Tech IT)</option>
                <option value="Bachelor of Technology in Chemical Engineering">Bachelor of Technology in Chemical Engineering (B.Tech CHE)</option>
                <option value="Bachelor of Science in Artificial Intelligence & Robotics">Bachelor of Science in Artificial Intelligence & Robotics</option>
                <option value="Bachelor of Science in Data Science & Analytics">Bachelor of Science in Data Science & Analytics</option>
                <option value="Bachelor of Computer Applications">Bachelor of Computer Applications (BCA)</option>
                <option value="Bachelor of Business Administration">Bachelor of Business Administration (BBA)</option>
              </optgroup>
              <optgroup label="Postgraduate Degrees (Master's)">
                <option value="Master of Technology in Computer Science & Engineering">Master of Technology in Computer Science & Engineering (M.Tech CSE)</option>
                <option value="Master of Technology in Artificial Intelligence">Master of Technology in Artificial Intelligence (M.Tech AI)</option>
                <option value="Master of Technology in VLSI & Embedded Systems">Master of Technology in VLSI & Embedded Systems</option>
                <option value="Master of Computer Applications">Master of Computer Applications (MCA)</option>
                <option value="Master of Science in Data Science">Master of Science in Data Science</option>
                <option value="Master of Science in Cybersecurity & Information Assurance">Master of Science in Cybersecurity & Information Assurance</option>
                <option value="Master of Business Administration">Master of Business Administration (MBA)</option>
              </optgroup>
              <optgroup label="Doctoral Degrees (Ph.D.)">
                <option value="Doctor of Philosophy in Computer Science & Engineering">Doctor of Philosophy in Computer Science & Engineering (Ph.D.)</option>
                <option value="Doctor of Philosophy in Electrical Sciences">Doctor of Philosophy in Electrical Sciences (Ph.D.)</option>
              </optgroup>
              <optgroup label="Executive & Diplomas">
                <option value="Executive Post Graduate Diploma in Blockchain Technologies">Executive Post Graduate Diploma in Blockchain Technologies</option>
                <option value="Post Graduate Diploma in Cloud & Distributed Systems">Post Graduate Diploma in Cloud & Distributed Systems</option>
              </optgroup>
              <optgroup label="Custom Option">
                <option value="CUSTOM">-- Enter Custom Degree Title --</option>
              </optgroup>
            </select>
            {certType === 'CUSTOM' && (
              <input 
                type="text" 
                placeholder="e.g. Bachelor of Arts in Economics & Public Policy" 
                value={customCertType}
                onChange={(e) => setCustomCertType(e.target.value)}
                style={{ marginTop: "0.5rem" }}
                required
              />
            )}
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
              <div className="exam-grading-panel" style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "var(--radius-md)", padding: "1rem", width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <Award size={18} style={{ color: "#f59e0b" }} />
                  <h4 style={{ margin: 0, color: "#f59e0b", fontSize: "0.95rem" }}>Org 2 Examination Board: Grade Student & Decide Honors</h4>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                  Select or write the academic classification line that will be permanently sealed on ledger and printed on the student's certificate:
                </p>
                
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Degree Honors / Classification:</label>
                    <select 
                      value={examClassification} 
                      onChange={(e) => setExamClassification(e.target.value)}
                      style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem" }}
                    >
                      <option value="WITH FIRST CLASS HONORS & ACADEMIC DISTINCTION">With First Class Honors & Academic Distinction (CGPA 9.0+)</option>
                      <option value="WITH FIRST CLASS HONORS">With First Class Honors (CGPA 7.5 - 8.9)</option>
                      <option value="WITH SECOND CLASS HONORS (DIVISION I)">With Second Class Honors - Division I (CGPA 6.5 - 7.4)</option>
                      <option value="WITH SECOND CLASS HONORS (DIVISION II)">With Second Class Honors - Division II (CGPA 5.5 - 6.4)</option>
                      <option value="WITH PASS DIVISION">With Pass Division (CGPA 4.5 - 5.4)</option>
                      <option value="WITH HIGHEST DISTINCTION & DEAN'S MERIT LIST">With Highest Distinction & Dean's Merit List</option>
                      <option value="NONE">Confer Degree Without Honors Line</option>
                      <option value="CUSTOM">-- Enter Custom Honors Line --</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>CGPA / Grade Letter:</label>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <input 
                        type="text" 
                        placeholder="9.42" 
                        value={examCgpa} 
                        onChange={(e) => setExamCgpa(e.target.value)} 
                        style={{ width: "60%", fontSize: "0.82rem", padding: "0.4rem" }} 
                      />
                      <input 
                        type="text" 
                        placeholder="A+" 
                        value={examGradeLetter} 
                        onChange={(e) => setExamGradeLetter(e.target.value)} 
                        style={{ width: "40%", fontSize: "0.82rem", padding: "0.4rem" }} 
                      />
                    </div>
                  </div>
                </div>

                {examClassification === "CUSTOM" && (
                  <div style={{ marginBottom: "0.75rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Custom Certificate Text:</label>
                    <input 
                      type="text" 
                      placeholder="e.g. WITH HIGHEST HONORS & PRESIDENTIAL GOLD MEDAL" 
                      value={customHonors} 
                      onChange={(e) => setCustomHonors(e.target.value)}
                      style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem" }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "block", marginBottom: "0.25rem" }}>Examination Remarks:</label>
                  <input 
                    type="text" 
                    value={examComments} 
                    onChange={(e) => setExamComments(e.target.value)} 
                    style={{ width: "100%", fontSize: "0.82rem", padding: "0.4rem" }}
                  />
                </div>

                <button 
                  type="button" 
                  className="btn-primary" 
                  style={{ background: "#d97706", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}
                  onClick={handleLockGrades}
                  disabled={actionLoading}
                >
                  <Lock size={14} /> 🔒 Org 2: Lock Exam Grades & Seal Classification
                </button>
              </div>
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
