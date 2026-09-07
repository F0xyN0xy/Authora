/**
 * Quick Start Example - Authora SDK
 *
 * The simplest way to get started with Authora
 */

import { createAuthoraSDK } from 'authora';
import { ethers } from 'ethers';

// Connect to your Ethereum node
const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');
const signer = await provider.getSigner();

// Initialize the SDK
const authora = createAuthoraSDK({
  registryAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  revocationAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  provider: provider,
  signer: signer
});

// Issue a credential
const credential = await authora.issuer.issueCredential(
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', // holder address
  {
    name: 'John Doe',
    degree: 'Bachelor of Science',
    university: 'Tech University'
  }
);

console.log('Credential issued:', credential.credentialHash);

// Store it (holder side)
authora.holder.storeCredential(credential);

// Create a presentation (selective disclosure)
const presentation = authora.holder.createPresentation(
  credential.credentialHash,
  ['name', 'degree'] // Only reveal these
);

// Verify it
const result = await authora.verifier.verifyPresentation(presentation);
console.log('Valid:', result.valid);
console.log('Attributes:', result.attributes);
