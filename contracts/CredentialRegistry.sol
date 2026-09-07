// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RevocationRegistry.sol";

/// @title CredentialRegistry
/// @notice Records commitments to verifiable credentials. A "credential hash" is the Merkle root
///         computed off-chain over the credential's individual attributes (see wallet/merkle.js).
///         Only the hash is ever stored on-chain — no personal data touches the ledger.
contract CredentialRegistry {
    struct CredentialRecord {
        address issuer;
        address subject;      // the holder's wallet address the credential was issued to
        uint256 issuedAt;
        bool exists;
    }

    RevocationRegistry public immutable revocationRegistry;

    // credentialHash (Merkle root) => record
    mapping(bytes32 => CredentialRecord) public credentials;

    event CredentialIssued(
        bytes32 indexed credentialHash,
        address indexed issuer,
        address indexed subject,
        uint256 issuedAt
    );

    error CredentialAlreadyExists();
    error CredentialDoesNotExist();

    constructor(address revocationRegistryAddress) {
        revocationRegistry = RevocationRegistry(revocationRegistryAddress);
    }

    /// @notice Issuer registers a new credential commitment for a subject.
    /// @param credentialHash Merkle root over the credential's attributes.
    /// @param subject The holder's address the credential belongs to.
    function issueCredential(bytes32 credentialHash, address subject) external {
        if (credentials[credentialHash].exists) revert CredentialAlreadyExists();

        credentials[credentialHash] = CredentialRecord({
            issuer: msg.sender,
            subject: subject,
            issuedAt: block.timestamp,
            exists: true
        });

        revocationRegistry.setAuthority(credentialHash, msg.sender);

        emit CredentialIssued(credentialHash, msg.sender, subject, block.timestamp);
    }

    /// @notice Full verification: hash is registered, issuer matches claim, and not revoked.
    function verifyCredential(bytes32 credentialHash, address expectedIssuer)
        external
        view
        returns (bool valid, string memory reason)
    {
        CredentialRecord memory rec = credentials[credentialHash];

        if (!rec.exists) {
            return (false, "credential not registered");
        }
        if (rec.issuer != expectedIssuer) {
            return (false, "issuer mismatch");
        }
        if (revocationRegistry.isRevoked(credentialHash)) {
            return (false, "credential revoked");
        }
        return (true, "valid");
    }

    function getCredential(bytes32 credentialHash) external view returns (CredentialRecord memory) {
        if (!credentials[credentialHash].exists) revert CredentialDoesNotExist();
        return credentials[credentialHash];
    }
}
