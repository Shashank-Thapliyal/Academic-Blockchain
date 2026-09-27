#!/usr/bin/env bash
#
# Create channel and join all 3 organization peers using Fabric 2.5 channel participation.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${DIR}/envVar.sh"

CHANNEL_NAME="academicchannel"
BLOCK_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/channel-artifacts/${CHANNEL_NAME}.block"
ORDERER_ADMIN_LISTENADDRESS="orderer.academic.edu:7053"
ORDERER_CA_FILE="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/academic.edu/orderers/orderer.academic.edu/tls/ca.crt"
ORDERER_ADMIN_CERT="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/academic.edu/users/Admin@academic.edu/tls/client.crt"
ORDERER_ADMIN_KEY="/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/academic.edu/users/Admin@academic.edu/tls/client.key"

echo "========================================================="
echo " 🌐 Joining Orderer to Channel: ${CHANNEL_NAME}          "
echo "========================================================="

# Check if orderer already joined
osnadmin channel list \
  -o ${ORDERER_ADMIN_LISTENADDRESS} \
  --ca-file ${ORDERER_CA_FILE} \
  --client-cert ${ORDERER_ADMIN_CERT} \
  --client-key ${ORDERER_ADMIN_KEY} > /tmp/channels.txt 2>&1 || true

if grep -q "${CHANNEL_NAME}" /tmp/channels.txt; then
  echo "Orderer is already joined to ${CHANNEL_NAME}"
else
  osnadmin channel join \
    --channelID ${CHANNEL_NAME} \
    --config-block ${BLOCK_FILE} \
    -o ${ORDERER_ADMIN_LISTENADDRESS} \
    --ca-file ${ORDERER_CA_FILE} \
    --client-cert ${ORDERER_ADMIN_CERT} \
    --client-key ${ORDERER_ADMIN_KEY}
  echo "✅ Orderer joined channel ${CHANNEL_NAME}"
fi

sleep 2

joinPeer() {
  local ORG=$1
  setGlobals $ORG

  echo "--> Checking if peer0.org${ORG}.academic.edu already joined ${CHANNEL_NAME}..."
  if peer channel list 2>&1 | grep -q "${CHANNEL_NAME}"; then
    echo "✅ peer0.org${ORG}.academic.edu is already joined to ${CHANNEL_NAME}"
    return 0
  fi

  echo "--> Joining peer0.org${ORG}.academic.edu to ${CHANNEL_NAME}..."
  local rc=1
  local COUNTER=1
  while [ $rc -ne 0 -a $COUNTER -lt 5 ]; do
    peer channel join -b ${BLOCK_FILE} > /tmp/log.txt 2>&1
    rc=$?
    if [ $rc -eq 0 ] || grep -q -E "already exists|cannot create ledger" /tmp/log.txt; then
      echo "✅ peer0.org${ORG}.academic.edu joined channel ${CHANNEL_NAME}"
      return 0
    fi
    echo "Retry joining peer0.org${ORG} (attempt ${COUNTER})..."
    sleep 2
    COUNTER=$((COUNTER + 1))
  done
  cat /tmp/log.txt
  verifyResult $rc "Failed to join peer0.org${ORG} to channel ${CHANNEL_NAME}"
}

echo "========================================================="
echo " 👥 Joining Org1, Org2, Org3 Peers to Channel            "
echo "========================================================="

joinPeer 1
joinPeer 2
joinPeer 3

echo "========================================================="
echo " 🎉 All 3 Organizations Joined ${CHANNEL_NAME} Successfully "
echo "========================================================="
