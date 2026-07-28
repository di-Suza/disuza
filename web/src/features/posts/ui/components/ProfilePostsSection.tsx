import { Briefcase, Eye, Grid2X2, Heart, Loader2, MessageCircle, Play, Repeat2, X, type LucideIcon } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useGetUserRepostsQuery } from '@/features/posts/api/post.api';
import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post, Repost } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';
import Image from '@/shared/components/Image/Image';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import '../posts.css';

type ProfilePostsSectionProps = {
  normalPosts: Post[];
  profileUser: UserProfile;
  projectPosts: Post[];
  viewerId?: string;
};

type ProfileGalleryItemKind = 'normal' | 'project' | 'repost';

type ProfileGalleryItem = {
  createdAt?: string;
  id: string;
  kind: ProfileGalleryItemKind;
  post: Post;
  repostId?: string;
};

type ProfileGalleryModalState = {
  title: string;
};

const PROFILE_DESKTOP_PREVIEW_LIMIT = 8;
const PROFILE_MODAL_PAGE_SIZE = 12;
const PROFILE_MOBILE_PREVIEW_LIMIT = 4;

const getProfileViewportWidth = () => (typeof window === 'undefined' ? 1024 : Math.round(window.innerWidth));

const getProfilePreviewLimit = (viewportWidth = getProfileViewportWidth()) => (
  viewportWidth <= 620 ? PROFILE_MOBILE_PREVIEW_LIMIT : PROFILE_DESKTOP_PREVIEW_LIMIT
);

const getItemTimestamp = (item: ProfileGalleryItem) => (item.createdAt ? new Date(item.createdAt).getTime() || 0 : 0);

const sortProfileItems = (items: ProfileGalleryItem[]) => [...items].sort((first, second) => getItemTimestamp(second) - getItemTimestamp(first));

