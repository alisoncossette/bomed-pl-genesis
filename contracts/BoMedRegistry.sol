// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { IWorldID } from "./IWorldID.sol";

/// @title BoMed Registry — World Chain
/// @notice Registers verified humans and healthcare practices on World Chain.
///         PHI stays off-chain (Bolospot). Only identity verification and
///         practice registration live here.
contract BoMedRegistry {
    // ─── World ID ──────────────────────────────────────────────────

    IWorldID public immutable worldId;
    string public appId;
    string public actionId;
    uint256 public immutable groupId = 1; // Orb verification

    // ─── Verified Humans ───────────────────────────────────────────

    struct VerifiedHuman {
        bool isVerified;
        uint256 verifiedAt;
        string boloHandle; // optional, links to Bolospot identity
    }

    mapping(uint256 => VerifiedHuman) public humans; // nullifierHash => human
    mapping(string => uint256) public handleToNullifier; // boloHandle => nullifierHash

    // ─── Practices ─────────────────────────────────────────────────

    struct Practice {
        string name;
        string handle; // Bolospot @handle
        string practiceType; // PT, OT, SLP, etc.
        address owner; // wallet that registered it
        uint256 ownerNullifier; // must be a verified human
        bool isActive;
        uint256 registeredAt;
    }

    Practice[] public practices;
    mapping(string => uint256) public handleToPracticeId;

    // ─── Copayments ────────────────────────────────────────────────

    struct Copayment {
        uint256 patientNullifier;
        uint256 practiceId;
        uint256 amount;
        uint256 paidAt;
        string appointmentRef; // opaque reference, not PHI
    }

    Copayment[] public copayments;
    mapping(uint256 => uint256[]) public patientCopayments; // nullifier => copayment indices

    // ─── Events ────────────────────────────────────────────────────

    event HumanVerified(uint256 indexed nullifierHash, uint256 timestamp);
    event HandleLinked(uint256 indexed nullifierHash, string handle);
    event PracticeRegistered(uint256 indexed practiceId, string name, string handle);
    event PracticeDeactivated(uint256 indexed practiceId);
    event CopaymentPaid(
        uint256 indexed practiceId,
        uint256 indexed patientNullifier,
        uint256 amount,
        string appointmentRef
    );

    // ─── Errors ────────────────────────────────────────────────────

    error AlreadyVerified();
    error NotVerified();
    error HandleAlreadyLinked();
    error PracticeNotFound();
    error NotPracticeOwner();
    error InsufficientPayment();

    // ─── Constructor ───────────────────────────────────────────────

    constructor(address _worldId, string memory _appId, string memory _actionId) {
        worldId = IWorldID(_worldId);
        appId = _appId;
        actionId = _actionId;
    }

    // ─── Verify Human ──────────────────────────────────────────────

    /// @notice Verify a human using World ID proof
    /// @param nullifierHash Unique identifier from World ID (not reversible to identity)
    /// @param root Merkle root of the World ID set
    /// @param proof ZK proof from World ID
    function verifyHuman(
        uint256 nullifierHash,
        uint256 root,
        uint256[8] calldata proof
    ) external {
        if (humans[nullifierHash].isVerified) revert AlreadyVerified();

        // Verify the World ID proof on-chain
        worldId.verifyProof(
            root,
            groupId,
            abi.encodePacked(msg.sender).length == 0
                ? uint256(0)
                : uint256(uint160(msg.sender)),
            nullifierHash,
            abi.encodePacked(appId, actionId).length == 0
                ? uint256(0)
                : uint256(keccak256(abi.encodePacked(appId, actionId))),
            proof
        );

        humans[nullifierHash] = VerifiedHuman({
            isVerified: true,
            verifiedAt: block.timestamp,
            boloHandle: ""
        });

        emit HumanVerified(nullifierHash, block.timestamp);
    }

    /// @notice Link a Bolospot handle to a verified human
    function linkHandle(uint256 nullifierHash, string calldata handle) external {
        if (!humans[nullifierHash].isVerified) revert NotVerified();
        if (handleToNullifier[handle] != 0) revert HandleAlreadyLinked();

        humans[nullifierHash].boloHandle = handle;
        handleToNullifier[handle] = nullifierHash;

        emit HandleLinked(nullifierHash, handle);
    }

    /// @notice Check if a nullifier hash is verified
    function isVerified(uint256 nullifierHash) external view returns (bool) {
        return humans[nullifierHash].isVerified;
    }

    // ─── Practice Registry ─────────────────────────────────────────

    /// @notice Register a healthcare practice (must be a verified human)
    function registerPractice(
        uint256 ownerNullifier,
        string calldata name,
        string calldata handle,
        string calldata practiceType
    ) external {
        if (!humans[ownerNullifier].isVerified) revert NotVerified();

        uint256 practiceId = practices.length;
        practices.push(Practice({
            name: name,
            handle: handle,
            practiceType: practiceType,
            owner: msg.sender,
            ownerNullifier: ownerNullifier,
            isActive: true,
            registeredAt: block.timestamp
        }));

        handleToPracticeId[handle] = practiceId;

        emit PracticeRegistered(practiceId, name, handle);
    }

    /// @notice Deactivate a practice (owner only)
    function deactivatePractice(uint256 practiceId) external {
        if (practiceId >= practices.length) revert PracticeNotFound();
        if (practices[practiceId].owner != msg.sender) revert NotPracticeOwner();

        practices[practiceId].isActive = false;

        emit PracticeDeactivated(practiceId);
    }

    /// @notice Get total number of registered practices
    function practiceCount() external view returns (uint256) {
        return practices.length;
    }

    // ─── Copayments ────────────────────────────────────────────────

    /// @notice Pay copayment for an appointment
    /// @param practiceId The practice to pay
    /// @param patientNullifier Patient's verified nullifier hash
    /// @param appointmentRef Opaque reference (not PHI — just an ID)
    function payCopay(
        uint256 practiceId,
        uint256 patientNullifier,
        string calldata appointmentRef
    ) external payable {
        if (practiceId >= practices.length) revert PracticeNotFound();
        if (!practices[practiceId].isActive) revert PracticeNotFound();
        if (!humans[patientNullifier].isVerified) revert NotVerified();
        if (msg.value == 0) revert InsufficientPayment();

        uint256 copayId = copayments.length;
        copayments.push(Copayment({
            patientNullifier: patientNullifier,
            practiceId: practiceId,
            amount: msg.value,
            paidAt: block.timestamp,
            appointmentRef: appointmentRef
        }));

        patientCopayments[patientNullifier].push(copayId);

        // Forward payment to practice owner
        (bool sent, ) = practices[practiceId].owner.call{value: msg.value}("");
        require(sent, "Payment failed");

        emit CopaymentPaid(practiceId, patientNullifier, msg.value, appointmentRef);
    }

    /// @notice Get copayment count for a patient
    function getCopaymentCount(uint256 patientNullifier) external view returns (uint256) {
        return patientCopayments[patientNullifier].length;
    }
}
