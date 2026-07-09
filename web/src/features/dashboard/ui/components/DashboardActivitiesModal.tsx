import { Activity, Heart, Loader2, MessageCircle, UserPlus, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import { useGetUserAccountHistoryQuery } from '@/features/users/api/user.api';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';

type DashboardActivityType = 'likes' | 'comments' | 'follows' | 'feedbacks';

type DashboardActivitiesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: DashboardActivityType;
};

type ActivityRecord = Record<string, unknown>;

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

const getNestedRecord = (record: ActivityRecord, key: string): ActivityRecord | null => asRecord(record[key]);

const formatDate = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getActivityBody = (activity: unknown, type: DashboardActivityType) => {
  const record = asRecord(activity);
  if (!record) return { title: 'Activity item', subtitle: '' };

  if (type === 'likes') {
    const post = getNestedRecord(record, 'post');
    return {
      title: getString(post?.caption) || 'Liked a post',
      subtitle: formatDate(record.createdAt),
      link: getString(post?._id) ? '/home' : undefined,
    };
  }

  if (type === 'follows') {
    const following = getNestedRecord(record, 'following');
    return {
      title: getString(following?.userName) || 'Followed a developer',
      subtitle: getString(following?.headline) || formatDate(record.createdAt),
      link: getString(following?._id) ? `/profile/${getString(following?._id)}` : undefined,
    };
  }

  return {
    title: type === 'comments' ? 'Comment activity' : 'Feedback activity',
    subtitle: formatDate(record.createdAt),
  };
};

const DashboardActivitiesModal = ({ isOpen, onClose, type }: DashboardActivitiesModalProps) => {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<unknown[]>([]);
  const copy = useMemo(() => activityCopy[type], [type]);
  const Icon = activityIcon[type];
  const { data, isFetching } = useGetUserAccountHistoryQuery({ type, page }, { skip: !isOpen });
  const latestActivities = data?.activities || [];

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
            const item = getActivityBody(activity, type);
            const content = (
              <>
                <span className="dashboard-modal__icon"><Icon size={18} aria-hidden="true" /></span>
                <span>
                  <strong>{item.title}</strong>
                  {item.subtitle && <small>{item.subtitle}</small>}
                </span>
              </>
            );

            return item.link ? (
              <Link to={item.link} className="dashboard-modal__row" key={`${type}-${index}`} onClick={onClose}>{content}</Link>
            ) : (
              <article className="dashboard-modal__row" key={`${type}-${index}`}>{content}</article>
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
