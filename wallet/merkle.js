import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import crypto from "crypto";

/// Turns a credential's attribute map into a stable list of leaf hashes.
/// Each leaf commits to one "key:value" pair plus a random salt, so that disclosing
/// one attribute does not leak information about the others (the salt prevents
/// dictionary/guessing attacks on low-entropy attribute values).
function buildLeaves(attributes, salts) {
  return Object.keys(attributes)
    .sort() // deterministic order
    .map((key) => {
      const salt = salts[key];
      const leafInput = `${key}:${attributes[key]}:${salt}`;
      return { key, value: attributes[key], salt, hash: keccak256(leafInput) };
    });
}

/// Generates random hex salts for each attribute key.
function generateSalts(attributes) {
  const salts = {};
  for (const key of Object.keys(attributes)) {
    salts[key] = crypto.randomBytes(16).toString("hex");
  }
  return salts;
}

/// Builds the full Merkle tree for a credential. Returns the tree, its root (the on-chain
/// commitment), and the per-attribute leaves (kept privately by the holder).
///
/// Pass `existingSalts` to deterministically REBUILD the same tree the issuer originally
/// committed to (e.g. when the holder later wants to generate a disclosure proof from a
/// credential it already stored) — otherwise fresh random salts are generated, which
/// produces a different root and should only be done at issuance time.
function buildCredentialTree(attributes, existingSalts) {
  const salts = existingSalts || generateSalts(attributes);
  const leaves = buildLeaves(attributes, salts);
  const tree = new MerkleTree(
    leaves.map((l) => l.hash),
    keccak256,
    { sortPairs: true }
  );
  return { tree, root: tree.getHexRoot(), leaves, salts };
}

/// Holder-side: produces a proof for a chosen subset of attribute keys, without exposing
/// the salts or values of any attribute *not* in `discloseKeys`.
function createDisclosureProof(leaves, tree, discloseKeys) {
  return discloseKeys.map((key) => {
    const leaf = leaves.find((l) => l.key === key);
    if (!leaf) throw new Error(`Unknown attribute: ${key}`);
    return {
      key: leaf.key,
      value: leaf.value,
      salt: leaf.salt,
      proof: tree.getHexProof(leaf.hash),
    };
  });
}

/// Verifier-side: recomputes each disclosed leaf hash from the revealed value+salt and checks
/// its Merkle proof against the on-chain root. Returns true only if every disclosed attribute
/// checks out against the same root.
function verifyDisclosureProof(disclosures, root) {
  for (const d of disclosures) {
    const leafInput = `${d.key}:${d.value}:${d.salt}`;
    const leafHash = keccak256(leafInput);
    const ok = MerkleTree.verify(d.proof, leafHash, root, keccak256, { sortPairs: true });
    if (!ok) return { valid: false, failedKey: d.key };
  }
  return { valid: true };
}

export { buildCredentialTree, createDisclosureProof, verifyDisclosureProof };
