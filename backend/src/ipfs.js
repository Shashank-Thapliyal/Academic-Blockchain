'use strict';

const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const IPFS_HOST = process.env.IPFS_HOST || 'ipfs-node';
const IPFS_API_PORT = process.env.IPFS_API_PORT || '5001';
const IPFS_GATEWAY_PORT = process.env.IPFS_GATEWAY_PORT || '8080';

const IPFS_API_URL = `http://${IPFS_HOST}:${IPFS_API_PORT}/api/v0`;
const IPFS_GATEWAY_URL = `http://${IPFS_HOST}:${IPFS_GATEWAY_PORT}/ipfs`;

/**
 * Compute SHA-256 checksum of a buffer.
 * @param {Buffer} buffer
 * @returns {string} Hexadecimal SHA-256 hash
 */
function calculateSHA256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Upload buffer to IPFS node via Kubo HTTP API.
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {Promise<{ cid: string, size: number, sha256: string }>}
 */
async function uploadToIPFS(buffer, filename = 'certificate.pdf') {
  const sha256 = calculateSHA256(buffer);

  try {
    const formData = new FormData();
    formData.append('file', buffer, { filename });

    const response = await axios.post(`${IPFS_API_URL}/add?pin=true`, formData, {
      headers: {
        ...formData.getHeaders()
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 10000
    });

    const cid = response.data.Hash;
    const size = parseInt(response.data.Size, 10);

    return {
      cid,
      size,
      sha256,
      gatewayUrl: `${IPFS_GATEWAY_URL}/${cid}`
    };
  } catch (error) {
    console.warn(`[IPFS] Failed to upload to IPFS daemon (${error.message}). Using simulated local CID fallback.`);
    // Deterministic CID fallback if IPFS daemon is starting or not reachable yet
    const fallbackCid = `Qm${crypto.createHash('sha256').update(buffer).digest('hex').substring(0, 44)}`;
    return {
      cid: fallbackCid,
      size: buffer.length,
      sha256,
      gatewayUrl: `http://localhost:8080/ipfs/${fallbackCid}`,
      simulated: true
    };
  }
}

/**
 * Fetch file buffer from IPFS by CID.
 * @param {string} cid
 * @returns {Promise<Buffer>}
 */
async function fetchFromIPFS(cid) {
  try {
    const response = await axios.post(`${IPFS_API_URL}/cat?arg=${cid}`, null, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    return Buffer.from(response.data);
  } catch (error) {
    throw new Error(`Failed to fetch CID ${cid} from IPFS: ${error.message}`);
  }
}

/**
 * Check IPFS daemon health.
 */
async function checkIPFSHealth() {
  try {
    const response = await axios.post(`${IPFS_API_URL}/version`, null, { timeout: 3000 });
    return {
      status: 'UP',
      version: response.data.Version,
      commit: response.data.Commit
    };
  } catch (error) {
    return {
      status: 'DOWN',
      error: error.message
    };
  }
}

module.exports = {
  calculateSHA256,
  uploadToIPFS,
  fetchFromIPFS,
  checkIPFSHealth,
  IPFS_GATEWAY_URL
};
