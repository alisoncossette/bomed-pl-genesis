// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IWorldID — Interface for World ID on-chain verifier
/// @dev See https://docs.worldcoin.org/reference/contracts
interface IWorldID {
    /// @notice Verifies a World ID proof
    /// @param root The Merkle root of the identity set
    /// @param groupId The group ID (1 = Orb, 0 = Device)
    /// @param signalHash Hash of the signal (e.g., msg.sender)
    /// @param nullifierHash Unique nullifier for this action + user
    /// @param externalNullifierHash Hash of app_id + action
    /// @param proof The ZK proof (8 uint256 elements)
    function verifyProof(
        uint256 root,
        uint256 groupId,
        uint256 signalHash,
        uint256 nullifierHash,
        uint256 externalNullifierHash,
        uint256[8] calldata proof
    ) external view;
}
