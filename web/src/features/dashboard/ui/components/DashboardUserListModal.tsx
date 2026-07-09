import { Loader2, UserRound, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { useGetFollowersQuery, useGetFollowingQuery } from '@/features/users/api/user.api';
import type { UserProfile } from '@/features/users/model/user.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';

type DashboardUserListType = 'followers' | 'following';

type DashboardUserListModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: DashboardUserListType;
  userId?: string;
};

const getAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);

const getModalCopy = (type: DashboardUserListType) => (
  type === 'followers'
    ? { title: 'Followers', eyebrow: 'Network', empty: 'No followers yet.' }
    : { title: 'Following', eyebrow: 'Network', empty: 'Not following anyone yet.' }
);

const getUserList = (
  type: DashboardUserListType,
  followers?: UserProfile[],
  following?: UserProfile[],
): UserProfile[] => (type === 'followers' ? followers || [] : following || []);

const mergeUsers = (current: UserProfile[], next: UserProfile[]) => {
  const existingIds = new Set(current.map((user) => user._id));
  return [...current, ...next.filter((user) => !existingIds.has(user._id))];
};

const DashboardUserListModal = ({ isOpen, onClose, type, userId }: DashboardUserListModalProps) => {
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const copy = useMemo(() => getModalCopy(type), [type]);
  const shouldSkip = !isOpen || !userId;

  const followersQuery = useGetFollowersQuery({ userId: userId || '', page }, { skip: shouldSkip || type !== 'followers' });
  const followingQuery = useGetFollowingQuery({ userId: userId || '', page }, { skip: shouldSkip || type !== 'following' });

  const activeQuery = type === 'followers' ? followersQuery : followingQuery;
  const latestUsers = getUserList(type, followersQuery.data?.followers, followingQuery.data?.following);

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setUsers([]);
    }
  }, [isOpen, type, userId]);

  useEffect(() => {
    if (!isOpen || latestUsers.length === 0) return;
    setUsers((current) => (page === 1 ? latestUsers : mergeUsers(current, latestUsers)));
  }, [isOpen, latestUsers, page]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <UsersRound size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label={`Close ${copy.title.toLowerCase()} modal`}>
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="dashboard-modal__list">
          {activeQuery.isFetching && users.length === 0 && <p className="empty-copy">Loading people...</p>}
          {!activeQuery.isFetching && users.length === 0 && <p className="empty-copy">{copy.empty}</p>}
          {users.map((profile) => (
            <Link to={`/profile/${profile._id}`} className="dashboard-modal__row" key={profile._id} onClick={onClose}>
              <span className="user-row__avatar">
                {getAvatarUrl(profile.profilePicture?.url) ? <img src={profile.profilePicture?.url} alt="" /> : <UserRound size={18} aria-hidden="true" />}
              </span>
              <span>
                <strong>{profile.userName}</strong>
                <small>{profile.headline || 'DevLoopFeed member'}</small>
              </span>
            </Link>
          ))}
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {activeQuery.data?.hasMore && (
            <Button onClick={() => setPage((current) => current + 1)} disabled={activeQuery.isFetching}>
              {activeQuery.isFetching ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <UsersRound size={17} aria-hidden="true" />}
              Load more
            </Button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardUserListModal;
export type { DashboardUserListType };
