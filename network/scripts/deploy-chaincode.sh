#!/usr/bin/env bash
#
# Deploy academic-contract chaincode across all 3 organizations in academicchannel

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${DIR}/envVar.sh"

CHANNEL_NAME="academicchannel"
CC_NAME="academic-contract"
CC_SRC_PATH="/opt/gopath/src/github.com/chaincode/academic-contract"
CC_VERSION=${1:-"1.0"}
CC_SEQUENCE=${2:-1}
CC_PKG_FILE="/tmp/${CC_NAME}_${CC_VERSION}.tar.gz"

# Check if chaincode is already committed
setGlobals 1
if peer lifecycle chaincode querycommitted -C ${CHANNEL_NAME} -n ${CC_NAME} 2>&1 | grep -q "Committed chaincode definition"; then
  echo "========================================================="
  echo " ✅ Chaincode ${CC_NAME} is already committed on ${CHANNEL_NAME}!"
  echo "========================================================="
  peer chaincode query -C ${CHANNEL_NAME} -n ${CC_NAME} -c '{"function":"GetAllCertificates","Args":[]}' || true
  echo "🎉 Chaincode ${CC_NAME} is fully operational!"
  exit 0
fi

echo "========================================================="
echo " 📦 Packaging Chaincode: ${CC_NAME} (Node.js)             "
echo "========================================================="

setGlobals 1
peer lifecycle chaincode package ${CC_PKG_FILE} \
  --path ${CC_SRC_PATH} \
  --lang node \
  --label ${CC_NAME}_${CC_VERSION}

echo "✅ Chaincode packaged into ${CC_PKG_FILE}"

echo "========================================================="
echo " 📥 Installing Chaincode on Org1, Org2, Org3 Peers       "
echo "========================================================="

for ORG in 1 2 3; do
  setGlobals $ORG
  echo "--> Installing on peer0.org${ORG}.academic.edu..."
  peer lifecycle chaincode install ${CC_PKG_FILE} > /tmp/log.txt 2>&1 || true
  cat /tmp/log.txt
done

echo "========================================================="
echo " 🔍 Extracting Package ID                                 "
echo "========================================================="

setGlobals 1
peer lifecycle chaincode queryinstalled > /tmp/log.txt 2>&1
PACKAGE_ID=$(sed -n "/${CC_NAME}_${CC_VERSION}/{s/^Package ID: //; s/, Label:.*$//; p;}" /tmp/log.txt)
echo "Chaincode Package ID: ${PACKAGE_ID}"

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ Failed to find Package ID!"
  exit 1
fi

echo "========================================================="
echo " ✍️ Approving Chaincode Definition for Org1, Org2, Org3   "
echo "========================================================="

for ORG in 1 2 3; do
  setGlobals $ORG
  echo "--> Approving for Org${ORG}MSP..."
  peer lifecycle chaincode approveformyorg \
    -o orderer.academic.edu:7050 \
    --ordererTLSHostnameOverride orderer.academic.edu \
    --tls \
    --cafile ${ORDERER_CA} \
    --channelID ${CHANNEL_NAME} \
    --name ${CC_NAME} \
    --version ${CC_VERSION} \
    --package-id ${PACKAGE_ID} \
    --sequence ${CC_SEQUENCE} \
    --init-required > /tmp/log.txt 2>&1 || true
  cat /tmp/log.txt
done

echo "========================================================="
echo " 📋 Checking Commit Readiness                            "
echo "========================================================="

setGlobals 1
peer lifecycle chaincode checkcommitreadiness \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --sequence ${CC_SEQUENCE} \
  --init-required \
  --output json

echo "========================================================="
echo " 🚀 Committing Chaincode Definition to ${CHANNEL_NAME}   "
echo "========================================================="

peer lifecycle chaincode commit \
  -o orderer.academic.edu:7050 \
  --ordererTLSHostnameOverride orderer.academic.edu \
  --tls \
  --cafile ${ORDERER_CA} \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --sequence ${CC_SEQUENCE} \
  --init-required \
  --peerAddresses peer0.org1.academic.edu:7051 --tlsRootCertFiles ${PEER0_ORG1_CA} \
  --peerAddresses peer0.org2.academic.edu:8051 --tlsRootCertFiles ${PEER0_ORG2_CA} \
  --peerAddresses peer0.org3.academic.edu:9051 --tlsRootCertFiles ${PEER0_ORG3_CA}

echo "✅ Chaincode committed to ${CHANNEL_NAME} across all 3 organizations!"

echo "========================================================="
echo " ⚡ Initializing Chaincode                                "
echo "========================================================="

peer chaincode invoke \
  -o orderer.academic.edu:7050 \
  --ordererTLSHostnameOverride orderer.academic.edu \
  --tls \
  --cafile ${ORDERER_CA} \
  -C ${CHANNEL_NAME} \
  -n ${CC_NAME} \
  --peerAddresses peer0.org1.academic.edu:7051 --tlsRootCertFiles ${PEER0_ORG1_CA} \
  --peerAddresses peer0.org2.academic.edu:8051 --tlsRootCertFiles ${PEER0_ORG2_CA} \
  --peerAddresses peer0.org3.academic.edu:9051 --tlsRootCertFiles ${PEER0_ORG3_CA} \
  --isInit \
  -c '{"function":"initLedger","Args":[]}'

sleep 2

echo "========================================================="
echo " 🧪 Testing Chaincode Query                              "
echo "========================================================="

peer chaincode query -C ${CHANNEL_NAME} -n ${CC_NAME} -c '{"function":"GetAllCertificates","Args":[]}'

echo "🎉 Chaincode ${CC_NAME} is fully deployed and operational!"
