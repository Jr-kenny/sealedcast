import type {
  NeynarCast,
  NeynarFeedResponse,
  NeynarNotificationsResponse,
  NeynarSigner,
  NeynarUserRecord
} from './types/neynar';
import type { PaginatedTweetsType } from './paginated-tweets';
import type { Tweet } from './types/tweet';
import type { TopicType } from './types/topic';
import type { User, UsersMapType } from './types/user';
import { resolveSealedCastReference } from './sealed-casts/reference';
import type { UserFull } from './types/user';

const NEYNAR_API = 'https://api.neynar.com/v2/farcaster';

function apiKey(): string {
  const value = process.env.NEYNAR_API_KEY;
  if (!value) throw new Error('Neynar API is not configured');
  return value;
}

export async function getApprovedNeynarSigner(
  signerUuid: string,
  expectedFid?: string
): Promise<NeynarSigner | null> {
  const response = await fetch(
    `${NEYNAR_API}/signer?signer_uuid=${encodeURIComponent(signerUuid)}`,
    { headers: { 'x-api-key': apiKey() } }
  );
  if (!response.ok) return null;
  const signer = (await response.json()) as NeynarSigner;
  const canPublish =
    !signer.permissions ||
    signer.permissions.includes('WRITE_ALL') ||
    signer.permissions.includes('PUBLISH_CAST');
  if (
    signer.status !== 'approved' ||
    !signer.fid ||
    (expectedFid && signer.fid.toString() !== expectedFid) ||
    !canPublish
  ) {
    return null;
  }
  return signer;
}

export async function getNeynarUser(
  fidOrUsername: string,
  viewerFid?: string
): Promise<UserFull | null> {
  const isFid = /^\d+$/.test(fidOrUsername);
  const endpoint = isFid
    ? `${NEYNAR_API}/user/bulk?fids=${encodeURIComponent(fidOrUsername)}`
    : `${NEYNAR_API}/user/by_username?username=${encodeURIComponent(
        fidOrUsername.toLowerCase()
      )}`;
  const url = new URL(endpoint);
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey() }
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    users?: NeynarUserRecord[];
    user?: NeynarUserRecord;
  };
  const user = body.user ?? body.users?.[0];
  if (
    !user ||
    (isFid
      ? user.fid.toString() !== fidOrUsername
      : user.username.toLowerCase() !== fidOrUsername.toLowerCase())
  ) {
    return null;
  }
  return {
    id: user.fid.toString(),
    bio: user.profile?.bio?.text ?? null,
    name: user.display_name || user.username,
    username: user.username,
    photoURL: user.pfp_url || '',
    verified: Boolean(user.verified_addresses?.eth_addresses?.length),
    theme: null,
    accent: null,
    website: null,
    location: null,
    following: [],
    followers: [],
    followingCount: user.following_count ?? 0,
    followerCount: user.follower_count ?? 0,
    viewerFollowing: user.viewer_context?.following ?? false,
    createdAt: user.registered_at
      ? new Date(
          typeof user.registered_at === 'number'
            ? user.registered_at * 1000
            : user.registered_at
        )
      : new Date(),
    updatedAt: null,
    totalTweets: 0,
    totalPhotos: 0,
    pinnedTweet: null,
    coverPhotoURL: user.profile?.banner?.url ?? null,
    interests: [],
    address:
      user.verified_addresses?.primary?.eth_address ??
      user.verified_addresses?.eth_addresses?.[0] ??
      null
  };
}

function toUser(user: NeynarUserRecord): User {
  return {
    id: user.fid.toString(),
    bio: user.profile?.bio?.text ?? null,
    name: user.display_name || user.username,
    username: user.username,
    photoURL: user.pfp_url || '',
    verified: Boolean(user.verified_addresses?.eth_addresses?.length),
    viewerFollowing: user.viewer_context?.following ?? false
  };
}

export async function getNeynarFollowUsers({
  fid,
  viewerFid,
  type,
  limit,
  cursor
}: {
  fid: string;
  viewerFid?: string;
  type: 'following' | 'followers';
  limit: number;
  cursor?: string;
}): Promise<{ users: User[]; nextPageCursor: string | null }> {
  const url = new URL(`${NEYNAR_API}/${type}/`);
  url.searchParams.set('fid', fid);
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 100).toString());
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error(`Neynar could not load ${type}`);
  const body = (await response.json()) as {
    users: Array<{ user?: NeynarUserRecord } & Partial<NeynarUserRecord>>;
    next?: { cursor?: string | null };
  };
  return {
    users: body.users.map((entry) =>
      toUser(entry.user ?? (entry as NeynarUserRecord))
    ),
    nextPageCursor: body.next?.cursor ?? null
  };
}

