import React, { useState, useEffect } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { UserPlus, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function StudentModule() {
  const { API_BASE } = useNetwork();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    name: '',
    email: '',
    department: 'Computer Science & Engineering',
    enrollmentYear: '2024'
  });
  const [feedback, setFeedback] = useState(null);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/students`);
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: 'loading', message: 'Submitting transaction to Org1MSP...' });
    try {
      const res = await fetch(`${API_BASE}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: `✅ Student ${form.studentId} registered on Fabric ledger!` });
        setForm({
          studentId: '',
          name: '',
          email: '',
          department: 'Computer Science & Engineering',
          enrollmentYear: '2024'
        });
        fetchStudents();
      } else {
        setFeedback({ type: 'error', message: `❌ Registration failed: ${data.error}` });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `❌ Network error: ${err.message}` });
    }
  };

  return (
    <div className="panel-grid">
      <div className="card">
        <div className="card-title">
          <h3>Register New Student</h3>
          <span className="step-num">Module 1</span>
        </div>

        {feedback && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            background: feedback.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`
          }}>
            {feedback.message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="stuId">Student Registration ID:</label>
            <input 
              type="text" 
              id="stuId"
              required 
              placeholder="e.g. STU-2024-001"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuName">Full Legal Name:</label>
            <input 
              type="text" 
              id="stuName"
              required 
              placeholder="e.g. Divyanshu Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuEmail">Institutional Email:</label>
            <input 
              type="email" 
              id="stuEmail"
              required 
              placeholder="e.g. student@academic.edu"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuDept">Academic Department:</label>
            <input 
              type="text" 
              id="stuDept"
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="stuYear">Enrollment Year:</label>
            <input 
              type="text" 
              id="stuYear"
              value={form.enrollmentYear}
              onChange={(e) => setForm({ ...form, enrollmentYear: e.target.value })}
            />
          </div>

          <button type="submit" className="btn-primary full-width">
            <UserPlus size={16} />
            Register Student on Ledger (Org 1)
          </button>
        </form>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Registered Students Registry</h3>
          <button className="btn-secondary btn-sm" onClick={fetchStudents}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Full Name</th>
                <th>Email</th>
                <th>Department</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="empty-hint">Loading registered students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="5" className="empty-hint">No students registered yet on ledger.</td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.studentId}>
                    <td><code>{s.studentId}</code></td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.department}</td>
                    <td>{s.enrollmentYear}</td>
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
