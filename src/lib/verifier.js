/**
 * CredentialVerifier - Verify credential presentations
 *
 * Verifiers check that disclosed attributes are valid against an on-chain commitment
 * and that the credential has not been revoked.
 */

import { ethers } from 'ethers';
import { verifyProof } from './merkle.js';
import credentialRegistryArtifact from '../../build/CredentialRegistry.json' assert { type: 'json' };
import revocationRegistryArtifact from '../../build/RevocationRegistry.json' assert { type: 'json' };

export class CredentialVerifier {
  /**
   * Create a new CredentialVerifier instance
   * @param {string} registryAddress - CredentialRegistry contract address
   * @param {string} revocationAddress - RevocationRegistry contract address
   * @param {Object} provider - Ethers provider
   */
  constructor(registryAddress, revocationAddress, provider) {
    this.credentialContract = new ethers.Contract(
      registryAddress,
      credentialRegistryArtifact.abi,
      provider
    );
    this.revocationContract = new ethers.Contract(
      revocationAddress,
      revocationRegistryArtifact.abi,
      provider
    );
  }

  /**
   * Verify a credential presentation
   * @param {Object} presentation - Presentation from CredentialHolder.createPresentation()
   * @param {string} presentation.credentialHash - The on-chain credential hash
   * @param {string} presentation.root - The Merkle root
   * @param {Array} presentation.disclosures - Disclosed attributes with proofs
   * @returns {Object} - { valid, reason?, attributes }
   */
  async verifyPresentation(presentation) {
    const { credentialHash, root, disclosures } = presentation;

    // 1. Check that the credential exists on-chain
    const exists = await this.credentialContract.credentials(credentialHash);
    if (!exists) {
      return { valid: false, reason: 'Credential not found on-chain' };
    }

    // 2. Check that the credential has not been revoked
    const revoked = await this.revocationContract.isRevoked(credentialHash);
    if (revoked) {
      return { valid: false, reason: 'Credential has been revoked' };
    }

    // 3. Verify the Merkle proofs for each disclosed attribute
    const proofResult = verifyProof(disclosures, root);
    if (!proofResult.valid) {
      return {
        valid: false,
        reason: `Invalid proof for attribute: ${proofResult.failedKey}`
      };
    }

    // 4. Return the verified attributes
    const attributes = {};
    for (const d of disclosures) {
      attributes[d.key] = d.value;
    }

    return {
      valid: true,
      credentialHash,
      attributes
    };
  }

  /**
   * Check if a credential is revoked
   * @param {string} credentialHash - The credential hash
   * @returns {boolean}
   */
  async isRevoked(credentialHash) {
    return await this.revocationContract.isRevoked(credentialHash);
  }

  /**
   * Check if a credential exists on-chain
   * @param {string} credentialHash - The credential hash
   * @returns {boolean}
   */
  async exists(credentialHash) {
    return await this.credentialContract.credentials(credentialHash);
  }
}