const useProfilePreviewLimit = () => {
  const [meta, setMeta] = useState(() => {
    const viewportWidth = getProfileViewportWidth();
    return {
      previewLimit: getProfilePreviewLimit(viewportWidth),
      viewportWidth,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const viewportQuery = window.matchMedia('(max-width: 620px)');
    const syncViewportMeta = () => {
      const viewportWidth = getProfileViewportWidth();
      setMeta({
        previewLimit: getProfilePreviewLimit(viewportWidth),
        viewportWidth,
      });
    };

    syncViewportMeta();
    viewportQuery.addEventListener('change', syncViewportMeta);
    return () => viewportQuery.removeEventListener('change', syncViewportMeta);
  }, []);

  return meta;
};

const buildPostItems = (normalPosts: Post[], projectPosts: Post[]) => {
  const seenPostIds = new Set<string>();

  return [...projectPosts.map((post) => ({ kind: 'project' as const, post })), ...normalPosts.map((post) => ({
    kind: post.isProjectPost ? 'project' as const : 'normal' as const,
    post,
  }))]
    .filter(({ post }) => {
      if (!post?._id || seenPostIds.has(post._id)) return false;
      seenPostIds.add(post._id);
      return true;
    })
    .map(({ kind, post }) => ({
      createdAt: post.createdAt,
      id: `${kind}-${post._id}`,
      kind,
      post,
    }));
};

const buildRepostItems = (reposts: Repost[]): ProfileGalleryItem[] => reposts
  .filter((repost) => Boolean(repost?._id && repost.post?._id))
  .map((repost) => ({
    createdAt: repost.createdAt || repost.post.createdAt,
    id: `repost-${repost._id}`,
    kind: 'repost',
    post: repost.post,
    repostId: repost._id,
  }));

const ProfilePostPreviewCard = memo(({ item }: { item: ProfileGalleryItem }) => {
  const navigate = useNavigate();
  const post = item.post;
  const media = useMemo(() => getPostMedia(post), [post]);
  const firstMedia = media[0];
  const caption = post.caption || 'Untitled post';
  const openPost = useCallback(() => {
    navigate(`/post/${post._id}${item.repostId ? `?repostId=${item.repostId}` : ''}`);
  }, [item.repostId, navigate, post._id]);
  const BadgeIcon = item.kind === 'project' ? Briefcase : item.kind === 'repost' ? Repeat2 : null;

  return (
    <button type="button" onClick={openPost} className="dashboard-post-preview-card profile-post-preview-card">
      <span className="dashboard-post-preview-card__media">
        {BadgeIcon && (
          <span className={`profile-post-preview-card__badge is-${item.kind}`} aria-label={item.kind === 'project' ? 'Project post' : 'Repost'}>
            <BadgeIcon size={13} aria-hidden="true" />
          </span>
        )}
        {firstMedia && isVideoMedia(firstMedia) ? (
          <>
            <video src={firstMedia.url} preload="metadata" muted />
            <i><Play size={14} aria-hidden="true" /></i>
          </>
        ) : firstMedia ? (
          <Image src={firstMedia.thumbnailUrl || firstMedia.url} type="thumbnail" alt="Post" />
        ) : (
          <span className="repost-preview-card__empty"><Grid2X2 size={22} aria-hidden="true" /></span>
        )}
        <em><Eye size={14} aria-hidden="true" /></em>
      </span>
      <span className="dashboard-post-preview-card__body">
        <strong>{caption}</strong>
        <small>
          <span><Heart size={12} aria-hidden="true" />{Number(post.counts?.likes || 0)}</span>
          <span><MessageCircle size={12} aria-hidden="true" />{Number(post.counts?.comments || 0)}</span>
        </small>
      </span>
    </button>
  );
});

ProfilePostPreviewCard.displayName = 'ProfilePostPreviewCard';

const ProfilePostSection = ({
  children,
  icon: Icon,
  onSeeAll,
  showSeeAll,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  onSeeAll?: () => void;
  showSeeAll?: boolean;
  title: string;
}) => (
  <section className="profile-posts-section">
    <div className="profile-posts-section__header">
      <div className="profile-posts-section__title">
        <span><Icon size={20} aria-hidden="true" /></span>
        <h2>{title}</h2>
      </div>
    </div>
    <div className="profile-posts-section__gallery">{children}</div>
    {showSeeAll && onSeeAll && (
      <div className="profile-posts-section__footer">
        <button type="button" className="profile-posts-section__see-all" onClick={onSeeAll}>
          See all posts
        </button>
      </div>
    )}
  </section>
);

const ProfilePostsSection = ({ normalPosts, profileUser, projectPosts }: ProfilePostsSectionProps) => {
  const { previewLimit, viewportWidth } = useProfilePreviewLimit();
  const [activeGallery, setActiveGallery] = useState<ProfileGalleryModalState | null>(null);
  const [localModalLimit, setLocalModalLimit] = useState(PROFILE_MODAL_PAGE_SIZE);
  const [repostModalPage, setRepostModalPage] = useState(1);
  const [modalReposts, setModalReposts] = useState<Repost[]>([]);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const { data: repostData, isFetching: isRepostsFetching, isLoading: isRepostsLoading } = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: 1,
    limit: previewLimit,
    viewportWidth,
  });
  const repostModalQuery = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: repostModalPage,
    limit: PROFILE_MODAL_PAGE_SIZE,
  }, {
    skip: !activeGallery,
  });
  const reposts = repostData?.reposts || [];
  const localPostItems = useMemo(() => sortProfileItems(buildPostItems(normalPosts, projectPosts)), [normalPosts, projectPosts]);
  const previewItems = useMemo(() => sortProfileItems([...localPostItems, ...buildRepostItems(reposts)]).slice(0, previewLimit), [localPostItems, previewLimit, reposts]);
  const visibleLocalItems = useMemo(() => localPostItems.slice(0, localModalLimit), [localModalLimit, localPostItems]);
  const modalItems = useMemo(() => sortProfileItems([...visibleLocalItems, ...buildRepostItems(modalReposts)]), [modalReposts, visibleLocalItems]);
  const hasAllPosts = localPostItems.length > 0 || reposts.length > 0;
  const localModalHasMore = localModalLimit < localPostItems.length;
  const repostModalHasMore = Boolean(activeGallery && repostModalQuery.data?.hasMore);
  const hasMorePosts = localPostItems.length + reposts.length > previewLimit || Boolean(repostData?.hasMore);
  const isModalLoading = Boolean(activeGallery && repostModalQuery.isLoading && modalItems.length === 0);
  const isModalLoadingMore = Boolean(activeGallery && repostModalQuery.isFetching && modalReposts.length > 0);

  useLockBodyScroll(Boolean(activeGallery));

  useEffect(() => {
    const nextReposts = repostModalQuery.data?.reposts;
    if (!activeGallery || !nextReposts) return;

    setModalReposts((current) => {
      if (repostModalPage === 1) return nextReposts;

      const knownIds = new Set(current.map((repost) => repost._id));
      return [...current, ...nextReposts.filter((repost) => !knownIds.has(repost._id))];
    });
  }, [activeGallery, repostModalPage, repostModalQuery.data?.reposts]);

  const closeGallery = useCallback(() => {
    setActiveGallery(null);
    setLocalModalLimit(PROFILE_MODAL_PAGE_SIZE);
    setRepostModalPage(1);
    setModalReposts([]);
  }, []);

  useEffect(() => {
    if (!activeGallery) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeGallery();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [activeGallery, closeGallery]);

  const openGallery = useCallback((title: string) => {
    setActiveGallery({ title });
    setLocalModalLimit(PROFILE_MODAL_PAGE_SIZE);
    setRepostModalPage(1);
    setModalReposts([]);
  }, []);

  const loadMoreGalleryItems = useCallback(() => {
    if (!activeGallery) return;

    if (localModalLimit < localPostItems.length) {
      setLocalModalLimit((current) => Math.min(current + PROFILE_MODAL_PAGE_SIZE, localPostItems.length));
    }

    if (repostModalQuery.data?.hasMore && !repostModalQuery.isFetching) {
      setRepostModalPage((current) => current + 1);
    }
  }, [activeGallery, localModalLimit, localPostItems.length, repostModalQuery.data?.hasMore, repostModalQuery.isFetching]);

  const handleModalScroll = useCallback(() => {
    const element = modalBodyRef.current;
    if (!element) return;

    const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distanceFromBottom < 180) {
      loadMoreGalleryItems();
    }
  }, [loadMoreGalleryItems]);

  const galleryModal = activeGallery && typeof document !== 'undefined' ? createPortal(
    <div className="profile-post-gallery-modal" role="dialog" aria-modal="true" aria-label={activeGallery.title}>
      <button type="button" className="profile-post-gallery-modal__backdrop" onClick={closeGallery} aria-label="Close posts gallery" />
      <section className="profile-post-gallery-modal__panel">
        <header className="profile-post-gallery-modal__header">
          <h2>{activeGallery.title}</h2>
          <button type="button" onClick={closeGallery} aria-label="Close posts gallery">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="profile-post-gallery-modal__body" ref={modalBodyRef} onScroll={handleModalScroll}>
          {isModalLoading ? (
            <LoadingSpinner className="profile-post-gallery-modal__state" />
          ) : (
            <div className="profile-post-gallery-modal__grid">
              {modalItems.map((item) => <ProfilePostPreviewCard item={item} key={item.id} />)}
            </div>
          )}
          {(localModalHasMore || repostModalHasMore) && (
            <button
              type="button"
              className="profile-post-gallery-modal__load-more"
              onClick={loadMoreGalleryItems}
              disabled={isModalLoadingMore}
            >
              {isModalLoadingMore ? <Loader2 className="spin" size={16} aria-hidden="true" /> : 'Load more'}
            </button>
          )}
        </div>
      </section>
    </div>,
    document.body,
  ) : null;

  if (!hasAllPosts && !isRepostsLoading) return null;

  return (
    <>
      <ProfilePostSection
        icon={Grid2X2}
        title="All Posts"
        showSeeAll={hasMorePosts}
        onSeeAll={() => openGallery('All Posts')}
      >
        {isRepostsLoading && previewItems.length === 0 ? (
          <LoadingSpinner className="profile-posts-section__state" />
        ) : (
          <>
            {previewItems.map((item) => <ProfilePostPreviewCard item={item} key={item.id} />)}
            {isRepostsFetching && !isRepostsLoading && (
              <span className="profile-posts-section__loading-tile">
                <LoadingSpinner className="profile-posts-section__state is-inline" size={18} />
              </span>
            )}
          </>
        )}
      </ProfilePostSection>
      {galleryModal}
    </>
  );
};

export default memo(ProfilePostsSection);
