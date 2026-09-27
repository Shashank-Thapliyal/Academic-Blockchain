# Academic Blockchain & Multi-Agent Consortium — Work Breakdown & Task Allocation Plan

> **System Architecture**: 3-Organization Hyperledger Fabric 2.5 Consortium • IPFS Decentralized Storage • Multi-Agent Automation Ecosystem  
> **Team Structure**: 6 Specialized Engineering Groups × 3 Contributors per Group = **18 Total Contributors**  
> **Baseline Starting Point**: Pre-existing 3-Org Fabric network, IPFS Kubo storage node, 7-stage chaincode state machine, Express REST API, and base Web portal.

---

## 🧭 Executive Architecture & Task Distribution Matrix

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                              CONSORTIUM TEAM ALLOCATION MATRIX                                          |
+------------------------------------+---------------------------------------+--------------------------------------------+
| Group 1: Academic Org & Identity   | Group 2: Autonomous Agentic Engine    | Group 3: Fraud Detection & Anomaly Intel   |
| [Blockchain: Org1 DID & Indexing]  | [Blockchain: Multi-Org Endorsement]   | [Blockchain: Ledger Invariants & Audit]    |
| • 1.1: Academic Chaincode Lead     | • 2.1: Inter-Org Consensus Chaincode  | • 3.1: On-Chain Audit & State Invariants   |
| • 1.2: CouchDB Query & MSP Lead    | • 2.2: Cryptographic Handshake Engine | • 3.2: Transcript Anomaly Heuristics Lead  |
| • 1.3: Org 1 Academic Agent Lead   | • 2.3: Master Multi-Agent Orchestrator| • 3.3: Autonomous Fraud Scoring Lead       |
+------------------------------------+---------------------------------------+--------------------------------------------+
| Group 4: Cryptographic QR & IPFS   | Group 5: Ledger AI Assistant & Events | Group 6: Consensus, Health & Master DevOps |
| [Blockchain: CID & SHA-256 Anchor] | [Blockchain: gRPC Events & History]   | [Blockchain: Raft & Block Parity Sync]     |
| • 4.1: Ledger Anchoring Engineer   | • 5.1: Fabric Event & History Hub     | • 6.1: Raft Consensus & Channel Topology  |
| • 4.2: Verifiable QR PDF Lead      | • 5.2: Conversational NLP Engine Lead | • 6.2: Autonomous Health Monitoring Lead   |
| • 4.3: QR Scanner & Ledger Decrypt | • 5.3: Chatbot Client & Streamer Lead | • 6.3: API Gateway & Automated Test Lead   |
+------------------------------------+---------------------------------------+--------------------------------------------+
```

---

## 👥 Detailed Group Task Allocation

---

### 🏛️ Group 1: Academic Department Ecosystem & Decentralized Identity
**Core Focus**: University / Faculty Organization (`Org1MSP`), Academic Chaincode enhancement, and Departmental Autonomous Agent.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 1.1** | **Academic Chaincode Engineer** | • Upgrades baseline `RegisterStudent` and `RequestCertificate` chaincode functions with rich schema validation and student identity lifecycle management.<br>• Implements student profile access control based on Org1MSP client identity. | • Integrates student onboarding and certificate request submission REST API endpoints.<br>• Implements departmental prerequisite and course completion verification rules. |
| **Contributor 1.2** | **CouchDB State & Identity Lead** | • Designs CouchDB rich query indexes (`couchdb0`) for department-wise student filtering, course cataloging, and enrollment history.<br>• Manages Org1MSP cryptographic certificates, CA configuration, and TLS identities. | • Implements business logic for multi-tier departmental approvals (`FACULTY_APPROVED` → `HOD_APPROVED` → `DAC_APPROVED`). |
| **Contributor 1.3** | **Org 1 Academic Agent Lead** | • Integrates the Fabric Gateway SDK to construct and submit cryptographically signed Org1 transactions to `peer0.org1:7051`. | • Builds the **Org 1 Autonomous Academic Agent** that automatically audits student credits, minimum attendance, and prerequisite fulfillment to trigger stage 1–3 approvals. |

---

### ⚡ Group 2: Autonomous Multi-Agent Inter-Organizational Verification & Consensus Engine
**Core Focus**: Multi-Organization Endorsement Policies, Cross-Org Chaincode State Machine Transitions, and Master Agent Orchestration.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 2.1** | **Inter-Org Consensus Chaincode Lead** | • Enhances the smart contract state machine across all 7 stages (`SUBMITTED` → `FACULTY` → `HOD` → `DAC` → `EXAM_LOCKED` → `DEAN` → `ADMIN_FINALIZED`).<br>• Enforces Hyperledger Fabric endorsement policies requiring multi-organization cryptographic endorsement signatures before state commits. | • Builds the multi-organization transaction coordinator service handling stage progression requests across Org1, Org2, and Org3. |
| **Contributor 2.2** | **Cryptographic Handshake & Protocol Engineer** | • Implements cross-peer endorsement gathering from `peer0.org1:7051`, `peer0.org2:8051`, and `peer0.org3:9051`.<br>• Implements cryptographic signature validation on transaction proposals and peer endorsements. | • Develops the **Inter-Organizational Agentic Handshake Protocol**, enabling autonomous agents from Org 1, Org 2, and Org 3 to exchange signed verification tokens and negotiation messages. |
| **Contributor 2.3** | **Master Multi-Agent Orchestration Architect** | • Implements on-chain audit trails for agent-executed transactions, storing agent IDs, execution timestamps, and consensus proofs on the Fabric ledger. | • Builds the **Master Multi-Agent Orchestration Engine** supporting both 1-Click Fully Autonomous Multi-Org Pipeline Execution and Step-by-Step Collaborative Mode with detailed reasoning logs. |

---

### 🛡️ Group 3: Intelligent Fraud Detection, Anomaly Analysis & Security Engine
**Core Focus**: On-chain audit trail verification, transcript consistency validation, and AI/heuristic fraud detection.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 3.1** | **Ledger Invariant & State Auditor** | • Develops chaincode audit functions to inspect historical ledger states for invariant violations, unauthorized state jumps, and retroactive certificate modifications.<br>• Implements cryptographic tamper detection comparing on-chain state hashes. | • Connects backend fraud inspection triggers with live ledger query mechanisms. |
| **Contributor 3.2** | **Transcript Anomaly & Heuristic Analyst** | • Analyzes on-chain student transcript records to detect statistical grade inflation, impossible CGPA spikes, and degree mismatch anomalies. | • Implements velocity anomaly rules (detecting request replay attacks, rapid concurrent submissions, and student identity collisions). |
| **Contributor 3.3** | **Autonomous Fraud Scoring Lead** | • Integrates smart contract quarantine flags to lock suspicious certificate requests on the Fabric ledger upon detection. | • Builds the **Autonomous Fraud Detection Agent** and the unified **0–100 Fraud Risk Scoring Engine** categorizing risk into `LOW`, `MEDIUM`, `HIGH`, and `CRITICAL` with automated quarantine alerts. |

---

### 📷 Group 4: Cryptographic Ledger Proofs, IPFS Storage & Verifiable QR Engine
**Core Focus**: On-chain SHA-256 & CID anchoring, decentralized IPFS cluster integration, and verifiable high-density QR PDF generation.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 4.1** | **Ledger Hash Anchoring Engineer** | • Implements chaincode methods to anchor IPFS CIDs and SHA-256 document digests directly onto the immutable Fabric state ledger.<br>• Enforces cryptographic proof immutability and anchors transaction commit proofs. | • Integrates the IPFS Kubo node API (`5001`/`8080`) for decentralized PDF storage, automatic pinning, and CID retrieval. |
| **Contributor 4.2** | **Verifiable QR & PDF Cryptography Lead** | • Encodes tamper-proof cryptographic metadata (Certificate ID, Student ID, IPFS CID, SHA-256 Hash, Issuance Timestamp, Fabric TxID) into a high-density QR payload. | • Generates official academic certificates with embedded verifiable QR codes using `pdfkit` and `qrcode`. |
| **Contributor 4.3** | **QR Scanner & Cryptographic Decryptor** | • Implements backend QR verification endpoints (`/api/verify/qr`) cross-referencing extracted QR payloads against Fabric ledger state and IPFS hashes. | • Builds the browser-based **QR Scanner Module** (supporting real-time camera capture and drag-and-drop certificate image/PDF verification). |

---

### 💬 Group 5: Ledger-Aware Conversational AI Assistant & Blockchain Event Hub
**Core Focus**: Fabric Gateway gRPC event subscriptions, block/history querying, and natural language conversational intelligence.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 5.1** | **Fabric Event & History Hub Specialist** | • Implements Fabric Gateway gRPC event listeners (Block Listener, Transaction Commit Listener).<br>• Develops chaincode history query wrapper (`GetHistoryForKey`) to extract the complete modification timeline of any certificate. | • Serializes raw blockchain history and transaction payloads into structured data for agent consumption. |
| **Contributor 5.2** | **Conversational NLP & Intent Engine Lead** | • Maps natural language queries (e.g. *"Show certificate status for CERT-101"*, *"Who approved this degree?"*) into blockchain query parameters. | • Implements the **Conversational AI Agent (Chatbot Engine)** providing intelligent, context-aware explanations of ledger transactions and approval workflows. |
| **Contributor 5.3** | **Chatbot Widget & Real-Time Client Engineer** | • Integrates real-time ledger updates into the chat context so the chatbot reflects live blockchain state. | • Builds the responsive floating/docked **Chatbot UI Widget** with quick-action prompt chips, streaming responses, and transaction visualizers. |

---

### ⚙️ Group 6: Consortium Consensus, Health Monitoring & DevOps Orchestration
**Core Focus**: Raft Consensus ordering, multi-peer synchronization, real-time diagnostic agent, and master integration QA.

| Contributor | Designation | Blockchain Deliverable | Module / Agentic Deliverable |
|---|---|---|---|
| **Contributor 6.1** | **Raft Consensus & Network Topology Engineer** | • Manages the Raft ordering service (`orderer.academic.edu:7050`), channel creation (`academicchannel`), and `configtx.yaml` consortium definitions.<br>• Configures multi-org cryptographic identity generation (`cryptogen`). | • Ensures zero-downtime cross-platform Docker containerization across macOS and Ubuntu Linux. |
| **Contributor 6.2** | **Autonomous Health Monitoring Agent Lead** | • Probes peer gRPC ports (`peer0.org1:7051`, `peer0.org2:8051`, `peer0.org3:9051`), orderer status, CouchDBs, and IPFS cluster.<br>• Implements cross-peer block height synchronization checks. | • Builds the **System Health Monitoring Agent** with real-time telemetry dashboards, latency trackers, and automated self-healing recommendations. |
| **Contributor 6.3** | **Full-Stack API Gateway & Master QA Lead** | • Configures unified Fabric gateway connection pooling across all 3 organizations for the Express backend. | • Builds the master web portal navigation and develops the master end-to-end automated test runner (`test-flow.sh`) validating all 5 modules across the consortium. |

---

## 📊 Summary Matrix: Workload & Deliverable Parity

| Group # | Group Title | Blockchain Deliverable | Agentic / Module Deliverable | Key Files Involved |
|:---:|:---|:---|:---|:---|
| **Group 1** | Academic Org & Identity | Stages 1–3 Chaincode & CouchDB0 Rich Indexes | Org 1 Autonomous Department Agent | `chaincode/.../index.js`, `backend/src/agents/orgAgents.js` |
| **Group 2** | Autonomous Agentic Engine | Multi-Org Endorsement Chaincode & Handshake | Master Autonomous Multi-Agent Orchestrator | `chaincode/.../index.js`, `backend/src/agents/orchestrator.js` |
| **Group 3** | Fraud Detection & Anomaly | On-Chain Audit Invariants & State Hash Checks | Autonomous Fraud Detection & 0–100 Risk Engine | `chaincode/.../index.js`, `backend/src/agents/fraudAgent.js` |
| **Group 4** | Cryptographic QR & IPFS | SHA-256 / CID Ledger Anchoring & Proofs | Verifiable QR PDF Generator & Scanner | `backend/src/pdf.js`, `backend/src/ipfs.js`, `frontend/public/app.js` |
| **Group 5** | Ledger AI Assistant | gRPC Event Subscriptions & `GetHistoryForKey` | Conversational AI Chatbot & Intent Engine | `backend/src/fabric.js`, `backend/src/agents/chatAgent.js` |
| **Group 6** | Consensus, Health & DevOps | Raft Consensus, Channel Topology & Sync Parity | Network Health Monitoring Agent & Master QA | `docker/...`, `backend/src/agents/healthAgent.js`, `test-flow.sh` |

---

## 📅 Project Execution Phases

1. **Phase 1 — Baseline Network Validation** (Verify existing 3-Org Fabric network, cryptogen, channel participation, and IPFS node).
2. **Phase 2 — Modular Expansion & Development** (Groups 1–6 concurrently develop their Blockchain methods and Agentic Modules).
3. **Phase 3 — Master Integration & Control Center** (Bind all agent endpoints, QR scanner, Health telemetry, and Chatbot to master UI).
4. **Phase 4 — Consortium Verification & Evaluation** (Execute `test-flow.sh`, evaluate performance, and demonstrate end-to-end multi-agent verification).
