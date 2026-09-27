'use strict';

const { execFile, exec } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const EventEmitter = require('events');
const util = require('util');
const grpc = require('@grpc/grpc-js');
const { connect, signers } = require('@hyperledger/fabric-gateway');
const execFilePromise = util.promisify(execFile);
const execPromise = util.promisify(exec);

const CHANNEL_NAME = process.env.CHANNEL_NAME || 'academicchannel';
const CHAINCODE_NAME = process.env.CHAINCODE_NAME || 'academic-contract';

const ORDERER_CA = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/academic.edu/orderers/orderer.academic.edu/msp/tlscacerts/tlsca.academic.edu-cert.pem';
const PEER1_CA = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.academic.edu/peers/peer0.org1.academic.edu/tls/ca.crt';
const PEER2_CA = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.academic.edu/peers/peer0.org2.academic.edu/tls/ca.crt';
const PEER3_CA = '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.academic.edu/peers/peer0.org3.academic.edu/tls/ca.crt';
const CRYPTO_ROOT = process.env.FABRIC_CRYPTO_ROOT || '/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto';
const EVENT_NAME = 'AcademicCertificateLifecycle';
const ledgerEvents = new EventEmitter();
const gateways = new Map();
let eventListenerStarted = false;
let eventListenerError = null;

function getOrgConfig(orgNum = 1) {
  const num = parseInt(orgNum, 10) || 1;
  const port = num === 1 ? 7051 : (num === 2 ? 8051 : 9051);
  return {
    msp: `Org${num}MSP`,
    address: `peer0.org${num}.academic.edu:${port}`,
    rootCert: `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${num}.academic.edu/peers/peer0.org${num}.academic.edu/tls/ca.crt`,
    mspPath: `/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org${num}.academic.edu/users/Admin@org${num}.academic.edu/msp`
  };
}

function getGatewayConfig(orgNum = 1) {
  const num = parseInt(orgNum, 10) || 1;
  const orgName = `org${num}.academic.edu`;
  const peerPort = num === 1 ? 7051 : (num === 2 ? 8051 : 9051);
  const orgRoot = `${CRYPTO_ROOT}/peerOrganizations/${orgName}`;
  const userRoot = `${orgRoot}/users/Admin@${orgName}`;
  const peerRoot = `${orgRoot}/peers/peer0.${orgName}`;
  const keyFile = fs.readdirSync(`${userRoot}/msp/keystore`).find((file) => file.endsWith('_sk'));
  const certificateFile = fs.readdirSync(`${userRoot}/msp/signcerts`).find((file) => file.endsWith('-cert.pem'));
  if (!keyFile || !certificateFile) {
    throw new Error(`Incomplete identity found for Admin@${orgName}`);
  }
  return {
    msp: `Org${num}MSP`,
    endpoint: `peer0.${orgName}:${peerPort}`,
    peerTlsRootCert: fs.readFileSync(`${peerRoot}/tls/ca.crt`),
    certificate: fs.readFileSync(`${userRoot}/msp/signcerts/${certificateFile}`),
    privateKey: fs.readFileSync(`${userRoot}/msp/keystore/${keyFile}`)
  };
}

function getGateway(orgNum = 1) {
  const num = parseInt(orgNum, 10) || 1;
  if (gateways.has(num)) {
    return gateways.get(num);
  }

  const config = getGatewayConfig(num);
  const client = new grpc.Client(
    config.endpoint,
    grpc.credentials.createSsl(config.peerTlsRootCert),
    { 'grpc.ssl_target_name_override': `peer0.org${num}.academic.edu` }
  );
  const gateway = connect({
    client,
    identity: { mspId: config.msp, credentials: config.certificate },
    signer: signers.newPrivateKeySigner(crypto.createPrivateKey(config.privateKey)),
    evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
    endorseOptions: () => ({ deadline: Date.now() + 15000 }),
    submitOptions: () => ({ deadline: Date.now() + 15000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 15000 })
  });
  gateways.set(num, { gateway, client });
  return gateways.get(num);
}

function parseGatewayResult(result) {
  const value = Buffer.from(result).toString('utf8');
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
}

async function queryGateway(functionName, args = [], orgNum = 1) {
  const { gateway } = getGateway(orgNum);
  const network = gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);
  return parseGatewayResult(await contract.evaluateTransaction(functionName, ...args.map(String)));
}

async function getCertificateHistory(key, orgNum = 1) {
  return queryGateway('GetHistoryForKey', [key], orgNum);
}

function normalizeContractEvent(event) {
  let payload = Buffer.from(event.payload || []).toString('utf8');
  try {
    payload = JSON.parse(payload);
  } catch (error) {
    // Preserve non-JSON event payloads for consumers.
  }
  return {
    type: 'chaincode',
    eventName: event.eventName,
    transactionId: event.transactionId,
    blockNumber: event.blockNumber !== undefined ? Number(event.blockNumber) : null,
    payload,
    receivedAt: new Date().toISOString()
  };
}

function normalizeBlockEvent(block) {
  const header = block.getHeader();
  return {
    type: 'block',
    eventName: 'FabricBlockCommitted',
    transactionId: null,
    blockNumber: Number(header.getNumber()),
    payload: {
      dataHash: Buffer.from(header.getDataHash_asU8()).toString('hex'),
      previousHash: Buffer.from(header.getPreviousHash_asU8()).toString('hex')
    },
    receivedAt: new Date().toISOString()
  };
}

