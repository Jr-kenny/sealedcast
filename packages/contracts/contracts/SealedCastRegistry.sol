// SPDX-License-Identifier: MIT
pragma solidity ^0.8.35;

import {Nox} from "@iexec-nox/nox-protocol-contracts/contracts/sdk/Nox.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "encrypted-types/EncryptedTypes.sol";

contract SealedCastRegistry is EIP712 {
    uint8 public constant MAX_WALLETS = 5;
    uint8 public constant MAX_AUDIENCE_WALLETS = 5;
    bytes32 private constant WALLET_BINDING_TYPEHASH = keccak256(
        "WalletBinding(uint256 fid,uint8 slot,bytes32 encryptedWalletHandle,uint256 nonce,uint64 expiry)"
    );

    struct QualificationWallets {
        euint256[MAX_WALLETS] wallets;
        bool[MAX_WALLETS] active;
    }

    struct SealedCast {
        address creator;
        bytes32 farcasterCastHash;
        string encryptedContentUri;
        string publicHint;
        bool requirementIsPublic;
        euint256 encryptedContentKey;
        euint256[MAX_AUDIENCE_WALLETS] audience;
        uint8 audienceWalletCount;
        bool exists;
    }

    address public owner;
    address public walletVerifier;
    uint256 public nextCastId = 1;
    mapping(uint256 => address) public farcasterControllers;
    mapping(uint256 => uint256) public bindingNonces;
    mapping(uint256 => QualificationWallets) private qualificationWallets;
    mapping(uint256 => SealedCast) private sealedCasts;
    mapping(uint256 => mapping(address => euint256)) private readerKeyHandles;

    event FarcasterControllerRegistered(uint256 indexed fid, address indexed controller);
    event QualificationWalletBound(uint256 indexed fid, uint8 indexed slot);
    event QualificationWalletUnbound(uint256 indexed fid, uint8 indexed slot);
    event SealedCastCreated(uint256 indexed castId, bytes32 indexed farcasterCastHash, address indexed creator);
    event FarcasterCastLinked(uint256 indexed castId, bytes32 indexed farcasterCastHash);
    event AccessKeyRequested(uint256 indexed castId, uint256 indexed fid, address indexed reader);

    error Unauthorized();
    error InvalidInput();
    error InvalidSlot();
    error SlotOccupied();
    error SlotEmpty();
    error InvalidAttestation();
    error AttestationExpired();
    error InvalidAudience();
    error CastNotFound();
    error CastAlreadyExists();

    constructor(address verifier) EIP712("SealedCastRegistry", "1") {
        if (verifier == address(0)) revert InvalidInput();
        owner = msg.sender;
        walletVerifier = verifier;
    }

    modifier onlyController(uint256 fid) {
        if (farcasterControllers[fid] != msg.sender) revert Unauthorized();
        _;
    }

    function registerFarcasterController(uint256 fid) external {
        if (fid == 0) revert InvalidInput();
        address current = farcasterControllers[fid];
        if (current != address(0) && current != msg.sender) revert Unauthorized();
        farcasterControllers[fid] = msg.sender;
        emit FarcasterControllerRegistered(fid, msg.sender);
    }

    function bindQualificationWallet(
        uint256 fid,
        uint8 slot,
        externalEuint256 encryptedWallet,
        bytes calldata handleProof,
        uint64 expiry,
        bytes calldata verifierSignature
    ) external onlyController(fid) {
        if (slot >= MAX_WALLETS) revert InvalidSlot();
        if (qualificationWallets[fid].active[slot]) revert SlotOccupied();
        if (block.timestamp > expiry) revert AttestationExpired();

        euint256 wallet = Nox.fromExternal(encryptedWallet, handleProof);
        bytes32 digest = _hashTypedDataV4(keccak256(abi.encode(
            WALLET_BINDING_TYPEHASH,
            fid,
            slot,
            externalEuint256.unwrap(encryptedWallet),
            bindingNonces[fid],
            expiry
        )));
        if (ECDSA.recover(digest, verifierSignature) != walletVerifier) {
            revert InvalidAttestation();
        }

        qualificationWallets[fid].wallets[slot] = wallet;
        qualificationWallets[fid].active[slot] = true;
        bindingNonces[fid]++;
        emit QualificationWalletBound(fid, slot);
    }

    function unbindQualificationWallet(uint256 fid, uint8 slot) external onlyController(fid) {
        if (slot >= MAX_WALLETS) revert InvalidSlot();
        if (!qualificationWallets[fid].active[slot]) revert SlotEmpty();
        qualificationWallets[fid].wallets[slot] = euint256.wrap(bytes32(0));
        qualificationWallets[fid].active[slot] = false;
        bindingNonces[fid]++;
        emit QualificationWalletUnbound(fid, slot);
    }

    function createSealedCast(
        bytes32 farcasterCastHash,
        string calldata encryptedContentUri,
        string calldata publicHint,
        bool requirementIsPublic,
        externalEuint256 encryptedContentKey,
        bytes calldata contentKeyProof,
        externalEuint256[] calldata encryptedAudienceWallets,
        bytes[] calldata audienceProofs
    ) external returns (uint256 castId) {
        uint256 length = encryptedAudienceWallets.length;
        if (length == 0 || length > MAX_AUDIENCE_WALLETS || length != audienceProofs.length) {
            revert InvalidAudience();
        }
        castId = nextCastId++;
        SealedCast storage castData = sealedCasts[castId];
        castData.creator = msg.sender;
        castData.farcasterCastHash = farcasterCastHash;
        castData.encryptedContentUri = encryptedContentUri;
        castData.publicHint = publicHint;
        castData.requirementIsPublic = requirementIsPublic;
        castData.encryptedContentKey = Nox.fromExternal(encryptedContentKey, contentKeyProof);
        castData.audienceWalletCount = uint8(length);
        castData.exists = true;
        for (uint8 i; i < length; i++) {
            castData.audience[i] = Nox.fromExternal(encryptedAudienceWallets[i], audienceProofs[i]);
        }
        emit SealedCastCreated(castId, farcasterCastHash, msg.sender);
    }

    function linkFarcasterCast(uint256 castId, bytes32 farcasterCastHash) external {
        SealedCast storage castData = sealedCasts[castId];
        if (!castData.exists) revert CastNotFound();
        if (castData.creator != msg.sender) revert Unauthorized();
        if (castData.farcasterCastHash != bytes32(0)) revert CastAlreadyExists();
        castData.farcasterCastHash = farcasterCastHash;
        emit FarcasterCastLinked(castId, farcasterCastHash);
    }

    function requestAccessKey(uint256 castId, uint256 fid, address reader)
        external onlyController(fid) returns (bytes32 resultHandle)
    {
        SealedCast storage castData = sealedCasts[castId];
        if (!castData.exists) revert CastNotFound();
        euint256 result = Nox.toEuint256(0);
        QualificationWallets storage wallets = qualificationWallets[fid];
        for (uint8 i; i < MAX_WALLETS; i++) {
            if (!wallets.active[i]) continue;
            for (uint8 j; j < castData.audienceWalletCount; j++) {
                result = Nox.select(
                    Nox.eq(wallets.wallets[i], castData.audience[j]),
                    castData.encryptedContentKey,
                    result
                );
            }
        }
        Nox.allow(result, reader);
        readerKeyHandles[castId][reader] = result;
        emit AccessKeyRequested(castId, fid, reader);
        return euint256.unwrap(result);
    }

    function getReaderKeyHandle(uint256 castId, address reader) external view returns (bytes32) {
        return euint256.unwrap(readerKeyHandles[castId][reader]);
    }

    function qualificationWalletSlots(uint256 fid) external view returns (bool[MAX_WALLETS] memory) {
        return qualificationWallets[fid].active;
    }

    function getSealedCast(uint256 castId) external view returns (
        address creator,
        bytes32 farcasterCastHash,
        string memory encryptedContentUri,
        string memory publicHint,
        bool requirementIsPublic,
        uint8 audienceWalletCount
    ) {
        SealedCast storage castData = sealedCasts[castId];
        if (!castData.exists) revert CastNotFound();
        return (
            castData.creator,
            castData.farcasterCastHash,
            castData.encryptedContentUri,
            castData.requirementIsPublic ? castData.publicHint : "",
            castData.requirementIsPublic,
            castData.requirementIsPublic ? castData.audienceWalletCount : 0
        );
    }
}
