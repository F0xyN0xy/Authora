/**
 * Authora - Decentralized Credential Management SDK
 *
 * A privacy-preserving credential system built on Ethereum.
 * Issue, verify, and revoke verifiable credentials using zero-knowledge proofs.
 *
 * @module authora
 */

import { CredentialIssuer } from './lib/issuer.js';
import { CredentialVerifier } from './lib/verifier.js';
import { CredentialHolder } from './lib/holder.js';
import { RevocationManager } from './lib/revocation.js';

export {
  CredentialIssuer,
  CredentialVerifier,
  CredentialHolder,
  RevocationManager
};

/**
 * Initialize Authora SDK with contract addresses and provider
 * @param {Object} config - Configuration object
 * @param {string} config.registryAddress - CredentialRegistry contract address
 * @param {string} config.revocationAddress - RevocationRegistry contract address
 * @param {Object} config.provider - Ethers provider or RPC URL
 * @param {Object} config.signer - Ethers signer (optional, required for issuing/revoking)
 * @returns {Object} Initialized SDK instance
 */
export function createAuthoraSDK(config) {
  const { registryAddress, revocationAddress, provider, signer } = config;

  return {
    issuer: new CredentialIssuer(registryAddress, signer || provider),
    verifier: new CredentialVerifier(registryAddress, revocationAddress, provider),
    holder: new CredentialHolder(),
    revocation: new RevocationManager(revocationAddress, signer || provider)
  };
}

export default {
  createAuthoraSDK,
  CredentialIssuer,
  CredentialVerifier,
  CredentialHolder,
  RevocationManager
};
