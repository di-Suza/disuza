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
import RepostPreviewCard from './RepostPreviewCard';
import '../posts.css';

type ProfilePostsSectionProps = {
  normalPosts: Post[];
  profileUser: UserProfile;
  projectPosts: Post[];
  viewerId?: string;
};

type ProfileGalleryKind = 'project' | 'posts' | 'reposts';

type ProfileGalleryModalState = {
  kind: ProfileGalleryKind;
  title: string;
};

const PROFILE_PREVIEW_LIMIT = 6;
const PROFILE_MODAL_PAGE_SIZE = 12;

const ProfilePostPreviewCard = memo(({ post }: { post: Post }) => {
  const navigate = useNavigate();
  const media = useMemo(() => getPostMedia(post), [post]);
  const firstMedia = media[0];
  const caption = post.caption || 'Untitled post';
  const openPost = useCallback(() => navigate(`/post/${post._id}`), [navigate, post._id]);

  return (
    <button type="button" onClick={openPost} className="dashboard-post-preview-card profile-post-preview-card">
      <span className="dashboard-post-preview-card__media">
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
      {showSeeAll && onSeeAll && (
        <button type="button" className="profile-posts-section__see-all" onClick={onSeeAll}>
          See all
        </button>
      )}
    </div>
    <div className="profile-posts-section__gallery">{children}</div>
  </section>
);

const ProfilePostsSection = ({ normalPosts, profileUser, projectPosts }: ProfilePostsSectionProps) => {
  const [activeGallery, setActiveGallery] = useState<ProfileGalleryModalState | null>(null);
  const [localModalLimit, setLocalModalLimit] = useState(PROFILE_MODAL_PAGE_SIZE);
  const [repostModalPage, setRepostModalPage] = useState(1);
  const [modalReposts, setModalReposts] = useState<Repost[]>([]);
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const { data: repostData, isFetching: isRepostsFetching, isLoading: isRepostsLoading } = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: 1,
    limit: PROFILE_PREVIEW_LIMIT,
  });
  const repostModalQuery = useGetUserRepostsQuery({
    userId: profileUser._id,
    page: repostModalPage,
    limit: PROFILE_MODAL_PAGE_SIZE,
  }, {
    skip: activeGallery?.kind !== 'reposts',
  });
  const reposts = repostData?.reposts || [];
  const previewProjectPosts = useMemo(() => projectPosts.slice(0, PROFILE_PREVIEW_LIMIT), [projectPosts]);
  const previewNormalPosts = useMemo(() => normalPosts.slice(0, PROFILE_PREVIEW_LIMIT), [normalPosts]);
  const hasNormalPosts = normalPosts.length > 0;
  const hasProjectPosts = projectPosts.length > 0;
  const hasReposts = reposts.length > 0;
  const activeLocalPosts = activeGallery?.kind === 'project'
    ? projectPosts
    : activeGallery?.kind === 'posts'
      ? normalPosts
      : [];
  const visibleLocalPosts = activeLocalPosts.slice(0, localModalLimit);
  const localModalHasMore = activeGallery?.kind !== 'reposts' && localModalLimit < activeLocalPosts.length;
  const repostModalHasMore = Boolean(activeGallery?.kind === 'reposts' && repostModalQuery.data?.hasMore);
  const isModalLoading = activeGallery?.kind === 'reposts' && repostModalQuery.isLoading && modalReposts.length === 0;
  const isModalLoadingMore = activeGallery?.kind === 'reposts' && repostModalQuery.isFetching && modalReposts.length > 0;

  useLockBodyScroll(Boolean(activeGallery));

  useEffect(() => {
    const nextReposts = repostModalQuery.data?.reposts;
    if (activeGallery?.kind !== 'reposts' || !nextReposts) return;

    setModalReposts((current) => {
      if (repostModalPage === 1) return nextReposts;

      const knownIds = new Set(current.map((repost) => repost._id));
      return [...current, ...nextReposts.filter((repost) => !knownIds.has(repost._id))];
    });
  }, [activeGallery?.kind, repostModalPage, repostModalQuery.data?.reposts]);

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

  const openGallery = useCallback((kind: ProfileGalleryKind, title: string) => {
    setActiveGallery({ kind, title });
    setLocalModalLimit(PROFILE_MODAL_PAGE_SIZE);
    setRepostModalPage(1);
    setModalReposts([]);
  }, []);

  const loadMoreGalleryItems = useCallback(() => {
    if (!activeGallery) return;

    if (activeGallery.kind === 'reposts') {
      if (!repostModalQuery.data?.hasMore || repostModalQuery.isFetching) return;
      setRepostModalPage((current) => current + 1);
      return;
    }

    setLocalModalLimit((current) => Math.min(current + PROFILE_MODAL_PAGE_SIZE, activeLocalPosts.length));
  }, [activeGallery, activeLocalPosts.length, repostModalQuery.data?.hasMore, repostModalQuery.isFetching]);

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
              {activeGallery.kind === 'reposts'
                ? modalReposts.map((repost) => <RepostPreviewCard className="profile-post-gallery-modal__card" repost={repost} key={repost._id} />)
                : visibleLocalPosts.map((post) => <ProfilePostPreviewCard post={post} key={post._id} />)}
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

  if (!hasNormalPosts && !hasProjectPosts && !hasReposts && !isRepostsLoading) return null;

  return (
    <>
      {hasProjectPosts && (
        <ProfilePostSection
          icon={Briefcase}
          title="Project Posts"
          showSeeAll={projectPosts.length > PROFILE_PREVIEW_LIMIT}
          onSeeAll={() => openGallery('project', 'Project Posts')}
        >
          {previewProjectPosts.map((post) => <ProfilePostPreviewCard post={post} key={post._id} />)}
        </ProfilePostSection>
      )}

      {hasNormalPosts && (
        <ProfilePostSection
          icon={Grid2X2}
          title="All Posts"
          showSeeAll={normalPosts.length > PROFILE_PREVIEW_LIMIT}
          onSeeAll={() => openGallery('posts', 'All Posts')}
        >
          {previewNormalPosts.map((post) => <ProfilePostPreviewCard post={post} key={post._id} />)}
        </ProfilePostSection>
      )}

      {(hasReposts || isRepostsLoading) && (
        <ProfilePostSection
          icon={Repeat2}
          title="Reposts"
          showSeeAll={Boolean(repostData?.hasMore || reposts.length > PROFILE_PREVIEW_LIMIT)}
          onSeeAll={() => openGallery('reposts', 'Reposts')}
        >
          {isRepostsLoading ? (
            <LoadingSpinner className="profile-posts-section__state" />
          ) : (
            <>
              {reposts.map((repost) => <RepostPreviewCard repost={repost} key={repost._id} />)}
              {isRepostsFetching && <LoadingSpinner className="profile-posts-section__state is-inline" size={18} />}
            </>
          )}
        </ProfilePostSection>
      )}
      {galleryModal}
    </>
  );
};

export default memo(ProfilePostsSection);
