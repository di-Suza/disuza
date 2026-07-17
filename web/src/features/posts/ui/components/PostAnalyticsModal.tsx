import {
  BarChart3,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Repeat2,
  SendHorizontal,
  Share2,
  UserRound,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useLazyGetPostAnalyticsQuery } from '@/features/posts/api/post.api';
import type { PostAnalyticsItem, PostAnalyticsOverview, PostAnalyticsSection } from '@/features/posts/model/post.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import '../posts.css';

type PostAnalyticsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
};

type AnalyticsTab = {
  id: PostAnalyticsSection;
  label: string;
};

const tabs: AnalyticsTab[] = [
  { id: 'likes', label: 'Likes' },
  { id: 'comments', label: 'Comments' },
  { id: 'reposts', label: 'Reposts' },
  { id: 'feedbacks', label: 'Feedbacks' },
];

const ANALYTICS_PAGE_SIZE = 15;

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
};

const getUserAvatar = (item: PostAnalyticsItem) => item.user?.profilePicture?.url || '';

const getUserName = (item: PostAnalyticsItem) => item.user?.userName || 'User';

const AnalyticsUserRow = ({ item, section }: { item: PostAnalyticsItem; section: PostAnalyticsSection }) => {
  const avatarUrl = getUserAvatar(item);
  const detail = section === 'comments' || section === 'feedbacks'
    ? item.comment || (section === 'feedbacks' ? 'Sent feedback' : 'Commented on your post')
    : section === 'reposts'
      ? 'Reposted your post'
      : 'Liked your post';

  return (
    <article className="post-analytics-modal__activity-row">
      <span className="post-analytics-modal__avatar">
        {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}
      </span>
      <span className="post-analytics-modal__activity-copy">
        <strong>{getUserName(item)}</strong>
        <small className={section === 'feedbacks' ? 'post-analytics-modal__feedback-text' : undefined}>{detail}</small>
        {section === 'comments' && item.replyToUser?.userName && <em>Reply to {item.replyToUser.userName}</em>}
      </span>
      <time>{formatDate(item.createdAt)}</time>
    </article>
  );
};

const MetricCard = ({
  icon,
  label,
  max,
  value,
}: {
  icon: ReactNode;
  label: string;
  max: number;
  value: number;
}) => {
  const percent = max > 0 ? Math.max(6, Math.round((value / max) * 100)) : 0;

  return (
    <article className="post-analytics-modal__metric" style={{ '--metric-percent': `${percent}%` } as CSSProperties}>
      <span>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
      <i aria-hidden="true" />
    </article>
  );
};

const PostAnalyticsModal = ({ isOpen, onClose, postId }: PostAnalyticsModalProps) => {
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<PostAnalyticsSection>('likes');
  const [items, setItems] = useState<PostAnalyticsItem[]>([]);
  const [overview, setOverview] = useState<PostAnalyticsOverview | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadAnalytics, { isFetching }] = useLazyGetPostAnalyticsQuery();

  useLockBodyScroll(isOpen);

  const metrics = useMemo(() => {
    const counts = overview?.counts;

    return [
      { icon: <Heart size={17} aria-hidden="true" />, label: 'Likes', value: Number(counts?.likes || 0) },
      { icon: <MessageCircle size={17} aria-hidden="true" />, label: 'Comments', value: Number(counts?.comments || 0) },
      { icon: <SendHorizontal size={17} aria-hidden="true" />, label: 'Feedbacks', value: Number(counts?.feedbacks || 0) },
      { icon: <Repeat2 size={17} aria-hidden="true" />, label: 'Reposts', value: Number(counts?.reposts || 0) },
      { icon: <Share2 size={17} aria-hidden="true" />, label: 'Shares', value: Number(counts?.shares || 0) },
      { icon: <MousePointerClick size={17} aria-hidden="true" />, label: 'Link clicks', value: Number(counts?.linkClicks || 0) },
    ].filter((metric) => metric.value > 0);
  }, [overview?.counts]);

  const maxMetric = useMemo(() => Math.max(1, ...metrics.map((metric) => metric.value)), [metrics]);

  const fetchAnalytics = useCallback(async (section: PostAnalyticsSection, nextPage: number, append = false) => {
    try {
      const result = await loadAnalytics({ postId, section, page: nextPage, limit: ANALYTICS_PAGE_SIZE }, false).unwrap();

      setOverview(result.overview);
      setItems((currentItems) => (append ? [...currentItems, ...result.items] : result.items));
      setHasMore(result.hasMore);
      setPage(result.page);
    } catch (error) {
      showError(getErrorMessage(error, 'Analytics load nahi ho payi.'));
    }
  }, [loadAnalytics, postId, showError]);

  useEffect(() => {
    if (!isOpen) return;
    void fetchAnalytics(activeTab, 1, false);
  }, [activeTab, fetchAnalytics, isOpen]);

  useEffect(() => {
    if (isOpen) return;
    setActiveTab('likes');
    setItems([]);
    setOverview(null);
    setPage(1);
    setHasMore(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const linkBreakdown = overview?.links || [];

  return createPortal(
    <div className="modal-backdrop post-analytics-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="post-analytics-modal" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="post-analytics-modal__close" onClick={onClose} aria-label="Close analytics">
          <X size={18} aria-hidden="true" />
        </button>

        <header className="post-analytics-modal__header">
          <span><BarChart3 size={21} aria-hidden="true" /></span>
          <div>
            <p>Post Analytics</p>
            <h2>Engagement overview</h2>
          </div>
        </header>

        {metrics.length > 0 && (
          <div className="post-analytics-modal__metrics">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} icon={metric.icon} label={metric.label} max={maxMetric} value={metric.value} />
            ))}
          </div>
        )}

        <section className="post-analytics-modal__links">
          <div className="post-analytics-modal__section-title">
            <span>Link performance</span>
            {isFetching && !overview && <Loader2 className="spin" size={15} aria-hidden="true" />}
          </div>
          {linkBreakdown.length > 0 ? (
            <div className="post-analytics-modal__link-list">
              {linkBreakdown.map((link) => (
                <article key={link.key}>
                  <span><ExternalLink size={15} aria-hidden="true" /></span>
                  <div>
                    <strong>{link.label}</strong>
                    <small>{link.type === 'project' ? 'Project link' : 'Custom link'}</small>
                  </div>
                  <b>{link.clicks}</b>
                </article>
              ))}
            </div>
          ) : (
            <p className="post-analytics-modal__empty">No links on this post.</p>
          )}
        </section>

        <section className="post-analytics-modal__activity">
          <div className="post-analytics-modal__tabs" role="tablist" aria-label="Analytics activity">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'is-active' : ''}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="post-analytics-modal__activity-list">
            {items.length > 0 ? (
              items.map((item) => <AnalyticsUserRow key={item._id} item={item} section={activeTab} />)
            ) : (
              <p className="post-analytics-modal__empty">{isFetching ? 'Loading activity...' : 'No activity yet.'}</p>
            )}
          </div>

          {hasMore && (
            <Button variant="secondary" className="post-analytics-modal__load-more" onClick={() => fetchAnalytics(activeTab, page + 1, true)} disabled={isFetching}>
              {isFetching ? <Loader2 className="spin" size={16} aria-hidden="true" /> : null}
              Load more
            </Button>
          )}
        </section>
      </section>
    </div>,
    document.body,
  );
};

export default memo(PostAnalyticsModal);
