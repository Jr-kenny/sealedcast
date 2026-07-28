import { parseAbi } from 'viem';

export const sealedCastRegistryAbi = parseAbi([
  'function farcasterControllers(uint256 fid) view returns (address)',
  'function registerFarcasterController(uint256 fid)',
  'function bindingNonces(uint256 fid) view returns (uint256)',
  'function accessNonces(uint256 castId, address reader) view returns (uint256)',
  'function qualificationWalletSlots(uint256 fid) view returns (bool[5] active)',
  'function bindQualificationWallet(uint256 fid, uint8 slot, bytes32 encryptedWallet, bytes handleProof, uint64 expiry, bytes verifierSignature)',
  'function unbindQualificationWallet(uint256 fid, uint8 slot)',
  'function requestAccessKey(uint256 castId, uint256 fid, address reader, bytes32 encryptedEligibility, bytes eligibilityProof, uint64 expiry, bytes verifierSignature) returns (bytes32 resultHandle)',
  'function createSealedCast(bytes32 farcasterCastHash, string encryptedContentUri, string publicHint, bool requirementIsPublic, bytes32 policyHash, bytes32 encryptedContentKey, bytes contentKeyProof) returns (uint256 castId)',
  'function linkFarcasterCast(uint256 castId, bytes32 farcasterCastHash)',
  'function getReaderKeyHandle(uint256 castId, address reader) view returns (bytes32)',
  'event SealedCastCreated(uint256 indexed castId, bytes32 indexed farcasterCastHash, address indexed creator)'
]);