function toTopic(cast: NeynarCast): TopicType | null {
  const url = cast.parent_url || cast.root_parent_url;
  if (!url || !cast.channel) return null;
  return {
    name: cast.channel.name || `/${cast.channel.id}`,
    description: `Farcaster /${cast.channel.id} channel`,
    image: cast.channel.image_url,
    url
  };
}

function toTweet(cast: NeynarCast, viewerFid?: string): Tweet {
  const imageEmbeds = (cast.embeds ?? []).filter((embed) =>
    embed.metadata?.content_type?.startsWith('image/')
  );
  const externalEmbeds = (cast.embeds ?? [])
    .filter((embed) => embed.url && !imageEmbeds.includes(embed))
    .map((embed) => ({
      url: embed.url!,
      contentType: embed.metadata?.content_type
    }));
  const topic = toTopic(cast);
  const likeCount = cast.reactions?.likes_count ?? 0;
  const recastCount = cast.reactions?.recasts_count ?? 0;
  const userLikes = Array.from({ length: likeCount }, (_, index) =>
    index === 0 && viewerFid && cast.viewer_context?.liked
      ? viewerFid
      : `like-${cast.hash}-${index}`
  );
  const userRetweets = Array.from({ length: recastCount }, (_, index) =>
    index === 0 && viewerFid && cast.viewer_context?.recasted
      ? viewerFid
      : `recast-${cast.hash}-${index}`
  );

  return {
    id: cast.hash.replace(/^0x/, ''),
    text: cast.text,
    images: imageEmbeds.length
      ? imageEmbeds.map((embed) => ({
          src: embed.url!,
          alt: '',
          id: embed.url!
        }))
      : null,
    embeds: externalEmbeds,
    parent: cast.parent_hash
      ? {
          id: cast.parent_hash.replace(/^0x/, ''),
          userId: cast.parent_author?.fid?.toString()
        }
      : null,
    userLikes,
    createdBy: cast.author.fid.toString(),
    user: null,
    createdAt: new Date(cast.timestamp),
    updatedAt: null,
    deletedAt: null,
    userReplies: cast.replies?.count ?? 0,
    userRetweets,
    mentions: (cast.mentioned_profiles ?? []).map((user, index) => ({
      userId: user.fid.toString(),
      position: cast.mentioned_profiles_ranges?.[index]?.start ?? 0,
      username: user.username,
      user: toUser(user)
    })),
    client: 'Farcaster',
    topic,
    topicUrl: topic?.url ?? null,
    retweet: null,
    sealedCast: resolveSealedCastReference(externalEmbeds)
  };
}

function castsToPage(
  casts: NeynarCast[],
  viewerFid?: string,
  nextPageCursor: string | null = null
): PaginatedTweetsType {
  const users: UsersMapType<User> = {};
  for (const cast of casts) {
    users[cast.author.fid.toString()] = toUser(cast.author);
    for (const mentioned of cast.mentioned_profiles ?? []) {
      users[mentioned.fid.toString()] = toUser(mentioned);
    }
  }
  return {
    tweets: casts.map((cast) => toTweet(cast, viewerFid)),
    users,
    nextPageCursor
  };
}

export async function searchNeynarUsers(
  query: string,
  viewerFid?: string,
  limit = 5
): Promise<User[]> {
  const url = new URL(`${NEYNAR_API}/user/search/`);
  url.searchParams.set('q', query);
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 10).toString());
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not search users');
  const body = (await response.json()) as {
    result?: { users?: NeynarUserRecord[] };
  };
  return (body.result?.users ?? []).map(toUser);
}

export async function getNeynarCast(
  hash: string,
  viewerFid?: string
): Promise<{ tweet: Tweet; users: UsersMapType<User> } | null> {
  const url = new URL(`${NEYNAR_API}/cast/`);
  url.searchParams.set(
    'identifier',
    hash.startsWith('0x') ? hash : `0x${hash}`
  );
  url.searchParams.set('type', 'hash');
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Neynar could not load the cast');
  const body = (await response.json()) as { cast?: NeynarCast };
  if (!body.cast) return null;
  const page = castsToPage([body.cast], viewerFid);
  return { tweet: page.tweets[0], users: page.users as UsersMapType<User> };
}

