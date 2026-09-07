// Simulates the issuer revoking a previously issued credential (e.g. the qualification was
// found to be fraudulent, or the holder lost their device). After this runs, verifyProof.js
// against the same presentation will fail the on-chain check.
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
}

async function main() {
  const deployment = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "deployment.json"), "utf8"));
  const issuerInfo = JSON.parse(fs.readFileSync(path.join(BUILD_DIR, "issuer.json"), "utf8"));
  const presentation = JSON.parse(
    fs.readFileSync(path.join(BUILD_DIR, "presentation.json"), "utf8")
  );

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const issuerSigner = new ethers.Wallet(issuerInfo.privateKey, provider);

  const revocationArtifact = loadArtifact("RevocationRegistry");
  const revocationRegistry = new ethers.Contract(
    deployment.revocationAddress,
    revocationArtifact.abi,
    issuerSigner
  );

  const tx = await revocationRegistry.revoke(presentation.root);
  const receipt = await tx.wait();
  console.log("Credential revoked. Tx hash:", receipt.hash);
  console.log("Revoked root:", presentation.root);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
