import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ConsortiumBar from './components/ConsortiumBar';
import StudentModule from './components/StudentModule';
import WorkflowModule from './components/WorkflowModule';
import IssuanceModule from './components/IssuanceModule';
import EmployerPortal from './components/EmployerPortal';
import RevocationModule from './components/RevocationModule';
import LedgerExplorer from './components/LedgerExplorer';
import { NetworkProvider } from './context/NetworkContext';
import { ToastProvider } from './context/ToastContext';

export default function App() {
  const [currentView, setCurrentView] = useState('consortium');
  const [activeTab, setActiveTab] = useState('workflow');
  const [currentRequest, setCurrentRequest] = useState(null);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('academic_theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <NetworkProvider>
      <ToastProvider>
        <div className="app-layout">
          <Navbar 
            currentView={currentView} 
            setCurrentView={setCurrentView} 
            theme={theme}
            setTheme={setTheme}
          />
          
          {currentView === 'consortium' ? (
            <>
              <ConsortiumBar />
              
              <main className="main-container">
                <nav className="tabs" role="tablist">
                  <button 
                    className={`tab-btn ${activeTab === 'workflow' ? 'active' : ''}`}
                    onClick={() => setActiveTab('workflow')}
                    role="tab"
                    aria-selected={activeTab === 'workflow'}
                  >
                    📋 Lifecycle & Workflow
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'students' ? 'active' : ''}`}
                    onClick={() => setActiveTab('students')}
                    role="tab"
                    aria-selected={activeTab === 'students'}
                  >
                    👤 Student Registration
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'verify' ? 'active' : ''}`}
                    onClick={() => setActiveTab('verify')}
                    role="tab"
                    aria-selected={activeTab === 'verify'}
                  >
                    🔍 Verification Portal
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'revoke' ? 'active' : ''}`}
                    onClick={() => setActiveTab('revoke')}
                    role="tab"
                    aria-selected={activeTab === 'revoke'}
                  >
                    ⚠️ Revocation
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'ledger' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ledger')}
                    role="tab"
                    aria-selected={activeTab === 'ledger'}
                  >
                    📊 Ledger Explorer
                  </button>
                </nav>

                {activeTab === 'workflow' && (
                  <div className="tab-pane">
                    <WorkflowModule 
                      currentRequest={currentRequest} 
                      setCurrentRequest={setCurrentRequest} 
                    />
                    <IssuanceModule 
                      currentRequest={currentRequest} 
                      setCurrentRequest={setCurrentRequest} 
                    />
                  </div>
                )}

                {activeTab === 'students' && (
                  <div className="tab-pane">
                    <StudentModule />
                  </div>
                )}

                {activeTab === 'verify' && (
                  <div className="tab-pane">
                    <EmployerPortal />
                  </div>
                )}

                {activeTab === 'revoke' && (
                  <div className="tab-pane">
                    <RevocationModule />
                  </div>
                )}

                {activeTab === 'ledger' && (
                  <div className="tab-pane">
                    <LedgerExplorer />
                  </div>
                )}
              </main>
            </>
          ) : (
            <EmployerPortal isStandalone={true} />
          )}

          <footer className="footer">
            <p>Academic Blockchain PBL — Hyperledger Fabric 3-Org Network Architecture • Decentralized Zero-Trust Verification</p>
          </footer>
        </div>
      </ToastProvider>
    </NetworkProvider>
  );
}
