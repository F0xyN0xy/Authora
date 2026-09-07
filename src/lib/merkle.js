/**
 * Merkle tree utilities for credential commitments
 *
 * Uses Merkle trees to create privacy-preserving credential commitments.
 * Each attribute is salted to prevent dictionary attacks on low-entropy values.
 */

import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import crypto from "crypto";

/**
 * Build a Merkle tree from credential attributes
 * @param {Object} attributes - Credential attributes (e.g., { name: "Alice", degree: "BS" })
 * @param {Object} existingSalts - Optional existing salts for rebuilding the same tree
 * @returns {Object} - { tree, root, leaves, salts }
 */
export function buildMerkleTree(attributes, existingSalts = null) {
  const salts = existingSalts || generateSalts(attributes);
  const leaves = buildLeaves(attributes, salts);

  const tree = new MerkleTree(
    leaves.map((l) => l.hash),
    keccak256,
    { sortPairs: true }
  );

  return {
    tree,
    root: tree.getHexRoot(),
    leaves,
    salts
  };
}

/**
 * Get the root hash from a Merkle tree
 * @param {Object} merkleTree - The Merkle tree object
 * @returns {string} - The root hash
 */
export function getRoot(merkleTree) {
  return merkleTree.root;
}

/**
 * Create a selective disclosure proof for specific attributes
 * @param {Array} leaves - Merkle tree leaves
 * @param {Object} tree - The Merkle tree
 * @param {Array} discloseKeys - Array of attribute keys to disclose
 * @returns {Array} - Array of disclosure proofs
 */
export function createProof(leaves, tree, discloseKeys) {
  return discloseKeys.map((key) => {
    const leaf = leaves.find((l) => l.key === key);
    if (!leaf) throw new Error(`Unknown attribute: ${key}`);

    return {
      key: leaf.key,
      value: leaf.value,
      salt: leaf.salt,
      proof: tree.getHexProof(leaf.hash)
    };
  });
}

/**
 * Verify a selective disclosure proof against a root
 * @param {Array} disclosures - Array of disclosed attributes with proofs
 * @param {string} root - The Merkle root to verify against
 * @returns {Object} - { valid: boolean, failedKey?: string }
 */
export function verifyProof(disclosures, root) {
  for (const d of disclosures) {
    const leafInput = `${d.key}:${d.value}:${d.salt}`;
    const leafHash = keccak256(leafInput);
    const ok = MerkleTree.verify(d.proof, leafHash, root, keccak256, { sortPairs: true });

    if (!ok) {
      return { valid: false, failedKey: d.key };
    }
  }

  return { valid: true };
}

/**
 * Generate random salts for each attribute
 * @private
 */
function generateSalts(attributes) {
  const salts = {};
  for (const key of Object.keys(attributes)) {
    salts[key] = crypto.randomBytes(16).toString("hex");
  }
  return salts;
}

/**
 * Build leaf hashes for each attribute
 * @private
 */
function buildLeaves(attributes, salts) {
  return Object.keys(attributes)
    .sort() // Deterministic order
    .map((key) => {
      const salt = salts[key];
      const leafInput = `${key}:${attributes[key]}:${salt}`;
      return {
        key,
        value: attributes[key],
        salt,
        hash: keccak256(leafInput)
      };
    });
}