export async function getNeynarCastReplies({
  hash,
  viewerFid,
  limit,
  cursor
}: {
  hash: string;
  viewerFid?: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedTweetsType> {
  const url = new URL(`${NEYNAR_API}/cast/conversation/`);
  url.searchParams.set(
    'identifier',
    hash.startsWith('0x') ? hash : `0x${hash}`
  );
  url.searchParams.set('type', 'hash');
  url.searchParams.set('reply_depth', '1');
  url.searchParams.set('include_chronological_parent_casts', 'false');
  url.searchParams.set('sort_type', 'chron');
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 50).toString());
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load replies');
  const body = (await response.json()) as {
    conversation?: { cast?: NeynarCast & { direct_replies?: NeynarCast[] } };
    next?: { cursor?: string | null };
  };
  return castsToPage(
    body.conversation?.cast?.direct_replies ?? [],
    viewerFid,
    body.next?.cursor ?? null
  );
}

export async function getNeynarUserLikes({
  fid,
  viewerFid,
  limit,
  cursor
}: {
  fid: string;
  viewerFid?: string;
  limit: number;
  cursor?: string;
}): Promise<PaginatedTweetsType> {
  const url = new URL(`${NEYNAR_API}/reactions/user/`);
  url.searchParams.set('fid', fid);
  url.searchParams.set('type', 'likes');
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 100).toString());
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load liked casts');
  const body = (await response.json()) as {
    reactions?: Array<{ cast?: NeynarCast }>;
    next?: { cursor?: string | null };
  };
  return castsToPage(
    (body.reactions ?? []).flatMap((reaction) =>
      reaction.cast ? [reaction.cast] : []
    ),
    viewerFid,
    body.next?.cursor ?? null
  );
}

export async function getNeynarFeed({
  fid,
  limit,
  cursor,
  topicUrl,
  ordering
}: {
  fid: string;
  limit: number;
  cursor?: string;
  topicUrl?: string;
  ordering?: 'latest' | 'top';
}): Promise<PaginatedTweetsType> {
  const url = topicUrl
    ? new URL(`${NEYNAR_API}/feed/parent_urls/`)
    : ordering === 'top'
    ? new URL(`${NEYNAR_API}/feed/trending/`)
    : new URL(`${NEYNAR_API}/feed/`);

  if (topicUrl) url.searchParams.set('parent_urls', topicUrl);
  else if (ordering !== 'top') {
    url.searchParams.set('feed_type', 'following');
    url.searchParams.set('fid', fid);
    url.searchParams.set('with_recasts', 'true');
  } else {
    url.searchParams.set('time_window', '24h');
  }
  url.searchParams.set('viewer_fid', fid);
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 10).toString());
  if (cursor && cursor !== '0') url.searchParams.set('cursor', cursor);

  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load the feed');
  const body = (await response.json()) as NeynarFeedResponse;
  return castsToPage(body.casts, fid, body.next?.cursor ?? null);
}

export async function getNeynarUserCasts({
  fid,
  viewerFid,
  limit,
  cursor,
  includeReplies
}: {
  fid: string;
  viewerFid?: string;
  limit: number;
  cursor?: string;
  includeReplies: boolean;
}): Promise<PaginatedTweetsType> {
  const url = new URL(`${NEYNAR_API}/feed/user/casts/`);
  url.searchParams.set('fid', fid);
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 100).toString());
  url.searchParams.set('include_replies', includeReplies ? 'true' : 'false');
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load user casts');
  const body = (await response.json()) as NeynarFeedResponse;
  return castsToPage(body.casts, viewerFid, body.next?.cursor ?? null);
}

export async function getNeynarTrendingTopics(
  limit: number
): Promise<Array<{ topic: TopicType; volume: number }>> {
  const url = new URL(`${NEYNAR_API}/feed/trending/`);
  url.searchParams.set('limit', '10');
  url.searchParams.set('time_window', '24h');
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load trending topics');
  const body = (await response.json()) as NeynarFeedResponse;
  const topics = new Map<string, { topic: TopicType; volume: number }>();
  for (const cast of body.casts) {
    const topic = toTopic(cast);
    if (!topic) continue;
    const engagement =
      1 +
      (cast.reactions?.likes_count ?? 0) +
      (cast.reactions?.recasts_count ?? 0) +
      (cast.replies?.count ?? 0);
    const current = topics.get(topic.url);
    topics.set(topic.url, {
      topic,
      volume: (current?.volume ?? 0) + engagement
    });
  }
  return [...topics.values()]
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}

