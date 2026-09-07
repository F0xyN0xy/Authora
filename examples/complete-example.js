/**
 * Authora SDK - Complete Usage Example
 *
 * This example demonstrates the full credential lifecycle:
 * 1. Issuer creates and issues a credential
 * 2. Holder stores and creates a selective disclosure
 * 3. Verifier checks the presentation
 * 4. Issuer revokes the credential (optional)
 */

import { ethers } from 'ethers';
import { createAuthoraSDK } from '../src/index.js';

async function main() {
  // ============================================================
  // Setup: Connect to blockchain
  // ============================================================

  // For local development (Hardhat node)
  const provider = new ethers.JsonRpcProvider('http://127.0.0.1:8545');

  // Get signers (accounts from Hardhat node)
  const [issuer, holder, verifier] = await provider.listAccounts();
  const issuerSigner = await provider.getSigner(issuer);
  const holderAddress = holder.address;

  // Contract addresses (replace with your deployed addresses)
  const REGISTRY_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
  const REVOCATION_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';

  // Initialize SDK
  const sdk = createAuthoraSDK({
    registryAddress: REGISTRY_ADDRESS,
    revocationAddress: REVOCATION_ADDRESS,
    provider: provider,
    signer: issuerSigner
  });

  console.log('🚀 Authora SDK Example\n');

  // ============================================================
  // Step 1: Issuer Issues a Credential
  // ============================================================

  console.log('📝 Step 1: Issuing credential...');

  const credentialAttributes = {
    name: 'Alice Johnson',
    degree: 'Bachelor of Science',
    university: 'Example University',
    graduationYear: '2024',
    gpa: '3.8'
  };

  const issuedCredential = await sdk.issuer.issueCredential(
    holderAddress,
    credentialAttributes
  );

  console.log('✅ Credential issued!');
  console.log(`   Hash: ${issuedCredential.credentialHash}`);
  console.log(`   Tx: ${issuedCredential.transaction}`);
  console.log('');

  // ============================================================
  // Step 2: Holder Stores the Credential
  // ============================================================

  console.log('💾 Step 2: Holder stores credential...');

  sdk.holder.storeCredential(issuedCredential);

  console.log('✅ Credential stored!');
  console.log(`   Total credentials: ${sdk.holder.listCredentials().length}`);
  console.log('');

  // ============================================================
  // Step 3: Holder Creates a Selective Disclosure
  // ============================================================

  console.log('🎭 Step 3: Creating selective disclosure...');
  console.log('   (Only revealing: name, degree, university)');

  const presentation = sdk.holder.createPresentation(
    issuedCredential.credentialHash,
    ['name', 'degree', 'university'] // Only disclose these attributes
    // Note: gpa and graduationYear remain private!
  );

  console.log('✅ Presentation created!');
  console.log('');

  // ============================================================
  // Step 4: Verifier Verifies the Presentation
  // ============================================================

  console.log('🔍 Step 4: Verifying presentation...');

  const verificationResult = await sdk.verifier.verifyPresentation(presentation);

  if (verificationResult.valid) {
    console.log('✅ Credential is VALID!');
    console.log('   Verified attributes:');
    for (const [key, value] of Object.entries(verificationResult.attributes)) {
      console.log(`     ${key}: ${value}`);
    }
  } else {
    console.log('❌ Credential is INVALID!');
    console.log(`   Reason: ${verificationResult.reason}`);
  }
  console.log('');

  // ============================================================
  // Step 5 (Optional): Revoke the Credential
  // ============================================================

  console.log('🚫 Step 5: Revoking credential...');

  const revocation = await sdk.revocation.revokeCredential(
    issuedCredential.credentialHash
  );

  console.log('✅ Credential revoked!');
  console.log(`   Tx: ${revocation.transactionHash}`);
  console.log('');

  // ============================================================
  // Step 6: Verify Again (Should Fail After Revocation)
  // ============================================================

  console.log('🔍 Step 6: Verifying again after revocation...');

  const secondVerification = await sdk.verifier.verifyPresentation(presentation);

  if (!secondVerification.valid) {
    console.log('❌ Credential is now INVALID (as expected)');
    console.log(`   Reason: ${secondVerification.reason}`);
  }
  console.log('');

  // ============================================================
  // Bonus: Export/Import Credentials
  // ============================================================

  console.log('💼 Bonus: Export/Import example...');

  // Export for backup
  const exported = sdk.holder.exportCredential(issuedCredential.credentialHash);
  console.log('✅ Credential exported to JSON');

  // Create a new holder instance and import
  const newHolder = sdk.holder;
  newHolder.deleteCredential(issuedCredential.credentialHash); // Remove first
  newHolder.importCredential(exported);
  console.log('✅ Credential imported successfully');
  console.log('');

  console.log('🎉 Example complete!');
}

// Run the example
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
