export type NeynarAuth = {
  fid: string;
  signerUuid: string;
};

export type NeynarSigner = {
  fid: number;
  signer_uuid: string;
  status: 'generated' | 'pending_approval' | 'approved' | 'revoked';
  permissions?: string[];
};

export type NeynarSignInResult = {
  fid: number;
  signer_uuid: string;
  is_authenticated: true;
};

export type NeynarNotificationUser = {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
};

export type NeynarNotification = {
  type: string;
  count?: number;
  most_recent_timestamp: string;
  follows?: Array<{ user: NeynarNotificationUser }>;
  reactions?: Array<{ user: NeynarNotificationUser }>;
  cast?: {
    hash: string;
    text: string;
    author: NeynarNotificationUser;
  };
};

export type NeynarNotificationsResponse = {
  notifications: NeynarNotification[];
  next?: { cursor?: string | null };
  unseen_notifications_count?: number;
};

export type NeynarUserRecord = {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
  profile?: { bio?: { text?: string }; banner?: { url?: string } };
  follower_count?: number;
  following_count?: number;
  registered_at?: number | string;
  verified_addresses?: {
    primary?: { eth_address?: string | null };
    eth_addresses?: string[];
  };
  viewer_context?: {
    following?: boolean;
    followed_by?: boolean;
  };
};

export type NeynarCast = {
  hash: string;
  text: string;
  timestamp: string;
  author: NeynarUserRecord;
  parent_hash?: string | null;
  parent_author?: { fid?: number } | null;
  parent_url?: string | null;
  root_parent_url?: string | null;
  embeds?: Array<{
    url?: string;
    metadata?: { content_type?: string };
  }>;
  mentioned_profiles?: NeynarUserRecord[];
  mentioned_profiles_ranges?: Array<{ start: number; end: number }>;
  reactions?: {
    likes_count?: number;
    recasts_count?: number;
  };
  replies?: { count?: number };
  channel?: {
    id: string;
    name?: string;
    image_url?: string;
  } | null;
  viewer_context?: { liked?: boolean; recasted?: boolean };
};

export type NeynarFeedResponse = {
  casts: NeynarCast[];
  next?: { cursor?: string | null };
};
