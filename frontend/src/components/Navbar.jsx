import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { ShieldCheck, GraduationCap, Building2, Sun, Moon } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView, theme, setTheme }) {
  const { health } = useNetwork();

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('academic_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <header className="top-nav">
      <div className="nav-brand">
        <div className="brand-icon">
          {currentView === 'employer' ? '🏛️' : '🎓'}
        </div>
        <div className="brand-text">
          <h1>
            {currentView === 'employer' 
              ? 'Employer Credential Verification Portal' 
              : 'Academic Blockchain PBL'}
          </h1>
          <p>
            {currentView === 'employer'
              ? 'Public Read-Only Verifier • Hyperledger Fabric 2.5 • IPFS Cryptographic Proofs'
              : '3-Organization Consortium • Hyperledger Fabric 2.5 • IPFS Storage'}
          </p>
        </div>
      </div>

      <div className="nav-actions">
        <button 
          type="button" 
          className="btn-theme" 
          id="themeToggleBtn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {currentView === 'consortium' ? (
          <button 
            type="button" 
            className="btn-primary btn-sm"
            onClick={() => setCurrentView('employer')}
          >
            <Building2 size={16} />
            🏢 Employer Verification Portal
          </button>
        ) : (
          <button 
            type="button" 
            className="btn-secondary btn-sm"
            onClick={() => setCurrentView('consortium')}
          >
            <GraduationCap size={16} />
            ⚙️ Consortium Management
          </button>
        )}

        <div className="network-badge" id="netStatusBadge">
          <span 
            className={`status-dot ${
              health.status === 'ONLINE' 
                ? 'online' 
                : health.status === 'OFFLINE' 
                ? 'offline' 
                : ''
            }`} 
          />
          <span id="networkStatusText">
            {health.status === 'ONLINE'
              ? '3-Org Network Online (Fabric 2.5 + IPFS)'
              : health.status === 'OFFLINE'
              ? 'Network Disconnected'
              : 'Connecting to Ledger...'}
          </span>
        </div>
      </div>
    </header>
  );
}
