// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title RevocationRegistry
/// @notice Tracks revocation status of credentials by their commitment hash (e.g. a Merkle root
///         over the credential's attributes). Only the original issuer of a credential may revoke it.
contract RevocationRegistry {
    // credentialHash => issuer that is allowed to revoke it
    mapping(bytes32 => address) public authorizedIssuer;
    // credentialHash => revoked?
    mapping(bytes32 => bool) private _revoked;

    event RevocationAuthoritySet(bytes32 indexed credentialHash, address indexed issuer);
    event CredentialRevoked(bytes32 indexed credentialHash, address indexed issuer, uint256 timestamp);

    error NotAuthorized();
    error AlreadyAuthorized();
    error AlreadyRevoked();

    /// @dev Called by CredentialRegistry at issuance time to record who is allowed to revoke.
    function setAuthority(bytes32 credentialHash, address issuer) external {
        if (authorizedIssuer[credentialHash] != address(0)) revert AlreadyAuthorized();
        authorizedIssuer[credentialHash] = issuer;
        emit RevocationAuthoritySet(credentialHash, issuer);
    }

    function revoke(bytes32 credentialHash) external {
        if (authorizedIssuer[credentialHash] != msg.sender) revert NotAuthorized();
        if (_revoked[credentialHash]) revert AlreadyRevoked();
        _revoked[credentialHash] = true;
        emit CredentialRevoked(credentialHash, msg.sender, block.timestamp);
    }

    function isRevoked(bytes32 credentialHash) external view returns (bool) {
        return _revoked[credentialHash];
    }
}
