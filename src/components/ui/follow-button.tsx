import { ActionModal } from '@components/modal/action-modal';
import { Modal } from '@components/modal/modal';
import { Button } from '@components/ui/button';
import { useAuth } from '@lib/context/auth-context';
import { useModal } from '@lib/hooks/useModal';
import { preventBubbling } from '@lib/utils';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  createFollowMessage,
  submitHubMessage
} from '../../lib/farcaster/utils';

type FollowButtonProps = {
  userTargetId: string;
  userTargetUsername: string;
  initiallyFollowing?: boolean;
};

export function FollowButton({
  userTargetId,
  userTargetUsername,
  initiallyFollowing = false
}: FollowButtonProps): JSX.Element | null {
  const { user } = useAuth();
  const { open, openModal, closeModal } = useModal();
  const [loading, setLoading] = useState(false);
  const [userIsFollowed, setUserIsFollowed] = useState(
    initiallyFollowing || !!user?.following?.includes(userTargetId)
  );

  useEffect(() => {
    setUserIsFollowed(
      initiallyFollowing || !!user?.following?.includes(userTargetId)
    );
  }, [initiallyFollowing, user?.following, userTargetId]);

  if (user?.id === userTargetId) return null;

  const updateNeynarFollow = async (
    action: 'follow' | 'unfollow'
  ): Promise<boolean> => {
    if (!user?.id || !user.neynarSignerUuid) return false;
    const response = await fetch('/api/neynar/follow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: user.id,
        signerUuid: user.neynarSignerUuid,
        targetFid: userTargetId,
        action
      })
    });
    const body = (await response.json()) as {
      result?: { following: boolean };
      error?: string;
    };
    if (!response.ok || !body.result) {
      throw new Error(body.error || `Failed to ${action} this account`);
    }
    return body.result.following;
  };

  const updateLegacyFollow = async (remove: boolean): Promise<boolean> => {
    if (!user?.id) return false;
    const message = await createFollowMessage({
      fid: Number(user.id),
      targetFid: Number(userTargetId),
      remove
    });
    return Boolean(message && (await submitHubMessage(message)));
  };

  const handleFollow = async (): Promise<void> => {
    if (!user?.id) {
      toast.error(`Failed to follow @${userTargetUsername}`);
      return;
    }
    setLoading(true);
    try {
      const following = user.neynarSignerUuid
        ? await updateNeynarFollow('follow')
        : await updateLegacyFollow(false);
      if (!following) throw new Error('Farcaster rejected the follow');
      setUserIsFollowed(true);
      toast.success(`Following @${userTargetUsername}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to follow @${userTargetUsername}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (): Promise<void> => {
    if (!user?.id) {
      toast.error(`Failed to unfollow @${userTargetUsername}`);
      return;
    }
    setLoading(true);
    try {
      const following = user.neynarSignerUuid
        ? await updateNeynarFollow('unfollow')
        : !(await updateLegacyFollow(true));
      if (following) throw new Error('Farcaster rejected the unfollow');
      setUserIsFollowed(false);
      toast.success(`Unfollowed @${userTargetUsername}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to unfollow @${userTargetUsername}`
      );
    } finally {
      setLoading(false);
      closeModal();
    }
  };

  return (
    <>
      <Modal
        modalClassName='flex flex-col gap-6 max-w-xs bg-main-background w-full p-8 rounded-2xl'
        open={open}
        closeModal={closeModal}
      >
        <ActionModal
          title={`Unfollow @${userTargetUsername}?`}
          description='Their casts will no longer show up in your home timeline.'
          mainBtnLabel={loading ? 'Unfollowing...' : 'Unfollow'}
          action={handleUnfollow}
          closeModal={closeModal}
        />
      </Modal>
      {userIsFollowed ? (
        <Button
          className='dark-bg-tab min-w-[106px] self-start border border-light-line-reply px-4 py-1.5 
                     font-bold hover:border-accent-red hover:bg-accent-red/10 hover:text-accent-red
                     hover:before:content-["Unfollow"] inner:hover:hidden dark:border-light-secondary'
          onClick={preventBubbling(openModal)}
          disabled={loading}
        >
          <span>Following</span>
        </Button>
      ) : (
        <Button
          className='self-start border bg-light-primary px-4 py-1.5 font-bold text-white hover:bg-light-primary/90 
                     focus-visible:bg-light-primary/90 active:bg-light-border/75 dark:bg-light-border 
                     dark:text-light-primary dark:hover:bg-light-border/90 dark:focus-visible:bg-light-border/90 
                     dark:active:bg-light-border/75'
          onClick={preventBubbling(handleFollow)}
          disabled={loading || (!user?.keyPair && !user?.neynarSignerUuid)}
        >
          {loading ? 'Following...' : 'Follow'}
        </Button>
      )}
    </>
  );
}
