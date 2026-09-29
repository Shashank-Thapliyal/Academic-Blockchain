import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:4000/api' : '/api';

export default function StudentModule() {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    enrollmentYear: '2024'
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setStudents(data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Student ${formData.studentId} registered successfully on Ledger (Org 1)!` });
        setFormData({
          studentId: '',
          name: '',
          email: '',
          department: 'Computer Science & Engineering',
          enrollmentYear: '2024'
        });
        fetchStudents();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to register student' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel-grid">
      <div className="card">
        <div className="card-title">
          <h3>
            <UserPlus size={18} className="text-primary" />
            Register New Student
          </h3>
          <span className="step-num">Module 1</span>
        </div>
        <p className="subtitle">Submit candidate identity onto the immutable Fabric ledger via Org 1 peer node.</p>

        {message && (
          <div className={`result-banner status-${message.type === 'success' ? 'verified' : 'invalid'}`} style={{ padding: '0.75rem', marginBottom: '1rem' }}>
            <div className="banner-text">
              <p style={{ margin: 0, fontWeight: 600 }}>{message.text}</p>
            </div>
          </div>
        )}

        <form id="studentForm" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="stuId">Student ID:</label>
            <input 
              type="text" 
              id="stuId" 
              required 
              placeholder="e.g. STU-2024-001"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuName">Full Legal Name:</label>
            <input 
              type="text" 
              id="stuName" 
              required 
              placeholder="e.g. Divyanshu Sharma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuEmail">Institutional Email:</label>
            <input 
              type="email" 
              id="stuEmail" 
              required 
              placeholder="e.g. student@academic.edu"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuDept">Academic Department:</label>
            <input 
              type="text" 
              id="stuDept" 
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuYear">Enrollment Year:</label>
            <input 
              type="text" 
              id="stuYear" 
              value={formData.enrollmentYear}
              onChange={(e) => setFormData({ ...formData, enrollmentYear: e.target.value })}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary full-width" 
            disabled={submitting}
          >
            {submitting ? 'Registering on Ledger...' : 'Register Student on Ledger (Org 1)'}
          </button>
        </form>
      </div>

      <div className="card wide-card">
        <div className="card-title">
          <h3>Registered Students Registry</h3>
          <button 
            className="btn-secondary btn-sm" 
            id="refreshStudentsBtn"
            onClick={fetchStudents}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        <p className="subtitle">Verified candidate records stored in CouchDB state database across peer nodes.</p>

        <div className="table-container">
          <table id="studentsTable">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody id="studentsTbody">
              {loading && students.length === 0 ? (
                <tr><td colSpan="5" className="empty-hint">Querying ledger for students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="5" className="empty-hint">No students registered on ledger yet.</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.studentId}>
                    <td><code>{s.studentId}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.department}</td>
                    <td><span className="step-tag" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '2px 6px', borderRadius: '4px' }}>{s.enrollmentYear}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
