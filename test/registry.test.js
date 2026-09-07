// Contract-level tests, run with: npx mocha test/registry.test.js --timeout 20000
// Talks directly to a running `npx hardhat node` via ethers + our own compiled artifacts
// (see scripts/compile.js), since Hardhat's own test runner would try to re-download solc.
import fs from "fs";
import path from "path";
import { expect } from "chai";
import { ethers } from "ethers";

const BUILD_DIR = path.join(import.meta.dirname, "..", "build");
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

function loadArtifact(name) {
  return JSON.parse(fs.readFileSync(path.join(BUILD_DIR, `${name}.json`), "utf8"));
}

// ethers' default "pending" nonce lookup can get out of sync with Hardhat's local network
// once a transaction has reverted (the nonce is still consumed on-chain). Fetching the
// nonce explicitly from "latest" before each send avoids that mismatch in this test suite.
async function nextNonce(provider, address) {
  return provider.getTransactionCount(address, "latest");
}

describe("CredentialRegistry + RevocationRegistry", function () {
  let provider, deployer, issuer, otherIssuer, subject;
  let revocationRegistry, credentialRegistry;
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("sample-credential"));

  before(async function () {
    provider = new ethers.JsonRpcProvider(RPC_URL);
    deployer = await provider.getSigner(0);
    issuer = ethers.Wallet.createRandom().connect(provider);
    otherIssuer = ethers.Wallet.createRandom().connect(provider);
    subject = ethers.Wallet.createRandom().connect(provider);

    // fund the random wallets so they can send transactions
    for (const w of [issuer, otherIssuer, subject]) {
      await (await deployer.sendTransaction({ to: w.address, value: ethers.parseEther("1") })).wait();
    }

    const revocationArtifact = loadArtifact("RevocationRegistry");
    const revocationFactory = new ethers.ContractFactory(
      revocationArtifact.abi,
      revocationArtifact.bytecode,
      deployer
    );
    revocationRegistry = await revocationFactory.deploy();
    await revocationRegistry.waitForDeployment();

    const credentialArtifact = loadArtifact("CredentialRegistry");
    const credentialFactory = new ethers.ContractFactory(
      credentialArtifact.abi,
      credentialArtifact.bytecode,
      deployer
    );
    credentialRegistry = await credentialFactory.deploy(await revocationRegistry.getAddress());
    await credentialRegistry.waitForDeployment();
  });

  it("registers a new credential and reports it valid", async function () {
    const tx = await credentialRegistry.connect(issuer).issueCredential(sampleHash, subject.address);
    await tx.wait();

    const [valid, reason] = await credentialRegistry.verifyCredential(sampleHash, issuer.address);
    expect(valid).to.equal(true);
    expect(reason).to.equal("valid");
  });

  it("rejects re-issuing the same credential hash", async function () {
    let reverted = false;
    try {
      await (await credentialRegistry.connect(issuer).issueCredential(sampleHash, subject.address)).wait();
    } catch (err) {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });

  it("fails verification when checked against the wrong issuer", async function () {
    const [valid, reason] = await credentialRegistry.verifyCredential(sampleHash, otherIssuer.address);
    expect(valid).to.equal(false);
    expect(reason).to.equal("issuer mismatch");
  });

  it("only the original issuer can revoke", async function () {
    let reverted = false;
    try {
      await (await revocationRegistry.connect(otherIssuer).revoke(sampleHash)).wait();
    } catch (err) {
      reverted = true;
    }
    expect(reverted).to.equal(true);

    // sanity: still not revoked
    expect(await revocationRegistry.isRevoked(sampleHash)).to.equal(false);
  });

  it("marks a credential invalid after the real issuer revokes it", async function () {
    const nonce = await nextNonce(provider, issuer.address);
    await (await revocationRegistry.connect(issuer).revoke(sampleHash, { nonce })).wait();

    const [valid, reason] = await credentialRegistry.verifyCredential(sampleHash, issuer.address);
    expect(valid).to.equal(false);
    expect(reason).to.equal("credential revoked");
  });

  it("rejects double revocation", async function () {
    let reverted = false;
    try {
      const nonce = await nextNonce(provider, issuer.address);
      await (await revocationRegistry.connect(issuer).revoke(sampleHash, { nonce })).wait();
    } catch (err) {
      reverted = true;
    }
    expect(reverted).to.equal(true);
  });
});
