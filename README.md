# Authora

> Privacy-preserving verifiable credentials on Ethereum

Authora is a decentralized credential management system that allows organizations to issue, holders to store, and verifiers to check verifiable credentials while maintaining privacy through zero-knowledge proofs and Merkle trees.

## 🌟 Features

- **Privacy-First**: Only credential hashes stored on-chain, never personal data
- **Selective Disclosure**: Prove you have a credential without revealing all attributes
- **Revocation Support**: Credentials can be revoked when needed
- **Zero-Knowledge Proofs**: Uses Merkle trees for cryptographic verification
- **Easy Integration**: Clean JavaScript/TypeScript SDK

## 📦 Installation

```bash
npm install authora
```

## 🚀 Quick Start

```javascript
import { createAuthoraSDK } from 'authora';
import { ethers } from 'ethers';

// Connect to Ethereum
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = await provider.getSigner();

// Initialize SDK
const authora = createAuthoraSDK({
  registryAddress: '0x...',
  revocationAddress: '0x...',
  provider: provider,
  signer: signer
});

// Issue a credential
const credential = await authora.issuer.issueCredential(
  '0x...', // holder address
  {
    name: 'Alice Johnson',
    degree: 'Bachelor of Science',
    university: 'Tech University'
  }
);

// Store it (holder side)
authora.holder.storeCredential(credential);

// Create selective disclosure (only reveal some attributes)
const presentation = authora.holder.createPresentation(
  credential.credentialHash,
  ['name', 'degree'] // Only these are revealed
);

// Verify it
const result = await authora.verifier.verifyPresentation(presentation);
console.log('Valid:', result.valid);
console.log('Revealed:', result.attributes);
```

## 📖 Use Cases

- **Education**: Digital diplomas and certificates
- **Employment**: Verifiable work credentials
- **Identity**: Age verification without revealing birthdate
- **Licensing**: Professional certifications
- **Healthcare**: Medical credentials and certifications

## 🏗️ Architecture

### Smart Contracts

- **CredentialRegistry**: Records credential commitments on-chain
- **RevocationRegistry**: Manages credential revocation

### SDK Components

- **CredentialIssuer**: Issue credentials to holders
- **CredentialHolder**: Store and present credentials with selective disclosure
- **CredentialVerifier**: Verify presentations and check revocation status
- **RevocationManager**: Revoke credentials when needed

## 🔐 How It Works

1. **Issuance**: 
   - Issuer creates a credential with attributes
   - A Merkle tree is built from the attributes (each salted)
   - Only the Merkle root is stored on-chain

2. **Storage**:
   - Holder receives the full credential (attributes + salts)
   - Stored privately in holder's wallet

3. **Presentation**:
   - Holder selects which attributes to disclose
   - Creates Merkle proofs for selected attributes only
   - Sends presentation to verifier

4. **Verification**:
   - Verifier checks the on-chain commitment exists
   - Verifies the credential is not revoked
   - Validates Merkle proofs against the root
   - Only disclosed attributes are revealed

## 📚 API Reference

### `createAuthoraSDK(config)`

Initialize the SDK with contract addresses and provider.

**Parameters:**
- `config.registryAddress` (string): CredentialRegistry contract address
- `config.revocationAddress` (string): RevocationRegistry contract address
- `config.provider` (ethers.Provider): Ethers provider
- `config.signer` (ethers.Signer): Signer for transactions (optional)

**Returns:** SDK instance with `issuer`, `holder`, `verifier`, `revocation`

### CredentialIssuer

#### `issueCredential(holderAddress, attributes)`

Issue a new credential.

**Parameters:**
- `holderAddress` (string): Ethereum address of the holder
- `attributes` (Object): Credential attributes (e.g., `{ name, degree, ... }`)

**Returns:** `{ credentialHash, merkleTree, transaction, holder, attributes }`

#### `credentialExists(credentialHash)`

Check if a credential exists on-chain.

### CredentialHolder

#### `storeCredential(credential)`

Store a credential received from an issuer.

#### `createPresentation(credentialHash, attributesToDisclose)`

Create a selective disclosure presentation.

**Parameters:**
- `credentialHash` (string): The credential identifier
- `attributesToDisclose` (Array): Array of attribute keys to reveal

**Returns:** `{ credentialHash, root, disclosures, presentedAt }`

#### `exportCredential(credentialHash)`

Export credential as JSON for backup.

#### `importCredential(credentialJson)`

Import a credential from backup.

#### `listCredentials()`

List all stored credential hashes.

### CredentialVerifier

#### `verifyPresentation(presentation)`

Verify a credential presentation.

**Returns:** `{ valid, reason?, attributes }`

#### `isRevoked(credentialHash)`

Check if a credential is revoked.

#### `exists(credentialHash)`

Check if a credential exists on-chain.

### RevocationManager

#### `revokeCredential(credentialHash)`

Revoke a credential.

#### `isRevoked(credentialHash)`

Check revocation status.

#### `batchRevokeCredentials(credentialHashes)`

Revoke multiple credentials.

## 🛠️ Development

### Prerequisites

- Node.js 18+
- Hardhat for local blockchain

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/authora.git
cd authora

# Install dependencies
npm install

# Compile contracts
npm run compile

# Start local blockchain (in separate terminal)
npm run node

# Deploy contracts
npm run deploy

# Run tests
npm test

# Run complete example
npm run example
```

### Project Structure

```
authora/
├── src/
│   ├── index.js           # Main SDK entry point
│   └── lib/
│       ├── issuer.js      # Credential issuance
│       ├── holder.js      # Credential storage & presentation
│       ├── verifier.js    # Verification logic
│       ├── revocation.js  # Revocation management
│       └── merkle.js      # Merkle tree utilities
├── contracts/
│   ├── CredentialRegistry.sol
│   └── RevocationRegistry.sol
├── examples/
│   ├── quick-start.js
│   └── complete-example.js
├── scripts/              # Deployment & interaction scripts
└── test/                 # Contract tests
```

## 🔒 Security Considerations

- **Private Key Management**: Never expose private keys
- **Salt Security**: Salts are crucial for privacy - keep them secret
- **On-chain Privacy**: Only credential hashes go on-chain
- **Revocation**: Check revocation status before accepting credentials
- **Smart Contract Audits**: Audit contracts before production use

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

Built with:
- [Ethers.js](https://docs.ethers.org/) - Ethereum library
- [Hardhat](https://hardhat.org/) - Development environment
- [MerkleTree.js](https://github.com/merkletreejs/merkletreejs) - Merkle tree implementation

## 📧 Contact

- Author: F0xyN0xy
- Issues: [GitHub Issues](https://github.com/yourusername/authora/issues)

---

Made with ❤️ for the decentralized web