export async function setNeynarFollow({
  signerUuid,
  targetFid,
  remove
}: {
  signerUuid: string;
  targetFid: number;
  remove: boolean;
}): Promise<void> {
  const response = await fetch(`${NEYNAR_API}/user/follow/`, {
    method: remove ? 'DELETE' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey()
    },
    body: JSON.stringify({ signer_uuid: signerUuid, target_fids: [targetFid] })
  });
  const body = (await response.json()) as {
    success?: boolean;
    message?: string;
    details?: Array<{ success: boolean }>;
  };
  if (
    !response.ok ||
    !body.success ||
    body.details?.some((item) => !item.success)
  ) {
    throw new Error(body.message || 'Neynar could not update the follow');
  }
}

export async function setNeynarReaction({
  signerUuid,
  target,
  targetAuthorFid,
  reactionType,
  remove,
  idem
}: {
  signerUuid: string;
  target: string;
  targetAuthorFid: number;
  reactionType: 'like' | 'recast';
  remove: boolean;
  idem: string;
}): Promise<void> {
  const response = await fetch(`${NEYNAR_API}/reaction/`, {
    method: remove ? 'DELETE' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey()
    },
    body: JSON.stringify({
      signer_uuid: signerUuid,
      reaction_type: reactionType,
      target,
      target_author_fid: targetAuthorFid,
      idem
    })
  });
  const body = (await response.json()) as {
    success?: boolean;
    message?: string;
  };
  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Neynar could not update the reaction');
  }
}

export async function deleteNeynarCast({
  signerUuid,
  targetHash
}: {
  signerUuid: string;
  targetHash: string;
}): Promise<void> {
  const response = await fetch(`${NEYNAR_API}/cast/`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey()
    },
    body: JSON.stringify({
      signer_uuid: signerUuid,
      target_hash: targetHash
    })
  });
  const body = (await response.json()) as {
    success?: boolean;
    message?: string;
  };
  if (!response.ok || !body.success) {
    throw new Error(body.message || 'Neynar could not delete the cast');
  }
}

export async function getNeynarCastReactionUsers({
  hash,
  type,
  viewerFid,
  limit,
  cursor
}: {
  hash: string;
  type: 'likes' | 'recasts';
  viewerFid?: string;
  limit: number;
  cursor?: string;
}): Promise<{ users: User[]; nextPageCursor: string | null }> {
  const url = new URL(`${NEYNAR_API}/reactions/cast/`);
  url.searchParams.set('hash', hash);
  url.searchParams.set('types', type);
  url.searchParams.set('limit', Math.min(Math.max(limit, 1), 100).toString());
  if (viewerFid && /^\d+$/.test(viewerFid)) {
    url.searchParams.set('viewer_fid', viewerFid);
  }
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, { headers: { 'x-api-key': apiKey() } });
  if (!response.ok) throw new Error('Neynar could not load cast reactions');
  const body = (await response.json()) as {
    reactions: Array<{ user: NeynarUserRecord }>;
    next?: { cursor?: string | null };
  };
  return {
    users: body.reactions.map(({ user }) => toUser(user)),
    nextPageCursor: body.next?.cursor ?? null
  };
}

export async function getNeynarNotifications(
  fid: string,
  cursor?: string
): Promise<NeynarNotificationsResponse> {
  const url = new URL(`${NEYNAR_API}/notifications`);
  url.searchParams.set('fid', fid);
  url.searchParams.set('limit', '25');
  if (cursor) url.searchParams.set('cursor', cursor);
  const response = await fetch(url, {
    headers: { 'x-api-key': apiKey() }
  });
  if (!response.ok) throw new Error('Neynar could not load notifications');
  return (await response.json()) as NeynarNotificationsResponse;
}

export type NeynarCastInput = {
  signerUuid: string;
  text: string;
  embeds?: Array<{ url: string }>;
  parent?: string;
  parentAuthorFid?: number;
  idem: string;
};

export async function publishNeynarCast(input: NeynarCastInput): Promise<{
  hash: string;
  author: { fid: number };
  text: string;
}> {
  const response = await fetch(`${NEYNAR_API}/cast/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey()
    },
    body: JSON.stringify({
      signer_uuid: input.signerUuid,
      text: input.text,
      embeds: input.embeds,
      parent: input.parent,
      parent_author_fid: input.parentAuthorFid,
      idem: input.idem
    })
  });
  const body = (await response.json()) as {
    cast?: { hash: string; author: { fid: number }; text: string };
    message?: string;
  };
  if (!response.ok || !body.cast) {
    throw new Error(body.message || 'Neynar could not publish the cast');
  }
  return body.cast;
}
