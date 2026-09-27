#!/usr/bin/env bash
#
# Environment variables helper for Org1, Org2, and Org3

export CORE_PEER_TLS_ENABLED=true
export ORDERER_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/academic.edu/orderers/orderer.academic.edu/msp/tlscacerts/tlsca.academic.edu-cert.pem
export PEER0_ORG1_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.academic.edu/peers/peer0.org1.academic.edu/tls/ca.crt
export PEER0_ORG2_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.academic.edu/peers/peer0.org2.academic.edu/tls/ca.crt
export PEER0_ORG3_CA=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.academic.edu/peers/peer0.org3.academic.edu/tls/ca.crt

# Set environment variables for the specified Org (1, 2, or 3)
setGlobals() {
  local USING_ORG=""
  if [ -z "$1" ]; then
    USING_ORG=1
  else
    USING_ORG=$1
  fi

  if [ $USING_ORG -eq 1 ]; then
    export CORE_PEER_LOCALMSPID="Org1MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG1_CA
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org1.academic.edu/users/Admin@org1.academic.edu/msp
    export CORE_PEER_ADDRESS=peer0.org1.academic.edu:7051
  elif [ $USING_ORG -eq 2 ]; then
    export CORE_PEER_LOCALMSPID="Org2MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG2_CA
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org2.academic.edu/users/Admin@org2.academic.edu/msp
    export CORE_PEER_ADDRESS=peer0.org2.academic.edu:8051
  elif [ $USING_ORG -eq 3 ]; then
    export CORE_PEER_LOCALMSPID="Org3MSP"
    export CORE_PEER_TLS_ROOTCERT_FILE=$PEER0_ORG3_CA
    export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.academic.edu/users/Admin@org3.academic.edu/msp
    export CORE_PEER_ADDRESS=peer0.org3.academic.edu:9051
  else
    echo "Unknown organization: $USING_ORG"
    exit 1
  fi
}

# Verify command execution result
verifyResult() {
  if [ $1 -ne 0 ]; then
    echo "❌ ERROR: $2"
    exit 1
  fi
}
