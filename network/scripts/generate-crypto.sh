#!/usr/bin/env bash
#
# Generates cryptographic material and channel artifacts using official Docker fabric-tools container.
# This ensures 100% identical behavior across macOS (arm64/amd64) and Ubuntu Linux.

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NETWORK_DIR="$(cd "${DIR}/.." && pwd)"
ROOT_DIR="$(cd "${NETWORK_DIR}/.." && pwd)"

echo "========================================================="
echo " 🔑 Generating Cryptographic Material for 3 Organizations "
echo "========================================================="

# Clean existing crypto and artifacts
rm -rf "${NETWORK_DIR}/crypto-config"
rm -rf "${NETWORK_DIR}/channel-artifacts"
mkdir -p "${NETWORK_DIR}/channel-artifacts"

# Run cryptogen inside fabric-tools container
docker run --rm \
  -v "${ROOT_DIR}:/workspace" \
  -w /workspace/network \
  hyperledger/fabric-tools:2.5 \
  cryptogen generate --config=./crypto-config.yaml --output="./crypto-config"

echo "✅ Crypto material successfully generated!"

echo "========================================================="
echo " 📦 Generating Channel Genesis Block (Fabric 2.5)       "
echo "========================================================="

# Run configtxgen inside fabric-tools container
docker run --rm \
  -v "${ROOT_DIR}:/workspace" \
  -w /workspace \
  -e FABRIC_CFG_PATH=/workspace/docker/configtx \
  hyperledger/fabric-tools:2.5 \
  configtxgen -profile AcademicChannel -outputBlock /workspace/network/channel-artifacts/academicchannel.block -channelID academicchannel

echo "✅ Channel genesis block generated at network/channel-artifacts/academicchannel.block!"
