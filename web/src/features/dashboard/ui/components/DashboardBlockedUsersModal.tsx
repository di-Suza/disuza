import { Ban, Loader2, LockOpen, UserRound, X } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { useGetBlockedUsersQuery, useUnblockUserMutation } from '@/features/users/api/user.api';
import type { BlockedUserItem } from '@/features/users/model/user.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

type DashboardBlockedUsersModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type BlockedUserRowProps = {
  isUnblocking: boolean;
  item: BlockedUserItem;
  onClose: () => void;
  onUnblock: (userId: string) => void;
};

const getAvatarUrl = (url: unknown): string | null => (
  typeof url === 'string' && url.trim() ? getOptimizedImage(url, 'avatarSmall') || url : null
);

const mergeBlockedUsers = (current: BlockedUserItem[], next: BlockedUserItem[]) => {
  const existingIds = new Set(current.map((item) => item._id));
  return [...current, ...next.filter((item) => !existingIds.has(item._id))];
};

const BlockedUserRow = memo(({ isUnblocking, item, onClose, onUnblock }: BlockedUserRowProps) => {
  if (!item.blockedUser) return null;

  const avatarUrl = getAvatarUrl(item.blockedUser.profilePicture?.url);

  return (
    <article className="dashboard-modal__row dashboard-modal__row--action">
      <Link to={`/profile/${item.blockedUser._id}`} className="dashboard-modal__person" onClick={onClose}>
        <span className="user-row__avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}
        </span>
        <span>
          <strong>{item.blockedUser.userName}</strong>
          <small>{item.blockedUser.headline || 'Blocked profile'}</small>
        </span>
      </Link>
      <Button variant="secondary" onClick={() => onUnblock(item.blockedUser!._id)} isLoading={isUnblocking} loadingLabel="Unblocking user">
        <LockOpen size={16} aria-hidden="true" />Unblock
      </Button>
    </article>
  );
});

BlockedUserRow.displayName = 'BlockedUserRow';

const DashboardBlockedUsersModal = ({ isOpen, onClose }: DashboardBlockedUsersModalProps) => {
  const [page, setPage] = useState(1);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserItem[]>([]);
  const { showError, showSuccess } = useToast();
  const { data, isFetching } = useGetBlockedUsersQuery({ page }, { skip: !isOpen });
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setBlockedUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !data?.blockedUsers.length) return;
    setBlockedUsers((current) => (page === 1 ? data.blockedUsers : mergeBlockedUsers(current, data.blockedUsers)));
  }, [data?.blockedUsers, isOpen, page]);

  const handleUnblock = useCallback(async (userId: string) => {
    try {
      const result = await unblockUser(userId).unwrap();
      showSuccess(result.message);
      setBlockedUsers((current) => current.filter((item) => item.blockedUser?._id !== userId));
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [showError, showSuccess, unblockUser]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <Ban size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Privacy</p>
            <h1>Blocked Users</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label="Close blocked users modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="dashboard-modal__list">
          {isFetching && blockedUsers.length === 0 && <LoadingSpinner className="empty-copy" label="Loading blocked users" />}
          {!isFetching && blockedUsers.length === 0 && <p className="empty-copy">No blocked users.</p>}
          {blockedUsers.map((item) => (
            <BlockedUserRow
              key={item._id}
              isUnblocking={isUnblocking}
              item={item}
              onClose={onClose}
              onUnblock={handleUnblock}
            />
          ))}
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {data?.hasMore && (
            <Button onClick={() => setPage((current) => current + 1)} isLoading={isFetching} loadingLabel="Loading blocked users">
              <Ban size={17} aria-hidden="true" />
              Load more
            </Button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default memo(DashboardBlockedUsersModal);
