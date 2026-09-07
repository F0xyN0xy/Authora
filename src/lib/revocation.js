/**
 * RevocationManager - Revoke credentials
 *
 * Issuers can revoke credentials when they expire or become invalid.
 */

import { ethers } from 'ethers';
import revocationRegistryArtifact from '../../build/RevocationRegistry.json' assert { type: 'json' };

export class RevocationManager {
  /**
   * Create a new RevocationManager instance
   * @param {string} revocationAddress - RevocationRegistry contract address
   * @param {Object} signer - Ethers signer with issuer privileges
   */
  constructor(revocationAddress, signer) {
    this.contract = new ethers.Contract(
      revocationAddress,
      revocationRegistryArtifact.abi,
      signer
    );
  }

  /**
   * Revoke a credential
   * @param {string} credentialHash - The credential hash to revoke
   * @returns {Object} - { transactionHash, credentialHash }
   */
  async revokeCredential(credentialHash) {
    const tx = await this.contract.revoke(credentialHash);
    await tx.wait();

    return {
      transactionHash: tx.hash,
      credentialHash,
      revokedAt: new Date().toISOString()
    };
  }

  /**
   * Batch revoke multiple credentials
   * @param {Array<string>} credentialHashes - Array of credential hashes
   * @returns {Array} - Array of revocation results
   */
  async batchRevokeCredentials(credentialHashes) {
    const results = [];

    for (const hash of credentialHashes) {
      const result = await this.revokeCredential(hash);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if a credential is revoked
   * @param {string} credentialHash - The credential hash
   * @returns {boolean}
   */
  async isRevoked(credentialHash) {
    return await this.contract.isRevoked(credentialHash);
  }

  /**
   * Get revocation status for multiple credentials
   * @param {Array<string>} credentialHashes - Array of credential hashes
   * @returns {Object} - Map of credentialHash -> boolean
   */
  async checkRevocationStatus(credentialHashes) {
    const status = {};

    for (const hash of credentialHashes) {
      status[hash] = await this.isRevoked(hash);
    }

    return status;
  }
}
