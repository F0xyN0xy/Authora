// Simulates the holder presenting a proof to a verifier (e.g. an employer): they choose which
// attributes to reveal (selective disclosure) and hand over a "presentation" containing:
//   - the disclosed attribute values + Merkle proofs (but NOT the undisclosed attributes/salts)
//   - the credential root, issuer address, and issuer's signature over the root
// The verifier never learns the values of any attribute that isn't explicitly disclosed here.
import fs from "fs";
import path from "path";
import { Wallet } from "../wallet/wallet.js";
import { createDisclosureProof, buildCredentialTree } from "../wallet/merkle.js";

function main() {
  // Usage: node scripts/presentProof.js qualification institution
  const discloseKeys = process.argv.slice(2);
  if (discloseKeys.length === 0) {
    console.error("Usage: node scripts/presentProof.js <attributeKey> [attributeKey...]");
    console.error("Example: node scripts/presentProof.js qualification institution");
    process.exit(1);
  }

  const holder = new Wallet(path.join(import.meta.dirname, "..", ".wallets", "holder"));
  const credentials = holder.listCredentials();
  if (credentials.length === 0) {
    console.error("No credentials in holder wallet. Run scripts/issueCredential.js first.");
    process.exit(1);
  }
  const credential = credentials[credentials.length - 1]; // most recently issued

  // Rebuild the SAME tree the issuer committed to, using the original salts stored in the
  // wallet (passing existingSalts makes this deterministic — see merkle.js).
  const { tree, leaves, root } = buildCredentialTree(credential.attributes, credential.salts);
  if (root !== credential.root) {
    throw new Error("Rebuilt root does not match stored credential root — data may be corrupted.");
  }

  const disclosures = createDisclosureProof(leaves, tree, discloseKeys);

  const presentation = {
    root: credential.root,
    issuer: credential.issuer,
    issuerSignature: credential.issuerSignature,
    subject: credential.subject,
    disclosures,
  };

  const outFile = path.join(import.meta.dirname, "..", "build", "presentation.json");
  fs.writeFileSync(outFile, JSON.stringify(presentation, null, 2));
  console.log(`Presentation with disclosed attributes [${discloseKeys.join(", ")}] written to ${outFile}`);
  console.log(JSON.stringify(presentation, null, 2));
}

main();
