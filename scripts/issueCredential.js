// Simulates a credential issuer (e.g. a university) issuing a verifiable credential to a
// holder's wallet:
//   1. Build attributes + Merkle tree commitment (wallet/merkle.js).
//   2. Sign the Merkle root with the issuer's private key (this is the "digital signature for
//      credential authenticity" from the spec).
//   3. Register (root, subject) on-chain via CredentialRegistry.issueCredential.
//   4. Hand the full credential (attributes, salts, proofs, issuer signature) to the holder,
//      who stores it in their wallet. Only the root hash + issuer + subject ever touch the chain.
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { buildCredentialTree } from "../wallet/merkle.js";
import { Wallet } from "../wallet/wallet.js";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
}

async function main() {
  const deployment = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "deployment.json"), "utf8"));
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // --- Issuer setup: a dedicated on-chain account acts as "University X" ---
  const issuerFundingSigner = await provider.getSigner(1); // 2nd prefunded Hardhat account
  const issuerWallet = ethers.Wallet.createRandom().connect(provider);
  await (
    await issuerFundingSigner.sendTransaction({ to: issuerWallet.address, value: ethers.parseEther("1") })
  ).wait();
  console.log("Issuer address:", issuerWallet.address);

  // --- Holder wallet: generate (or reuse) an identity ---
  const holder = new Wallet(path.join(import.meta.dirname, "..", ".wallets", "holder"));
  const holderIdentity = fs.existsSync(path.join(holder.storageDir, "keypair.json"))
    ? holder.loadIdentity()
    : holder.generateIdentity();
  console.log("Holder DID:", holderIdentity.did);

  // --- Build the credential and its Merkle commitment ---
  const attributes = {
    name: "Ada Lovelace",
    dateOfBirth: "1990-01-01",
    qualification: "M.Sc. Computer Science",
    institution: "University X",
  };
  const { root, leaves, salts } = buildCredentialTree(attributes);

  // --- Issuer signs the root (ECDSA signature over the commitment) ---
  const issuerSignature = await issuerWallet.signMessage(ethers.getBytes(root));

  // --- Register the commitment on-chain ---
  const credentialArtifact = loadArtifact("CredentialRegistry");
  const credentialRegistry = new ethers.Contract(
    deployment.credentialAddress,
    credentialArtifact.abi,
    issuerWallet
  );
  const tx = await credentialRegistry.issueCredential(root, holderIdentity.address);
  const receipt = await tx.wait();
  console.log("Credential issued on-chain. Tx hash:", receipt.hash);
  console.log("Credential (Merkle root):", root);

  // --- Holder stores the full credential locally ---
  const credential = {
    root,
    issuer: issuerWallet.address,
    issuerSignature,
    subject: holderIdentity.address,
    attributes,
    salts,
    leaves: leaves.map((l) => ({ key: l.key, hash: l.hash.toString("hex") })),
    issuedAt: new Date().toISOString(),
  };
  holder.saveCredential(credential);
  console.log(`Credential stored in ${holder.credentialsFile}`);

  // Persist the issuer address so verify/revoke scripts (run as separate processes) know it.
  fs.writeFileSync(
    path.join(BUILD_DIR, "issuer.json"),
    JSON.stringify({ address: issuerWallet.address, privateKey: issuerWallet.privateKey }, null, 2)
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
