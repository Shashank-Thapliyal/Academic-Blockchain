# Academic Blockchain PBL — 3-Organization Architecture

A tamper-evident academic certificate issuance, verification, and revocation system built on **Hyperledger Fabric 2.5 (LTS)** and **IPFS**, containerized with **Docker** for complete cross-platform portability between **macOS** (Apple Silicon / Intel) and **Ubuntu Linux**.

---

## 🏛️ Architecture Overview

The network is governed by a **3-Organization Consortium** operating on a shared channel (`academicchannel`) with **Raft** crash fault-tolerant ordering:

```
+-----------------------------------------------------------------------------------+
|                           ACADEMIC BLOCKCHAIN CONSORTIUM                          |
|                                                                                   |
|  +------------------------+  +------------------------+  +---------------------+  |
|  |         Org 1          |  |         Org 2          |  |        Org 3        |  |
|  |  University / Faculty  |  |   Examination Board    |  |  Admin & Verifier   |  |
|  +------------------------+  +------------------------+  +---------------------+  |
|  | • peer0.org1:7051      |  | • peer0.org2:8051      |  | • peer0.org3:9051   |  |
|  | • CouchDB0: 5984       |  | • CouchDB1: 6984       |  | • CouchDB2: 7984    |  |
|  | • MSP: Org1MSP         |  | • MSP: Org2MSP         |  | • MSP: Org3MSP      |  |
|  | • Faculty/HOD/DAC      |  | • Exam Grade Lockdown  |  | • Dean/Admin/Issue  |  |
|  +------------------------+  +------------------------+  +---------------------+  |
|               \                          |                         /              |
|                \                         |                        /               |
|                 +------------------------------------------------+                |
|                 |     Channel: academicchannel (Fabric 2.5)      |                |
|                 +------------------------------------------------+                |
|                                          |                                        |
|                 +------------------------------------------------+                |
|                 | Raft Consensus: orderer.academic.edu:7050      |                |
|                 | Decentralized Storage: ipfs-node:5001 / 8080   |                |
|                 +------------------------------------------------+                |
+-----------------------------------------------------------------------------------+
```

### The 4 Modules (Preserving the Baseline)

| Module | Component | Description & Responsibilities |
|---|---|---|
| **Module 1** | **Registration & Requests** | Student onboarding (`RegisterStudent`), request submission (`RequestCertificate`), profile validation. |
| **Module 2** | **7-Stage Approval Workflow** | State machine enforced by smart contract across organizations: `SUBMITTED` → `FACULTY_APPROVED` → `HOD_APPROVED` → `DAC_APPROVED` (Org 1) → `EXAM_LOCKED` (Org 2) → `DEAN_APPROVED` → `ADMIN_FINALIZED` (Org 3). |
| **Module 3** | **PDF & IPFS Storage** | Generates official certificate PDF, uploads to IPFS Kubo node, retrieves IPFS CID, and computes SHA-256 fingerprint. |
| **Module 4** | **Distributed Fabric Network** | Anchors CID and SHA-256 onto Fabric ledger. Powers public verification (`VERIFIED` / `REVOKED` / `INVALID`) and immutable revocation. |

---

## 🚀 Quick Start (macOS & Ubuntu)

### Prerequisites
- **Docker** (v24.0+ or Docker Desktop)
- **Docker Compose** (v2.20+)
- **Git**

No host Fabric binaries (`cryptogen`, `configtxgen`) or Go compiler are required on your host machine — all cryptographic tools and chaincode packaging run inside official Docker containers.

### 1. Clone & Start the Project
```bash
git clone <repo-url> "Academic Blockchain"
cd "Academic Blockchain"

# One-command startup (Generates crypto, boots 3-Org network, channel, chaincode, API & UI)
./start.sh
```

### 2. Access the Applications
- **Web Verification & Management Portal**: [http://localhost:3000](http://localhost:3000)
- **Backend REST API**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Local IPFS Gateway**: [http://localhost:8080](http://localhost:8080)

---

## 🧪 Automated Testing

Execute the complete end-to-end integration test exercising all 4 modules (Student onboarding → 7-stage approval workflow → PDF generation → IPFS CID upload → Fabric commit → Verification → Revocation):

```bash
./test-flow.sh
```

---

## 💻 Running on Ubuntu Linux

Because this folder is shared with or cloned to an Ubuntu machine, the project is pre-configured with:
1. `.gitattributes` enforcing Unix LF line endings across all shell scripts and YAML files.
2. Official multi-arch Docker images (`linux/amd64` and `linux/arm64`).
3. Zero host binary dependencies (all crypto and channel tools run in Docker).

To run on Ubuntu:
```bash
# Ensure Docker service is running and user is in docker group
sudo usermod -aG docker $USER
newgrp docker

# Run the master start script
./start.sh
```

---

## 🛠️ Individual Network Operations

| Command | Action |
|---|---|
| `./start.sh` | Bring up entire 3-org stack, channel, chaincode, API, and UI |
| `./stop.sh` | Tear down all containers, volumes, and networks cleanly |
| `./test-flow.sh` | Run automated end-to-end test suite |
| `./network/network.sh status` | View container health across all 3 organizations |
| `./network/network.sh down` | Stop only the Fabric network and IPFS infrastructure |
| `./network/network.sh up` | Start only the Fabric network and deploy chaincode |

---

## 📁 Repository Structure

```
Academic Blockchain/
├── .gitattributes              # Guarantees LF line endings on Mac & Linux
├── start.sh                    # One-command master runner
├── stop.sh                     # Clean shutdown script
├── test-flow.sh                # End-to-end automated test runner
├── README.md                   # Documentation and runbook
├── docker/
│   ├── docker-compose-net.yaml # Orderer, Org1, Org2, Org3, CouchDBs, IPFS, CLI
│   ├── docker-compose-app.yaml # Express Backend API & Frontend Portal
│   └── configtx/
│       └── configtx.yaml       # Channel, consortium & Raft ordering spec
├── network/
│   ├── crypto-config.yaml      # 3-Org cryptographic identities
│   ├── network.sh              # Network manager (up, down, status)
│   └── scripts/
│       ├── envVar.sh           # Organization CLI environment loader
│       ├── generate-crypto.sh  # Dockerized cryptogen & genesis block builder
│       ├── create-channel.sh   # Channel participation join script
│       └── deploy-chaincode.sh # Fabric 2.5 chaincode lifecycle script
├── chaincode/
│   └── academic-contract/      # Smart contract implementing 7-stage lifecycle
│       ├── package.json
│       └── index.js
├── backend/                    # Express REST API
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── fabric.js           # Hyperledger Fabric ledger client
│       ├── ipfs.js             # IPFS Kubo client & SHA-256 calculation
│       ├── pdf.js              # Academic Certificate PDF generator
│       └── server.js           # REST endpoints
└── frontend/                   # Web Verification & Management Portal
    ├── Dockerfile
    ├── server.js
    └── public/
        ├── index.html          # Interactive UI
        ├── app.js              # Workflow stepper, IPFS & Verification logic
        └── styles.css          # Responsive dashboard styles
```
