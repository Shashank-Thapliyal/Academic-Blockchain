// Blockchain Error Sanitizer
// Strips low-level Docker exec commands and environment variables,
// extracting clear, human-readable reasons for users.

export function parseBlockchainError(rawError) {
  if (!rawError) return "An unexpected blockchain error occurred.";
  
  let str = "";
  if (typeof rawError === "string") {
    str = rawError;
  } else if (rawError.error && typeof rawError.error === "string") {
    str = rawError.error;
  } else if (rawError.message && typeof rawError.message === "string") {
    str = rawError.message;
  } else {
    try {
      str = JSON.stringify(rawError);
    } catch (e) {
      str = String(rawError);
    }
  }

  // 1. Look for explicit chaincode 500 / error messages from peer
  // Examples:
  // "Error: chaincode response 500, Certificate CERT-2024-1872 already exists"
  // "status: 500, message: \"Student with ID STU-1 already exists\""
  const chaincodeMatch = str.match(/chaincode response \d+,\s*([^\r\n\x22\x27\x60]+)/i);
  if (chaincodeMatch && chaincodeMatch[1]) {
    return cleanSentence(chaincodeMatch[1]);
  }

  const statusMsgMatch = str.match(/(?:status:\s*\d+,\s*message:\s*[\x22\x27])([^\x22\x27\r\n]+)/i);
  if (statusMsgMatch && statusMsgMatch[1]) {
    return cleanSentence(statusMsgMatch[1]);
  }

  // 2. Specific domain & workflow patterns
  if (str.includes("already been revoked") || str.includes("already revoked")) {
    const certMatch = str.match(/Certificate\s+([A-Z0-9_-]+)/i);
    return certMatch 
      ? `Certificate ${certMatch[1]} has already been permanently revoked on the blockchain.`
      : "This certificate has already been revoked on the blockchain.";
  }

  if (str.includes("already exists") || str.includes("already registered")) {
    const stuMatch = str.match(/Student\s+(?:with\s+ID\s+)?([A-Z0-9_-]+)/i);
    if (stuMatch) return `Student ${stuMatch[1]} already exists on the ledger.`;

    const reqMatch = str.match(/Request\s+(?:with\s+ID\s+)?([A-Z0-9_-]+)/i);
    if (reqMatch) return `Request ${reqMatch[1]} already exists on the blockchain.`;

    const certMatch = str.match(/Certificate\s+([A-Z0-9_-]+)/i);
    if (certMatch) return `Certificate ${certMatch[1]} already exists on the ledger.`;

    const genericMatch = str.match(/([A-Z0-9_-]+)\s+already exists/i);
    return genericMatch 
      ? `Record ${genericMatch[1]} already exists on the ledger.`
      : "This record already exists on the blockchain.";
  }

  if (str.includes("already issued") || str.includes("already finalized")) {
    return "This request has already been issued as a certificate and cannot be modified.";
  }

  if (str.includes("not in ADMIN_FINALIZED status")) {
    return "Cannot issue certificate: The workflow request has not reached the required ADMIN_FINALIZED stage yet.";
  }

  if (str.includes("Invalid stage transition") || str.includes("Illegal stage transition")) {
    const detail = str.match(/Invalid stage transition[^\r\n.,]*/i);
    return detail 
      ? cleanSentence(detail[0])
      : "Invalid stage transition: The request is not in the correct pending state for this action.";
  }

  if (str.includes("does not exist") || str.includes("not found") || str.includes("is not registered")) {
    const stuMatch = str.match(/Student\s+([A-Z0-9_-]+)/i);
    if (stuMatch) return `Student ${stuMatch[1]} is not registered on the ledger.`;

    const reqMatch = str.match(/(?:Certificate\s+request|Request)\s+([A-Z0-9_-]+)/i);
    if (reqMatch) return `Certificate request ${reqMatch[1]} does not exist on the ledger.`;

    const certMatch = str.match(/Certificate\s+([A-Z0-9_-]+)/i);
    if (certMatch) return `Certificate ${certMatch[1]} does not exist on the ledger.`;

    return "The requested record was not found on the Hyperledger Fabric ledger.";
  }

  if (str.includes("endorsement policy") || str.includes("failed to collect enough endorsements")) {
    return "Consortium Endorsement Policy Failure: One or more organization peers rejected the transaction endorsement.";
  }

  if (str.includes("MVCC_READ_CONFLICT")) {
    return "Concurrency Conflict (MVCC): Multiple ledger updates collided. Please retry the operation.";
  }

  if (str.includes("access denied") || str.includes("unauthorized") || str.includes("permission denied")) {
    return "Access Denied: The caller organization MSP does not have permission for this workflow action.";
  }

  if (str.includes("ECONNREFUSED") || str.includes("Failed to connect") || str.includes("Network error")) {
    return "Consortium Network Error: Could not connect to the Fabric peer network or REST API.";
  }

  // 3. If it contains docker exec command failure, strip the command and extract any trailing error
  if (str.includes("docker exec") || str.includes("Command failed")) {
    const lastErrorMatch = str.match(/(?:Error|error):\s*([^\r\n]+)$/);
    if (lastErrorMatch && lastErrorMatch[1] && !lastErrorMatch[1].includes("docker")) {
      return cleanSentence(lastErrorMatch[1]);
    }
    return "Blockchain peer invocation rejected by the consortium network.";
  }

  // 4. Fallback: clean the first line
  const firstLine = str.split("\n")[0].replace(/^Error:\s*/i, "").trim();
  return cleanSentence(firstLine);
}

function cleanSentence(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith("Error:")) cleaned = cleaned.replace(/^Error:\s*/i, "");
  if (cleaned.startsWith("error:")) cleaned = cleaned.replace(/^error:\s*/i, "");
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  if (!cleaned.endsWith(".") && !cleaned.endsWith("!") && !cleaned.endsWith("?")) {
    cleaned += ".";
  }
  return cleaned;
}
