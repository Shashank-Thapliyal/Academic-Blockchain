import React from 'react';
import { useNetwork } from '../context/NetworkContext';
import { ShieldCheck, GraduationCap, Building2, ExternalLink } from 'lucide-react';

export default function Navbar({ currentView, setCurrentView }) {
  const { health } = useNetwork();

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

        <div className="network-badge">
          <span 
            className={`status-dot ${
              health.status === 'ONLINE' 
                ? 'online' 
                : health.status === 'OFFLINE' 
                ? 'offline' 
                : ''
            }`} 
          />
          <span>
            {health.status === 'ONLINE'
              ? 'Consortium Online (Org1, Org2, Org3)'
              : health.status === 'PARTIAL'
              ? 'Consortium Partial'
              : 'Ledger Disconnected'}
          </span>
        </div>
      </div>
    </header>
  );
}
