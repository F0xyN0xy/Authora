// Simulates a third-party verifier receiving a presentation (build/presentation.json) and
// checking it end to end:
//   1. Each disclosed attribute's Merkle proof matches the claimed root (data integrity).
//   2. The issuer's ECDSA signature over the root is valid (authenticity).
//   3. The root + issuer are registered on CredentialRegistry (was actually issued).
//   4. The credential has not been revoked (RevocationRegistry, via CredentialRegistry).
// The verifier only ever sees the attributes the holder chose to disclose.
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import { verifyDisclosureProof } from "../wallet/merkle.js";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
}

async function main() {
  const presentation = JSON.parse(
    fs.readFileSync(path.join(BUILD_DIR, "presentation.json"), "utf8")
  );
  const deployment = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "deployment.json"), "utf8"));

  console.log("Verifying presentation for disclosed attributes:",
    presentation.disclosures.map((d) => d.key).join(", "));

  // 1. Merkle proofs for each disclosed attribute
  const merkleResult = verifyDisclosureProof(presentation.disclosures, presentation.root);
  if (!merkleResult.valid) {
    console.log(`FAIL: Merkle proof invalid for attribute "${merkleResult.failedKey}"`);
    process.exit(1);
  }
  console.log("[OK] All disclosed attributes match the credential's committed root");

  // 2. Issuer signature over the root
  const recovered = ethers.verifyMessage(ethers.getBytes(presentation.root), presentation.issuerSignature);
  if (recovered.toLowerCase() !== presentation.issuer.toLowerCase()) {
    console.log(`FAIL: issuer signature does not match claimed issuer (${presentation.issuer})`);
    process.exit(1);
  }
  console.log("[OK] Issuer signature over the credential root is valid");

  // 3 & 4. On-chain registration + revocation status
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const credentialArtifact = loadArtifact("CredentialRegistry");
  const credentialRegistry = new ethers.Contract(
    deployment.credentialAddress,
    credentialArtifact.abi,
    provider
  );
  const [onChainValid, reason] = await credentialRegistry.verifyCredential(
    presentation.root,
    presentation.issuer
  );
  if (!onChainValid) {
    console.log(`FAIL: on-chain check failed — ${reason}`);
    process.exit(1);
  }
  console.log(`[OK] On-chain check passed — ${reason}`);

  console.log("\n=> Presentation is VALID");
  for (const d of presentation.disclosures) {
    console.log(`   - ${d.key}: ${d.value}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
