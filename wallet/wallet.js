import fs from "fs";
import path from "path";
import { ethers } from "ethers";

class Wallet {
  constructor(storageDir) {
    this.storageDir = storageDir;
    fs.mkdirSync(storageDir, { recursive: true });
    this.keyFile = path.join(storageDir, "keypair.json");
    this.credentialsFile = path.join(storageDir, "credentials.json");
  }

  /// Creates a new key pair and DID-like identifier derived from the public address.
  generateIdentity() {
    const signer = ethers.Wallet.createRandom();
    const identity = {
      did: `did:example:${signer.address.toLowerCase()}`,
      address: signer.address,
      privateKey: signer.privateKey,
    };
    fs.writeFileSync(this.keyFile, JSON.stringify(identity, null, 2));
    return identity;
  }

  loadIdentity() {
    if (!fs.existsSync(this.keyFile)) {
      throw new Error(`No identity found in ${this.storageDir}. Call generateIdentity() first.`);
    }
    return JSON.parse(fs.readFileSync(this.keyFile, "utf8"));
  }

  getSigner(provider) {
    const identity = this.loadIdentity();
    return new ethers.Wallet(identity.privateKey, provider);
  }

  /// Stores a full issued credential (attributes, salts, root, issuer signature, proofs)
  /// locally so the holder can later selectively disclose parts of it.
  saveCredential(credential) {
    const all = this.listCredentials();
    all.push(credential);
    fs.writeFileSync(this.credentialsFile, JSON.stringify(all, null, 2));
  }

  listCredentials() {
    if (!fs.existsSync(this.credentialsFile)) return [];
    return JSON.parse(fs.readFileSync(this.credentialsFile, "utf8"));
  }
}

export { Wallet };
