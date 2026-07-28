import { Activity, Heart, Loader2, MessageCircle, UserPlus, X } from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useDeleteCommentMutation } from '@/features/comments/api/comment.api';
import { useUnsendMessageMutation } from '@/features/messages/api/chat.api';
import { useUnlikePostMutation } from '@/features/posts/api/post.api';
import { useGetUserAccountHistoryQuery, useUnfollowUserMutation } from '@/features/users/api/user.api';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import DashboardActivityItem, { type DashboardActivityKind } from './DashboardActivityItem';

type DashboardActivityType = DashboardActivityKind;

type DashboardActivitiesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: DashboardActivityType;
};

type ActivityRecord = Record<string, unknown>;

type DashboardActivityModalRowProps = {
  activity: unknown;
  index: number;
  isLoading: boolean;
  onActivityAction: (activity: unknown, index: number) => void;
  onNavigate: () => void;
  type: DashboardActivityType;
};

const activityCopy: Record<DashboardActivityType, { empty: string; eyebrow: string; title: string }> = {
  likes: { eyebrow: 'Activity History', title: 'Liked Posts', empty: 'No liked posts yet.' },
  comments: { eyebrow: 'Activity History', title: 'Comments', empty: 'No comments yet.' },
  follows: { eyebrow: 'Activity History', title: 'Follows', empty: 'No follows yet.' },
  feedbacks: { eyebrow: 'Activity History', title: 'Feedbacks', empty: 'No feedbacks yet.' },
};

const activityIcon: Record<DashboardActivityType, typeof Activity> = {
  likes: Heart,
  comments: MessageCircle,
  follows: UserPlus,
  feedbacks: Activity,
};

const asRecord = (value: unknown): ActivityRecord | null => (
  typeof value === 'object' && value !== null ? value as ActivityRecord : null
);

const getString = (value: unknown): string => (typeof value === 'string' ? value : '');
const getNestedRecord = (record: ActivityRecord | null, key: string): ActivityRecord | null => (record ? asRecord(record[key]) : null);

const getActivityId = (activity: unknown, index: number): string => {
  const record = asRecord(activity);
  return getString(record?._id) || `activity-${index}`;
};

const mergeActivities = (current: unknown[], next: unknown[]): unknown[] => {
  const existingIds = new Set(current.map((activity, index) => getActivityId(activity, index)));
  return [...current, ...next.filter((activity, index) => !existingIds.has(getActivityId(activity, index)))];
};

const DashboardActivityModalRow = memo(({
  activity,
  index,
  isLoading,
  onActivityAction,
  onNavigate,
  type,
}: DashboardActivityModalRowProps) => {
  const handleAction = useCallback(() => {
    onActivityAction(activity, index);
  }, [activity, index, onActivityAction]);

  return (
    <DashboardActivityItem
      activity={activity}
      isLoading={isLoading}
      onAction={handleAction}
      onNavigate={onNavigate}
      type={type}
    />
  );
});

DashboardActivityModalRow.displayName = 'DashboardActivityModalRow';

const DashboardActivitiesModal = ({ isOpen, onClose, type }: DashboardActivitiesModalProps) => {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<unknown[]>([]);
  const [activitiesType, setActivitiesType] = useState<DashboardActivityType>(type);
  const [unlikePost, { isLoading: unlikeLoading }] = useUnlikePostMutation();
  const [deleteComment, { isLoading: deleteCommentLoading }] = useDeleteCommentMutation();
  const [unsendMessage, { isLoading: unsendLoading }] = useUnsendMessageMutation();
  const [unfollowUser, { isLoading: unfollowLoading }] = useUnfollowUserMutation();
  const { showError, showSuccess } = useToast();
  const copy = useMemo(() => activityCopy[type], [type]);
  const Icon = activityIcon[type];
  const { currentData, isFetching } = useGetUserAccountHistoryQuery({ type, page }, { skip: !isOpen });
  const latestActivities = currentData?.activities || [];
  const isActionLoading = unlikeLoading || deleteCommentLoading || unsendLoading || unfollowLoading;
  const visibleActivities = activitiesType === type ? activities : [];
  const isInitialLoading = (isFetching || activitiesType !== type) && visibleActivities.length === 0;

  useLockBodyScroll(isOpen);

  useLayoutEffect(() => {
    if (isOpen) {
      setPage(1);
      setActivities([]);
      setActivitiesType(type);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen || !currentData) return;
    setActivities((current) => (page === 1 ? latestActivities : mergeActivities(current, latestActivities)));
    setActivitiesType(type);
  }, [currentData, isOpen, latestActivities, page, type]);

  const removeActivity = useCallback((activityId: string) => {
    setActivities((current) => current.filter((activity, index) => getActivityId(activity, index) !== activityId));
  }, []);

  const handleActivityAction = useCallback(async (activity: unknown, index: number) => {
    const record = asRecord(activity);
    if (!record) return;

    const activityId = getActivityId(activity, index);

    try {
      if (type === 'likes') {
        const postId = getString(getNestedRecord(record, 'post')?._id);
        if (!postId) return;
        await unlikePost(postId).unwrap();
        showSuccess('Post unliked.');
      }

      if (type === 'comments') {
        const postId = getString(getNestedRecord(record, 'post')?._id);
        const commentId = getString(record._id);
        const parentCommentId = getString(getNestedRecord(record, 'parentComment')?._id) || undefined;
        if (!postId || !commentId) return;
        await deleteComment({ postId, commentId, parentCommentId }).unwrap();
        showSuccess('Comment deleted.');
      }

      if (type === 'feedbacks') {
        const messageId = getString(record._id);
        const conversationId = getString(record.conversationId);
        if (!messageId) return;
        await unsendMessage({ messageId, conversationId }).unwrap();
        showSuccess('Feedback unsent.');
      }

      if (type === 'follows') {
        const followingId = getString(getNestedRecord(record, 'following')?._id);
        if (!followingId) return;
        await unfollowUser(followingId).unwrap();
        showSuccess('User unfollowed.');
      }

      removeActivity(activityId);
    } catch (error) {
      showError(getErrorMessage(error, 'Activity action failed.'));
    }
  }, [deleteComment, removeActivity, showError, showSuccess, type, unfollowUser, unlikePost, unsendMessage]);

  const handleLoadMore = useCallback(() => {
    setPage((current) => current + 1);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal dashboard-activity-modal-v1" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon"><Icon size={22} aria-hidden="true" /></span>
          <div><p className="state-panel__eyebrow">{copy.eyebrow}</p><h1>{copy.title}</h1></div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label={`Close ${copy.title.toLowerCase()} modal`}>
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="dashboard-modal__list">
          {isInitialLoading && <LoadingSpinner className="empty-copy" label="Loading activity" />}
          {!isFetching && visibleActivities.length === 0 && activitiesType === type && <p className="empty-copy">{copy.empty}</p>}
          <div className="dashboard-activity-v1-list" aria-busy={isFetching}>
            {visibleActivities.map((activity, index) => (
              <DashboardActivityModalRow
                key={getActivityId(activity, index)}
                activity={activity}
                index={index}
                isLoading={isActionLoading}
                onActivityAction={handleActivityAction}
                onNavigate={onClose}
                type={type}
              />
            ))}
          </div>
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {activitiesType === type && currentData?.hasMore && (
            <Button onClick={handleLoadMore} isLoading={isFetching} loadingLabel="Loading activity">
              <Activity size={17} aria-hidden="true" />
              Load more
            </Button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default memo(DashboardActivitiesModal);
export type { DashboardActivityType };
