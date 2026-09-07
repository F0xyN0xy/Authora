/**
 * CredentialHolder - Manage and present verifiable credentials
 *
 * Holders store credentials privately and generate selective disclosure proofs.
 */

import { buildMerkleTree, createProof } from './merkle.js';

export class CredentialHolder {
  constructor() {
    this.credentials = new Map(); // credentialHash -> credential data
  }

  /**
   * Store a credential received from an issuer
   * @param {Object} credential - The credential object from issuer
   * @param {string} credential.credentialHash - The on-chain credential hash
   * @param {Object} credential.attributes - The credential attributes
   * @param {Object} credential.salts - The salts used (from merkleTree)
   * @param {Object} credential.merkleTree - Optional: the full tree object
   */
  storeCredential(credential) {
    const { credentialHash, attributes, merkleTree } = credential;

    this.credentials.set(credentialHash, {
      credentialHash,
      attributes,
      salts: merkleTree.salts,
      leaves: merkleTree.leaves,
      tree: merkleTree.tree,
      root: merkleTree.root,
      issuedAt: new Date().toISOString()
    });

    return credentialHash;
  }

  /**
   * Get a stored credential
   * @param {string} credentialHash - The credential hash
   * @returns {Object|null} - The credential data or null if not found
   */
  getCredential(credentialHash) {
    return this.credentials.get(credentialHash) || null;
  }

  /**
   * List all stored credentials
   * @returns {Array} - Array of credential hashes
   */
  listCredentials() {
    return Array.from(this.credentials.keys());
  }

  /**
   * Create a selective disclosure proof for specific attributes
   * @param {string} credentialHash - The credential hash
   * @param {Array<string>} attributesToDisclose - Array of attribute keys to disclose
   * @returns {Object} - { credentialHash, disclosures, root }
   */
  createPresentation(credentialHash, attributesToDisclose) {
    const credential = this.credentials.get(credentialHash);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialHash}`);
    }

    // Generate disclosure proofs
    const disclosures = createProof(
      credential.leaves,
      credential.tree,
      attributesToDisclose
    );

    return {
      credentialHash,
      root: credential.root,
      disclosures,
      presentedAt: new Date().toISOString()
    };
  }

  /**
   * Export credential for backup or transfer
   * @param {string} credentialHash - The credential hash
   * @returns {string} - JSON string of the credential
   */
  exportCredential(credentialHash) {
    const credential = this.credentials.get(credentialHash);
    if (!credential) {
      throw new Error(`Credential not found: ${credentialHash}`);
    }

    // Don't export the tree object (not serializable), only what's needed to rebuild
    return JSON.stringify({
      credentialHash: credential.credentialHash,
      attributes: credential.attributes,
      salts: credential.salts,
      root: credential.root,
      issuedAt: credential.issuedAt
    });
  }

  /**
   * Import a credential from backup
   * @param {string} credentialJson - JSON string of the credential
   * @returns {string} - The credential hash
   */
  importCredential(credentialJson) {
    const data = JSON.parse(credentialJson);

    // Rebuild the Merkle tree
    const merkleTree = buildMerkleTree(data.attributes, data.salts);

    // Verify the root matches
    if (merkleTree.root !== data.root) {
      throw new Error('Invalid credential: root mismatch');
    }

    this.credentials.set(data.credentialHash, {
      credentialHash: data.credentialHash,
      attributes: data.attributes,
      salts: data.salts,
      leaves: merkleTree.leaves,
      tree: merkleTree.tree,
      root: merkleTree.root,
      issuedAt: data.issuedAt
    });

    return data.credentialHash;
  }

  /**
   * Delete a credential
   * @param {string} credentialHash - The credential hash to delete
   * @returns {boolean} - Whether the credential was deleted
   */
  deleteCredential(credentialHash) {
    return this.credentials.delete(credentialHash);
  }
}
