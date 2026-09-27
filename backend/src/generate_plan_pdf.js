'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function buildPlanPDF(outputPath) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 30, bottom: 30, left: 35, right: 35 },
    autoFirstPage: true
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const primaryColor = '#1e3a8a';   // Deep Blue
  const secondaryColor = '#0284c7'; // Sky Blue
  const darkTextColor = '#0f172a';  // Dark Slate
  const bodyTextColor = '#334155';  // Slate Gray
  const lightBgColor = '#f8fafc';   // Light Card Bg
  const borderColor = '#cbd5e1';    // Border Gray
  const highlightColor = '#0369a1'; // Blue Highlight

  // Helper: Section Title
  function drawSectionHeader(title, y) {
    doc.rect(35, y, 525, 20).fill(primaryColor);
    doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text(title, 45, y + 5);
    doc.fillColor(darkTextColor);
    return y + 26;
  }

  // --- PAGE 1: HEADER & GROUPS 1-3 ---
  doc.rect(35, 30, 525, 68).fill('#f1f5f9');
  doc.rect(35, 30, 525, 68).lineWidth(1.5).strokeColor(primaryColor).stroke();

  doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
     .text('ACADEMIC BLOCKCHAIN & AGENTIC CONSORTIUM', 40, 40, { align: 'center' });
  
  doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold')
     .text('Engineering Task Allocation & Work Breakdown Plan — 6 Groups (18 Contributors)', 40, 60, { align: 'center' });

  doc.fillColor(bodyTextColor).fontSize(7.5).font('Helvetica')
     .text('3-Organization Hyperledger Fabric 2.5 Consortium • IPFS Storage • Multi-Agent Automation Ecosystem', 40, 76, { align: 'center' });

  let currentY = 104;

  // Baseline & Workload Principle Box
  doc.rect(35, currentY, 525, 42).fill(lightBgColor);
  doc.rect(35, currentY, 525, 42).lineWidth(0.8).strokeColor(borderColor).stroke();

  doc.fillColor(darkTextColor).fontSize(8).font('Helvetica-Bold')
     .text('Project Baseline & Workload Distribution Principle:', 43, currentY + 6);
  doc.font('Helvetica').fillColor(bodyTextColor).fontSize(7.5)
     .text('All groups inherit the operational baseline (3-Org Fabric 2.5 network, IPFS cluster, base chaincode, REST API & Portal) and build outward. To maintain strict equality, every group is assigned a dedicated Blockchain deliverable alongside their specialized Agentic Module.', 43, currentY + 18, { width: 505 });

  currentY += 48;

  const page1Groups = [
    {
      title: 'Group 1: Academic Department Ecosystem & Decentralized Identity',
      tag: 'Org1MSP • Academic Dept • Stages 1-3',
      color: '#1e40af',
      members: [
        { name: 'Contributor 1.1 — Academic Chaincode Lead', bc: 'Enhances RegisterStudent and RequestCertificate chaincode functions with rich schema validation.', mod: 'Connects student registration and request submission API routes with prerequisite validation rules.' },
        { name: 'Contributor 1.2 — CouchDB State & Identity Lead', bc: 'Designs CouchDB0 rich query indexes for department data, manages Org1MSP cryptographic identities & TLS.', mod: 'Implements multi-level departmental approval pipeline (Faculty, HOD, DAC) in business layer.' },
        { name: 'Contributor 1.3 — Org 1 Academic Agent Lead', bc: 'Integrates Fabric Gateway Node SDK to submit signed Org1 transactions to peer0.org1:7051.', mod: 'Builds Org 1 Autonomous Department Agent auto-verifying credits, attendance & prerequisites for stages 1–3.' }
      ]
    },
    {
      title: 'Group 2: Autonomous Multi-Agent Inter-Organizational Verification & Consensus',
      tag: 'Multi-Org Endorsement • Agent Handshakes • Central Engine',
      color: '#0f766e',
      members: [
        { name: 'Contributor 2.1 — Inter-Org Consensus Chaincode Lead', bc: 'Implements state machine chaincode & enforces multi-org cryptographic endorsement policies on Fabric.', mod: 'Builds multi-organization transaction coordinator handling stage progression across Org1, Org2, Org3.' },
        { name: 'Contributor 2.2 — Cryptographic Handshake Protocol Engineer', bc: 'Implements cross-peer endorsement gathering & cryptographic signature validation from all 3 peer nodes.', mod: 'Develops Inter-Organizational Handshake Protocol for autonomous agents to exchange signed verification tokens.' },
        { name: 'Contributor 2.3 — Master Multi-Agent Orchestration Architect', bc: 'Anchors agent execution audit trails, timestamps, and consensus proofs directly onto the Fabric ledger.', mod: 'Builds Master Multi-Agent Orchestrator supporting 1-Click Autonomous Execution & reasoning audit logs.' }
      ]
    },
    {
      title: 'Group 3: Intelligent Fraud Detection, Anomaly Analysis & Security Engine',
      tag: 'On-Chain Invariants • Fraud Detection • Risk Engine',
      color: '#b45309',
      members: [
        { name: 'Contributor 3.1 — Ledger Invariant & State Auditor', bc: 'Develops chaincode audit functions to inspect historical ledger state for invariant violations and tampering.', mod: 'Connects backend fraud inspection triggers with live Fabric ledger query mechanisms.' },
        { name: 'Contributor 3.2 — Transcript Anomaly & Heuristics Lead', bc: 'Analyzes on-chain student transcript records to detect statistical grade inflation and CGPA spikes.', mod: 'Develops velocity anomaly rules (detecting request replay attacks, rapid submissions, collision checks).' },
        { name: 'Contributor 3.3 — Autonomous Fraud Scoring Lead', bc: 'Integrates smart contract quarantine flags to lock suspicious certificate requests on the Fabric ledger.', mod: 'Builds Autonomous Fraud Detection Agent and unified 0–100 Risk Engine (LOW, MEDIUM, HIGH, CRITICAL).' }
      ]
    }
  ];

  page1Groups.forEach((g) => {
    // Group Header Card
    doc.rect(35, currentY, 525, 18).fill(g.color);
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(g.title, 42, currentY + 4);
    doc.fontSize(7.5).font('Helvetica-Oblique').text(g.tag, 320, currentY + 5, { align: 'right', width: 230 });

    currentY += 18;

    const cardHeight = 78;
    doc.rect(35, currentY, 525, cardHeight).fill(lightBgColor);
    doc.rect(35, currentY, 525, cardHeight).lineWidth(0.8).strokeColor(borderColor).stroke();

    let memY = currentY + 3;
    g.members.forEach((m) => {
      doc.fillColor(darkTextColor).fontSize(7.5).font('Helvetica-Bold').text(m.name, 42, memY);
      doc.fillColor(highlightColor).fontSize(7).font('Helvetica-Bold').text('• Blockchain: ', 42, memY + 9);
      doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(m.bc, 96, memY + 9, { width: 455 });
      doc.fillColor('#d97706').fontSize(7).font('Helvetica-Bold').text('• Module/Agent: ', 42, memY + 16);
      doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(m.mod, 108, memY + 16, { width: 443 });
      memY += 24;
    });

    currentY += cardHeight + 8;
  });

  // Footer Page 1
  doc.fontSize(7).fillColor('#94a3b8').text('Academic Blockchain PBL — Work Breakdown Plan | Page 1 of 2', 35, 790, { align: 'center', width: 525 });

  // --- PAGE 2: GROUPS 4-6, MATRIX & PHASES ---
  doc.addPage();
  currentY = 30;

  const page2Groups = [
    {
      title: 'Group 4: Cryptographic Ledger Proofs, IPFS Storage & Verifiable QR Engine',
      tag: 'Ledger Proofs • IPFS Kubo • QR Security',
      color: '#047857',
      members: [
        { name: 'Contributor 4.1 — Ledger Hash Anchoring Engineer', bc: 'Implements chaincode functions to anchor IPFS CIDs and SHA-256 digests onto immutable Fabric ledger.', mod: 'Integrates IPFS Kubo node API (5001/8080) for decentralized PDF storage, automatic pinning, and retrieval.' },
        { name: 'Contributor 4.2 — Verifiable QR & PDF Cryptography Lead', bc: 'Encodes tamper-proof cryptographic metadata (Cert ID, IPFS CID, SHA-256, TxID) into QR payload.', mod: 'Generates official academic certificates with embedded verifiable QR codes using pdfkit & qrcode.' },
        { name: 'Contributor 4.3 — QR Scanner & Ledger Decryptor', bc: 'Implements backend QR verification endpoint (/api/verify/qr) cross-verifying QR against Fabric ledger.', mod: 'Builds browser-based live Camera & File QR Scanner supporting 1-click instant verification.' }
      ]
    },
    {
      title: 'Group 5: Ledger-Aware Conversational AI Assistant & Blockchain Event Hub',
      tag: 'Fabric Events • History Query • Chatbot Agent',
      color: '#6d28d9',
      members: [
        { name: 'Contributor 5.1 — Fabric Event & History Hub Specialist', bc: 'Implements Fabric Gateway gRPC event listeners (Block & Commit Listeners) and GetHistoryForKey query.', mod: 'Serializes raw blockchain history and transaction payloads into structured data for agent consumption.' },
        { name: 'Contributor 5.2 — Conversational NLP & Intent Engine Lead', bc: 'Maps natural language queries (e.g. "Check status of CERT-101") into blockchain query parameters.', mod: 'Implements Conversational AI Agent (Chatbot Engine) providing intelligent natural language explanations.' },
        { name: 'Contributor 5.3 — Chatbot Widget & Real-Time Client Lead', bc: 'Integrates real-time ledger updates into the chat context so the chatbot reflects live blockchain state.', mod: 'Builds responsive floating/docked Chatbot UI Widget with quick-action prompt chips & history.' }
      ]
    },
    {
      title: 'Group 6: Consortium Consensus, Health Monitoring & DevOps Orchestration',
      tag: 'Raft Consensus • Health Monitor • Master QA',
      color: '#be123c',
      members: [
        { name: 'Contributor 6.1 — Raft Consensus & Network Topology Engineer', bc: 'Manages Raft ordering service (7050), channel creation, and configtx.yaml consortium definitions.', mod: 'Ensures zero-downtime cross-platform Docker containerization across macOS and Ubuntu Linux.' },
        { name: 'Contributor 6.2 — Autonomous Health Monitoring Agent Lead', bc: 'Probes peer gRPC ports, orderer status, CouchDBs, IPFS, and cross-peer block height sync parity.', mod: 'Builds System Health Monitoring Agent with real-time telemetry dashboard & self-healing advice.' },
        { name: 'Contributor 6.3 — Full-Stack API Gateway & Master QA Lead', bc: 'Configures unified Fabric gateway connection pooling across all 3 orgs for Express backend.', mod: 'Builds master web portal navigation & automated integration test runner (test-flow.sh).' }
      ]
    }
  ];

  page2Groups.forEach((g) => {
    doc.rect(35, currentY, 525, 18).fill(g.color);
    doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text(g.title, 42, currentY + 4);
    doc.fontSize(7.5).font('Helvetica-Oblique').text(g.tag, 320, currentY + 5, { align: 'right', width: 230 });

    currentY += 18;

    const cardHeight = 78;
    doc.rect(35, currentY, 525, cardHeight).fill(lightBgColor);
    doc.rect(35, currentY, 525, cardHeight).lineWidth(0.8).strokeColor(borderColor).stroke();

    let memY = currentY + 3;
    g.members.forEach((m) => {
      doc.fillColor(darkTextColor).fontSize(7.5).font('Helvetica-Bold').text(m.name, 42, memY);
      doc.fillColor(highlightColor).fontSize(7).font('Helvetica-Bold').text('• Blockchain: ', 42, memY + 9);
      doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(m.bc, 96, memY + 9, { width: 455 });
      doc.fillColor('#d97706').fontSize(7).font('Helvetica-Bold').text('• Module/Agent: ', 42, memY + 16);
      doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(m.mod, 108, memY + 16, { width: 443 });
      memY += 24;
    });

    currentY += cardHeight + 8;
  });

  // Table Matrix
  currentY = drawSectionHeader('EQUAL WORKLOAD & DELIVERABLES MATRIX', currentY);

  doc.rect(35, currentY, 525, 15).fill('#e2e8f0');
  doc.rect(35, currentY, 525, 15).lineWidth(0.5).strokeColor(borderColor).stroke();
  doc.fillColor(darkTextColor).fontSize(7.5).font('Helvetica-Bold');
  doc.text('Group', 40, currentY + 4);
  doc.text('Focus Area', 85, currentY + 4);
  doc.text('Blockchain Deliverable', 170, currentY + 4);
  doc.text('Agentic / Module Deliverable', 360, currentY + 4);
  currentY += 15;

  const tableData = [
    { grp: 'Group 1', focus: 'Academic Org & Identity', bc: 'Stages 1-3 Chaincode & CouchDB0 Indexes', mod: 'Org 1 Autonomous Academic Agent' },
    { grp: 'Group 2', focus: 'Autonomous Agent Engine', bc: 'Multi-Org Endorsement Chaincode & Handshake', mod: 'Master Autonomous Multi-Agent Orchestrator' },
    { grp: 'Group 3', focus: 'Fraud Detection & Anomaly', bc: 'On-Chain Audit Invariants & State Hash Checks', mod: 'Autonomous Fraud Detection & 0-100 Risk Engine' },
    { grp: 'Group 4', focus: 'QR & Storage', bc: 'SHA-256 / CID Ledger Anchoring & Proofs', mod: 'Verifiable QR PDF Generator & Scanner' },
    { grp: 'Group 5', focus: 'Ledger NLP AI', bc: 'gRPC Event Subscriptions & GetHistoryForKey', mod: 'Conversational AI Chatbot & Intent Engine' },
    { grp: 'Group 6', focus: 'DevOps & Health', bc: 'Raft Consensus, Channel Topology & Sync', mod: 'Health Monitoring Agent & Master QA' }
  ];

  tableData.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    doc.rect(35, currentY, 525, 14).fill(bg);
    doc.rect(35, currentY, 525, 14).lineWidth(0.5).strokeColor(borderColor).stroke();

    doc.fillColor(primaryColor).fontSize(7).font('Helvetica-Bold').text(row.grp, 40, currentY + 3);
    doc.fillColor(darkTextColor).fontSize(7).font('Helvetica').text(row.focus, 85, currentY + 3);
    doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(row.bc, 170, currentY + 3);
    doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(row.mod, 360, currentY + 3);
    currentY += 14;
  });

  currentY += 8;

  // Phases
  currentY = drawSectionHeader('PROJECT PHASES & IMPLEMENTATION MILESTONES', currentY);

  const phases = [
    { phase: 'Phase 1: Baseline Network Validation', desc: 'Verify existing 3-Org Fabric network, cryptogen, channel participation, and IPFS node.' },
    { phase: 'Phase 2: Modular Expansion & Development', desc: 'Groups 1-6 concurrently develop their Blockchain methods and Agentic Modules.' },
    { phase: 'Phase 3: Master Integration & Control Center', desc: 'Bind all agent endpoints, QR scanner, Health telemetry, and Chatbot to master UI.' },
    { phase: 'Phase 4: Consortium Verification & Evaluation', desc: 'Execute master test suite (test-flow.sh) validating multi-agent handshakes & tamper-proofing.' }
  ];

  phases.forEach((p, idx) => {
    doc.rect(35, currentY, 525, 18).fill(lightBgColor);
    doc.rect(35, currentY, 525, 18).lineWidth(0.5).strokeColor(borderColor).stroke();
    doc.fillColor(primaryColor).fontSize(7.5).font('Helvetica-Bold').text(`${idx + 1}. ${p.phase}: `, 40, currentY + 4);
    const textWidth = doc.widthOfString(`${idx + 1}. ${p.phase}: `);
    doc.fillColor(bodyTextColor).fontSize(7).font('Helvetica').text(p.desc, 40 + textWidth, currentY + 4, { width: 510 - textWidth });
    currentY += 21;
  });

  // Footer Page 2
  doc.fontSize(7).fillColor('#94a3b8').text('Academic Blockchain PBL — Work Breakdown Plan | Page 2 of 2', 35, 790, { align: 'center', width: 525 });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

const outputPath = path.resolve(__dirname, '../../Academic_Blockchain_Project_Division_Plan.pdf');
buildPlanPDF(outputPath)
  .then((file) => {
    console.log(`PDF successfully generated at: ${file}`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error generating PDF:', err);
    process.exit(1);
  });
