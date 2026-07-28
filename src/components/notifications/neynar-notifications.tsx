import Link from 'next/link';
import useSWR from 'swr';
import { Error } from '@components/ui/error';
import { Loading } from '@components/ui/loading';
import { UserAvatar } from '@components/user/user-avatar';
import type {
  NeynarNotification,
  NeynarNotificationsResponse
} from '@lib/types/neynar';

function action(notification: NeynarNotification): string {
  const count = notification.count ?? 1;
  const others =
    count > 1 ? ` and ${count - 1} other${count - 1 === 1 ? '' : 's'}` : '';
  switch (notification.type) {
    case 'follows':
      return `${others} followed you`;
    case 'likes':
      return `${others} liked your cast`;
    case 'recasts':
      return `${others} recasted your cast`;
    case 'reply':
      return ' replied to your cast';
    case 'mention':
      return ' mentioned you';
    case 'quote':
      return ' quoted your cast';
    default:
      return ` interacted with you`;
  }
}

export function NeynarNotifications({ fid }: { fid: string }): JSX.Element {
  const { data, error, isValidating } = useSWR<NeynarNotificationsResponse>(
    `/api/neynar/notifications?fid=${fid}`
  );
  if (isValidating && !data) return <Loading className='mt-5' />;
  if (error || !data) return <Error message='Could not load notifications' />;
  if (data.notifications.length === 0) {
    return <Error message='No recent notifications' />;
  }
  return (
    <section className='mt-0.5 xs:mt-0'>
      {data.notifications.map((notification, index) => {
        const actor =
          notification.follows?.[0]?.user ??
          notification.reactions?.[0]?.user ??
          notification.cast?.author;
        if (!actor) return null;
        const castId = notification.cast?.hash.replace(/^0x/, '');
        return (
          <article
            className='flex gap-3 border-b border-light-border px-4 py-4 dark:border-dark-border'
            key={`${notification.type}-${notification.most_recent_timestamp}-${index}`}
          >
            <Link href={`/user/${actor.username}`}>
              <UserAvatar
                src={actor.pfp_url}
                alt={actor.display_name}
                username={actor.username}
                size={42}
              />
            </Link>
            <div className='min-w-0 flex-1'>
              <p>
                <Link
                  className='font-bold hover:underline'
                  href={`/user/${actor.username}`}
                >
                  {actor.display_name || `@${actor.username}`}
                </Link>
                {action(notification)}
              </p>
              {castId && notification.cast?.text && (
                <Link
                  className='mt-1 block break-words text-light-secondary hover:underline dark:text-dark-secondary'
                  href={`/tweet/${castId}`}
                >
                  {notification.cast.text}
                </Link>
              )}
              <time className='mt-1 block text-xs text-light-secondary dark:text-dark-secondary'>
                {new Date(notification.most_recent_timestamp).toLocaleString()}
              </time>
            </div>
          </article>
        );
      })}
    </section>
  );
}
