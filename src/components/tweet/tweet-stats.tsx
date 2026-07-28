/* eslint-disable react-hooks/exhaustive-deps */

import cn from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { ViewTweetStats } from '@components/view/view-tweet-stats';
import type { Tweet } from '@lib/types/tweet';
import {
  createReactionMessage,
  submitHubMessage
} from '../../lib/farcaster/utils';
import { TweetOption } from './tweet-option';
import { TweetShare } from './tweet-share';
import { ReactionType } from '@farcaster/hub-web';
import { useAuth } from '../../lib/context/auth-context';
import { toast } from 'react-hot-toast';

type TweetStatsProps = Pick<
  Tweet,
  'userLikes' | 'userRetweets' | 'userReplies'
> & {
  reply?: boolean;
  userId: string;
  isOwner: boolean;
  tweetId: string;
  viewTweet?: boolean;
  tweetAuthorId: string;
  openModal?: () => void;
};

export function TweetStats({
  reply,
  userId,
  isOwner,
  tweetId,
  userLikes,
  viewTweet,
  userRetweets,
  userReplies: totalReplies,
  tweetAuthorId,
  openModal
}: TweetStatsProps): JSX.Element {
  const { user } = useAuth();

  const totalLikes = userLikes.length;
  const totalRetweets = userRetweets.length;

  const [currentStats, setCurrentStats] = useState({
    currentReplies: totalReplies,
    currentLikes: totalLikes,
    currentRetweets: totalRetweets
  });

  const { currentReplies, currentRetweets, currentLikes } = currentStats;

  useEffect(() => {
    setCurrentStats({
      currentReplies: totalReplies,
      currentLikes: totalLikes,
      currentRetweets: totalRetweets
    });
  }, [totalReplies, totalLikes, totalRetweets]);

  const replyMove = useMemo(
    () => (totalReplies > currentReplies ? -25 : 25),
    [totalReplies]
  );

  const likeMove = useMemo(
    () => (totalLikes > currentLikes ? -25 : 25),
    [totalLikes]
  );

  const tweetMove = useMemo(
    () => (totalRetweets > currentRetweets ? -25 : 25),
    [totalRetweets]
  );

  const [tweetIsLiked, setTweetIsLiked] = useState(
    Boolean(user && userLikes.includes(userId))
  );
  const [tweetIsRetweeted, setTweetIsRetweeted] = useState(
    Boolean(user && userRetweets.includes(userId))
  );

  useEffect(() => {
    setTweetIsLiked(Boolean(user && userLikes.includes(userId)));
    setTweetIsRetweeted(Boolean(user && userRetweets.includes(userId)));
  }, [user?.id, userLikes, userRetweets, userId]);

  const updateNeynarReaction = async (
    reactionType: 'like' | 'recast',
    remove: boolean
  ): Promise<boolean> => {
    if (!user?.neynarSignerUuid) return false;
    const response = await fetch('/api/neynar/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: user.id,
        signerUuid: user.neynarSignerUuid,
        target: tweetId,
        targetAuthorFid: tweetAuthorId,
        reactionType,
        action: remove ? 'remove' : 'add',
        idem: crypto.randomUUID()
      })
    });
    const body = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(body.error || 'Reaction failed');
    return true;
  };

  const isStatsVisible = !!(totalReplies || totalRetweets || totalLikes);

  return (
    <>
      {viewTweet && (
        <ViewTweetStats
          likeMove={likeMove}
          userLikes={userLikes}
          tweetMove={tweetMove}
          replyMove={replyMove}
          userRetweets={userRetweets}
          currentLikes={currentLikes}
          currentTweets={currentRetweets}
          currentReplies={currentReplies}
          isStatsVisible={isStatsVisible}
          tweetId={tweetId}
        />
      )}
      <div
        className={cn(
          'flex text-light-secondary inner:outline-none dark:text-dark-secondary',
          viewTweet ? 'justify-around py-2' : 'max-w-md justify-between'
        )}
      >
        <TweetOption
          className='hover:text-accent-blue focus-visible:text-accent-blue'
          iconClassName='group-hover:bg-accent-blue/10 group-active:bg-accent-blue/20 
                         group-focus-visible:bg-accent-blue/10 group-focus-visible:ring-accent-blue/80'
          tip='Reply'
          move={replyMove}
          disabled={!user?.keyPair && !user?.neynarSignerUuid}
          stats={currentReplies}
          iconName='ChatBubbleOvalLeftIcon'
          viewTweet={viewTweet}
          onClick={openModal}
        />
        <TweetOption
          className={cn(
            'hover:text-accent-green focus-visible:text-accent-green',
            tweetIsRetweeted && 'text-accent-green [&>i>svg]:[stroke-width:2px]'
          )}
          iconClassName='group-hover:bg-accent-green/10 group-active:bg-accent-green/20
                         group-focus-visible:bg-accent-green/10 group-focus-visible:ring-accent-green/80'
          tip={tweetIsRetweeted ? 'Undo Recast' : 'Recast'}
          move={tweetMove}
          disabled={!user?.keyPair && !user?.neynarSignerUuid}
          stats={currentRetweets}
          iconName='ArrowPathRoundedSquareIcon'
          viewTweet={viewTweet}
          onClick={async () => {
            const beforeStats = { ...currentStats };
            const beforeTweetIsRetweeted = tweetIsRetweeted;

            setCurrentStats({
              currentReplies,
              currentLikes,
              currentRetweets: tweetIsRetweeted
                ? Math.max(0, currentRetweets - 1)
                : currentRetweets + 1
            });
            setTweetIsRetweeted(!tweetIsRetweeted);

            if (user?.neynarSignerUuid) {
              try {
                await updateNeynarReaction('recast', tweetIsRetweeted);
              } catch (error) {
                setCurrentStats(beforeStats);
                setTweetIsRetweeted(beforeTweetIsRetweeted);
                toast.error(
                  error instanceof Error ? error.message : 'Recast failed'
                );
              }
              return;
            }
            const message = await createReactionMessage({
              castHash: tweetId,
              castAuthorFid: parseInt(tweetAuthorId),
              fid: parseInt(userId),
              type: ReactionType.RECAST,
              remove: tweetIsRetweeted
            });
            if (!message) {
              console.error('Error creating recast message');
              return;
            }

            const result = await submitHubMessage(message);

            if (!result?.hash) {
              setCurrentStats(beforeStats);
              setTweetIsRetweeted(beforeTweetIsRetweeted);
            }
          }}
        />
        <TweetOption
          className={cn(
            'hover:text-accent-pink focus-visible:text-accent-pink',
            tweetIsLiked && 'text-accent-pink [&>i>svg]:fill-accent-pink'
          )}
          iconClassName='group-hover:bg-accent-pink/10 group-active:bg-accent-pink/20
                         group-focus-visible:bg-accent-pink/10 group-focus-visible:ring-accent-pink/80'
          tip={tweetIsLiked ? 'Unlike' : 'Like'}
          move={likeMove}
          disabled={!user?.keyPair && !user?.neynarSignerUuid}
          stats={currentLikes}
          iconName='HeartIcon'
          viewTweet={viewTweet}
          onClick={async () => {
            const beforeStats = { ...currentStats };
            const beforeTweetIsLiked = tweetIsLiked;

            setCurrentStats({
              currentReplies,
              currentRetweets,
              currentLikes: tweetIsLiked
                ? Math.max(0, currentLikes - 1)
                : currentLikes + 1
            });
            setTweetIsLiked(!tweetIsLiked);

            if (user?.neynarSignerUuid) {
              try {
                await updateNeynarReaction('like', tweetIsLiked);
              } catch (error) {
                setCurrentStats(beforeStats);
                setTweetIsLiked(beforeTweetIsLiked);
                toast.error(
                  error instanceof Error ? error.message : 'Like failed'
                );
              }
              return;
            }
            const message = await createReactionMessage({
              castHash: tweetId,
              castAuthorFid: parseInt(tweetAuthorId),
              fid: parseInt(userId),
              type: ReactionType.LIKE,
              remove: tweetIsLiked
            });
            if (!message) {
              console.error('Error creating like message');
              return;
            }
            const result = await submitHubMessage(message);

            if (!result?.hash) {
              setCurrentStats(beforeStats);
              setTweetIsLiked(beforeTweetIsLiked);
            }
          }}
        />
        <TweetShare userId={userId} tweetId={tweetId} viewTweet={viewTweet} />
      </div>
    </>
  );
}
