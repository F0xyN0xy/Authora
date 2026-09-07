// Deploys RevocationRegistry and CredentialRegistry to whatever JSON-RPC endpoint is running
// (start one first with: npx hardhat node). Writes the deployed addresses to
// ./build/deployment.json so the other scripts can find them.
import fs from "fs";
import path from "path";
import { ethers } from "ethers";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const deployer = await provider.getSigner(0); // first Hardhat-node prefunded account

  const revocationArtifact = loadArtifact("RevocationRegistry");
  const revocationFactory = new ethers.ContractFactory(
    revocationArtifact.abi,
    revocationArtifact.bytecode,
    deployer
  );
  const revocationRegistry = await revocationFactory.deploy();
  await revocationRegistry.waitForDeployment();
  const revocationAddress = await revocationRegistry.getAddress();
  console.log("RevocationRegistry deployed to:", revocationAddress);

  const credentialArtifact = loadArtifact("CredentialRegistry");
  const credentialFactory = new ethers.ContractFactory(
    credentialArtifact.abi,
    credentialArtifact.bytecode,
    deployer
  );
  const credentialRegistry = await credentialFactory.deploy(revocationAddress);
  await credentialRegistry.waitForDeployment();
  const credentialAddress = await credentialRegistry.getAddress();
  console.log("CredentialRegistry deployed to:", credentialAddress);

  fs.writeFileSync(
    path.join(BUILD_DIR, "deployment.json"),
    JSON.stringify({ revocationAddress, credentialAddress, rpcUrl: RPC_URL }, null, 2)
  );
  console.log("Wrote build/deployment.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
