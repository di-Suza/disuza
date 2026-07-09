import { Activity, Heart, Loader2, MessageCircle, Trash2, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { useDeleteCommentMutation } from '@/features/comments/api/comment.api';
import { useUnsendMessageMutation } from '@/features/messages/api/chat.api';
import { useUnlikePostMutation } from '@/features/posts/api/post.api';
import { useGetUserAccountHistoryQuery, useUnfollowUserMutation } from '@/features/users/api/user.api';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type DashboardActivityType = 'likes' | 'comments' | 'follows' | 'feedbacks';

type DashboardActivitiesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: DashboardActivityType;
};

type ActivityRecord = Record<string, unknown>;

type ActivityBody = {
  actionLabel: string;
  id: string;
  link?: string;
  subtitle: string;
  title: string;
};

type ActivityCopy = {
  empty: string;
  eyebrow: string;
  title: string;
};

const activityCopy: Record<DashboardActivityType, ActivityCopy> = {
  likes: { eyebrow: 'Activity', title: 'Liked Posts', empty: 'No liked posts yet.' },
  comments: { eyebrow: 'Activity', title: 'Comments', empty: 'No comment activity yet.' },
  follows: { eyebrow: 'Activity', title: 'Followed Users', empty: 'No follow activity yet.' },
  feedbacks: { eyebrow: 'Activity', title: 'Feedback', empty: 'No feedback activity yet.' },
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

const formatDate = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getActivityId = (activity: unknown, index: number): string => {
  const record = asRecord(activity);
  return getString(record?._id) || `activity-${index}`;
};

const getActivityBody = (activity: unknown, type: DashboardActivityType, index: number): ActivityBody => {
  const record = asRecord(activity);
  const id = getActivityId(activity, index);

  if (!record) return { id, title: 'Activity item', subtitle: '', actionLabel: 'Remove' };

  if (type === 'likes') {
    const post = getNestedRecord(record, 'post');
    const postId = getString(post?._id);
    return {
      id,
      title: getString(post?.caption) || 'Liked a post',
      subtitle: formatDate(record.createdAt),
      link: postId ? `/post/${postId}` : undefined,
      actionLabel: 'Unlike',
    };
  }

  if (type === 'comments') {
    const post = getNestedRecord(record, 'post');
    const postId = getString(post?._id);
    return {
      id,
      title: getString(record.comment) || 'Commented on a post',
      subtitle: formatDate(record.createdAt),
      link: postId ? `/post/${postId}` : undefined,
      actionLabel: 'Delete',
    };
  }

  if (type === 'follows') {
    const following = getNestedRecord(record, 'following');
    const followingId = getString(following?._id);
    return {
      id,
      title: getString(following?.userName) || 'Followed a developer',
      subtitle: getString(following?.headline) || formatDate(record.createdAt),
      link: followingId ? `/profile/${followingId}` : undefined,
      actionLabel: 'Unfollow',
    };
  }

  const details = getNestedRecord(record, 'feedbackDetails');
  const feedbackOn = getNestedRecord(record, 'feedbackOn');
  const targetType = getString(feedbackOn?.type);
  const detailId = getString(details?._id);

  return {
    id,
    title: getString(record.text) || 'Feedback activity',
    subtitle: targetType === 'User' ? 'Profile feedback' : 'Post feedback',
    link: detailId ? (targetType === 'User' ? `/profile/${detailId}` : `/post/${detailId}`) : undefined,
    actionLabel: 'Unsend',
  };
};

const DashboardActivitiesModal = ({ isOpen, onClose, type }: DashboardActivitiesModalProps) => {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<unknown[]>([]);
  const [unlikePost, { isLoading: unlikeLoading }] = useUnlikePostMutation();
  const [deleteComment, { isLoading: deleteCommentLoading }] = useDeleteCommentMutation();
  const [unsendMessage, { isLoading: unsendLoading }] = useUnsendMessageMutation();
  const [unfollowUser, { isLoading: unfollowLoading }] = useUnfollowUserMutation();
  const { showError, showSuccess } = useToast();
  const copy = useMemo(() => activityCopy[type], [type]);
  const Icon = activityIcon[type];
  const { data, isFetching } = useGetUserAccountHistoryQuery({ type, page }, { skip: !isOpen });
  const latestActivities = data?.activities || [];
  const isActionLoading = unlikeLoading || deleteCommentLoading || unsendLoading || unfollowLoading;

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setActivities([]);
    }
  }, [isOpen, type]);

  useEffect(() => {
    if (!isOpen || latestActivities.length === 0) return;
    setActivities((current) => (page === 1 ? latestActivities : [...current, ...latestActivities]));
  }, [isOpen, latestActivities, page]);

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

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <Icon size={22} aria-hidden="true" />
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
          {isFetching && activities.length === 0 && <p className="empty-copy">Loading activity...</p>}
          {!isFetching && activities.length === 0 && <p className="empty-copy">{copy.empty}</p>}
          {activities.map((activity, index) => {
            const item = getActivityBody(activity, type, index);
            const content = (
              <>
                <span className="dashboard-modal__icon"><Icon size={18} aria-hidden="true" /></span>
                <span>
                  <strong>{item.title}</strong>
                  {item.subtitle && <small>{item.subtitle}</small>}
                </span>
              </>
            );

            return (
              <article className="dashboard-modal__row dashboard-modal__row--action" key={item.id}>
                {item.link ? <Link to={item.link} className="dashboard-modal__person" onClick={onClose}>{content}</Link> : <span className="dashboard-modal__person">{content}</span>}
                <Button variant="danger" onClick={() => handleActivityAction(activity, index)} disabled={isActionLoading}>
                  {isActionLoading ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Trash2 size={16} aria-hidden="true" />}
                  {item.actionLabel}
                </Button>
              </article>
            );
          })}
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" onClick={onClose}>Close</Button>
          {data?.hasMore && (
            <Button onClick={() => setPage((current) => current + 1)} disabled={isFetching}>
              {isFetching ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Activity size={17} aria-hidden="true" />}
              Load more
            </Button>
          )}
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardActivitiesModal;
export type { DashboardActivityType };