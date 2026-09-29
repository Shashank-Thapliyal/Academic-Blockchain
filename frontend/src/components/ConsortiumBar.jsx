import React from 'react';

export default function ConsortiumBar() {
  return (
    <section className="consortium-bar" aria-label="Consortium Network Topology">
      <div className="org-card org1" id="org1Card">
        <div className="org-header">
          <span className="org-tag tag-org1">Org 1</span>
          <h3>University / Faculty</h3>
        </div>
        <p className="org-role">Academic Dept • Faculty, HOD & DAC Multi-Stage Approvals</p>
        <div className="org-meta">
          <span>MSP: <code>Org1MSP</code></span>
          <span>Peer: <code>peer0.org1:7051</code></span>
        </div>
      </div>

      <div className="org-card org2" id="org2Card">
        <div className="org-header">
          <span className="org-tag tag-org2">Org 2</span>
          <h3>Examination Board</h3>
        </div>
        <p className="org-role">Controller of Examinations • Official Grade & Transcript Lockdown</p>
        <div className="org-meta">
          <span>MSP: <code>Org2MSP</code></span>
          <span>Peer: <code>peer0.org2:8051</code></span>
        </div>
      </div>

      <div className="org-card org3" id="org3Card">
        <div className="org-header">
          <span className="org-tag tag-org3">Org 3</span>
          <h3>Admin & Governance</h3>
        </div>
        <p className="org-role">Dean Sanction • Final Clearance, Issuance & Revocation</p>
        <div className="org-meta">
          <span>MSP: <code>Org3MSP</code></span>
          <span>Peer: <code>peer0.org3:9051</code></span>
        </div>
      </div>

      <div className="org-card infra" id="infraCard">
        <div className="org-header">
          <span className="org-tag tag-infra">Infra</span>
          <h3>Consensus & Storage</h3>
        </div>
        <p className="org-role">Raft Orderer + Decentralized IPFS Storage Node</p>
        <div className="org-meta">
          <span>Orderer: <code>7050 (Raft)</code></span>
          <span>IPFS: <code>5001 / 8080</code></span>
        </div>
      </div>
    </section>
  );
}
