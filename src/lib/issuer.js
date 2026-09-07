/**
 * CredentialIssuer - Issue verifiable credentials to the blockchain
 */

import { ethers } from 'ethers';
import { buildMerkleTree, getRoot } from './merkle.js';
import credentialRegistryArtifact from '../../build/CredentialRegistry.json' assert { type: 'json' };

export class CredentialIssuer {
  /**
   * Create a new CredentialIssuer instance
   * @param {string} registryAddress - Address of the CredentialRegistry contract
   * @param {Object} signer - Ethers signer with issuer privileges
   */
  constructor(registryAddress, signer) {
    this.registryAddress = registryAddress;
    this.signer = signer;
    this.contract = new ethers.Contract(
      registryAddress,
      credentialRegistryArtifact.abi,
      signer
    );
  }

  /**
   * Issue a new credential on-chain
   * @param {string} holder - Address of the credential holder
   * @param {Object} attributes - Credential attributes (e.g., { name, degree, university })
   * @returns {Object} - { credentialHash, merkleTree, transaction }
   */
  async issueCredential(holder, attributes) {
    // Build Merkle tree from attributes
    const merkleTree = buildMerkleTree(attributes);
    const credentialHash = getRoot(merkleTree);

    // Record commitment on-chain
    const tx = await this.contract.issueCredential(holder, credentialHash);
    await tx.wait();

    return {
      credentialHash,
      merkleTree,
      transaction: tx.hash,
      holder,
      attributes
    };
  }

  /**
   * Batch issue multiple credentials
   * @param {Array} credentials - Array of { holder, attributes } objects
   * @returns {Array} - Array of issued credential objects
   */
  async batchIssueCredentials(credentials) {
    const results = [];

    for (const { holder, attributes } of credentials) {
      const result = await this.issueCredential(holder, attributes);
      results.push(result);
    }

    return results;
  }

  /**
   * Check if a credential exists on-chain
   * @param {string} credentialHash - The credential hash to check
   * @returns {boolean} - Whether the credential exists
   */
  async credentialExists(credentialHash) {
    return await this.contract.credentials(credentialHash);
  }
}