async function startEventListener(orgNum = 1) {
  if (eventListenerStarted) return;
  try {
    const { gateway } = getGateway(orgNum);
    const network = gateway.getNetwork(CHANNEL_NAME);

    const chaincodeEvents = await network.getChaincodeEvents(CHAINCODE_NAME);
    const blockEvents = await network.getBlockEvents();
    eventListenerStarted = true;
    eventListenerError = null;

    (async () => {
      try {
        for await (const event of chaincodeEvents) {
          if (event.eventName === EVENT_NAME) {
            ledgerEvents.emit('event', normalizeContractEvent(event));
          }
        }
      } catch (error) {
        eventListenerError = error.message;
        console.error(`[Fabric Events] Chaincode event stream stopped: ${error.message}`);
      } finally {
        chaincodeEvents.close();
      }
    })();

    (async () => {
      try {
        for await (const block of blockEvents) {
          ledgerEvents.emit('event', normalizeBlockEvent(block));
        }
      } catch (error) {
        eventListenerError = error.message;
        console.error(`[Fabric Events] Block event stream stopped: ${error.message}`);
      } finally {
        blockEvents.close();
      }
    })();
  } catch (error) {
    eventListenerError = error.message;
    throw error;
  }
}

function getEventStatus() {
  return {
    started: eventListenerStarted,
    eventName: EVENT_NAME,
    error: eventListenerError
  };
}

function onLedgerEvent(listener) {
  ledgerEvents.on('event', listener);
  return () => ledgerEvents.off('event', listener);
}

/**
 * Execute peer chaincode invoke via CLI container with direct argv (no shell escaping issues).
 * Endorses across all 3 Orgs to satisfy consortium endorsement policy.
 */
async function invokeChaincode(functionName, args = [], orgNum = 1) {
  const org = getOrgConfig(orgNum);
  const ctorJson = JSON.stringify({
    function: functionName,
    Args: args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
  });

  const cmdArgs = [
    'exec',
    '-e', `CORE_PEER_LOCALMSPID=${org.msp}`,
    '-e', `CORE_PEER_TLS_ROOTCERT_FILE=${org.rootCert}`,
    '-e', `CORE_PEER_MSPCONFIGPATH=${org.mspPath}`,
    '-e', `CORE_PEER_ADDRESS=${org.address}`,
    'cli',
    'peer', 'chaincode', 'invoke',
    '-o', 'orderer.academic.edu:7050',
    '--ordererTLSHostnameOverride', 'orderer.academic.edu',
    '--tls',
    '--cafile', ORDERER_CA,
    '-C', CHANNEL_NAME,
    '-n', CHAINCODE_NAME,
    '--peerAddresses', 'peer0.org1.academic.edu:7051', '--tlsRootCertFiles', PEER1_CA,
    '--peerAddresses', 'peer0.org2.academic.edu:8051', '--tlsRootCertFiles', PEER2_CA,
    '--peerAddresses', 'peer0.org3.academic.edu:9051', '--tlsRootCertFiles', PEER3_CA,
    '-c', ctorJson,
    '--waitForEvent'
  ];

  try {
    const { stdout, stderr } = await execFilePromise('docker', cmdArgs);
    const combined = stdout + '\n' + stderr;

    const match = combined.match(/payload:"([^"]+)"/);
    if (match && match[1]) {
      try {
        const decoded = Buffer.from(match[1], 'utf8').toString();
        return JSON.parse(decoded);
      } catch (e) {
        return match[1];
      }
    }

    if (combined.includes('status:200') || combined.includes('SUCCESS') || combined.includes('VALID')) {
      return { status: 200, message: 'Transaction successfully submitted and committed to ledger' };
    }

    return { stdout, stderr };
  } catch (error) {
    console.error(`Error invoking chaincode ${functionName}:`, error.message);
    throw new Error(`Chaincode invocation failed: ${error.message}`);
  }
}

/**
 * Execute peer chaincode query via CLI container.
 */
async function queryChaincode(functionName, args = [], orgNum = 1) {
  try {
    return await queryGateway(functionName, args, orgNum);
  } catch (error) {
    console.error(`Error querying chaincode ${functionName}:`, error.message);
    throw new Error(`Chaincode query failed: ${error.message}`);
  }
}

/**
 * Check Fabric Network Health across all 3 Orgs and Orderer.
 */
async function checkNetworkHealth() {
  try {
    const { stdout } = await execPromise('docker ps --format "{{.Names}}\t{{.Status}}"');
    const lines = stdout.split('\n').filter(Boolean);
    const containers = {};

    lines.forEach(line => {
      const [name, status] = line.split('\t');
      containers[name] = status;
    });

    const expected = [
      'orderer.academic.edu',
      'peer0.org1.academic.edu',
      'peer0.org2.academic.edu',
      'peer0.org3.academic.edu',
      'couchdb0',
      'couchdb1',
      'couchdb2',
      'ipfs-node',
      'cli'
    ];

    const health = {};
    let allUp = true;
    for (const name of expected) {
      const isUp = containers[name] && containers[name].startsWith('Up');
      health[name] = {
        name,
        status: isUp ? 'UP' : 'DOWN',
        detail: containers[name] || 'Not running'
      };
      if (!isUp) allUp = false;
    }

    return {
      allHealthy: allUp,
      containers: health
    };
  } catch (error) {
    return {
      allHealthy: false,
      error: error.message
    };
  }
}

module.exports = {
  invokeChaincode,
  queryChaincode,
  getCertificateHistory,
  startEventListener,
  onLedgerEvent,
  getEventStatus,
  checkNetworkHealth
};
