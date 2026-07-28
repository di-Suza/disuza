import {
  BarChart3,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Copy,
  Edit3,
  ExternalLink,
  GitFork,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  MoreHorizontal,
  Pause,
  Play,
  Repeat2,
  SendHorizontal,
  Share2,
  Sparkles,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { lazy, memo, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useDeletePostMutation, useGetPostQuery, useTrackPostLinkClickMutation } from '@/features/posts/api/post.api';
import { getPostAuthor, getPostImageUrl, getPostMedia, getPostOwnerId, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post, PostAuthor, PostLink } from '@/features/posts/model/post.types';
import { usePostLike } from '@/features/posts/ui/hooks/usePostLike';
import { usePostRepost } from '@/features/posts/ui/hooks/usePostRepost';
import { usePostSave } from '@/features/saves/ui/hooks/usePostSave';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import '../posts.css';

type PostCardProps = {
  post: Post;
  viewerId?: string;
  fallbackAuthor?: PostAuthor;
  className?: string;
  compact?: boolean;
  hideFeedbackAction?: boolean;
};

type PostAttachmentPanel = 'code' | 'media';

type PostDisplayLink = PostLink & {
  linkKey: string;
};

const CommentModal = lazy(() => import('@/features/comments/ui/components/CommentModal'));
const SendFeedbackModal = lazy(() => import('@/features/messages/ui/components/SendFeedbackModal'));
const ReportModal = lazy(() => import('@/features/reports/ui/components/ReportModal'));
const ManageSaveCollectionsModal = lazy(() => import('@/features/saves/ui/components/ManageSaveCollectionsModal'));
const ConfirmDialog = lazy(() => import('@/shared/ui/ConfirmDialog'));
const PostComposerModal = lazy(() => import('./PostComposerModal'));
const PostAnalyticsModal = lazy(() => import('./PostAnalyticsModal'));
const SharePostModal = lazy(() => import('./SharePostModal'));

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const ActionItem = memo(({
  active,
  count,
  disabled,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  count?: number;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => unknown | Promise<unknown>;
}) => (
  <button type="button" onClick={onClick} disabled={disabled} className="v1-post-action" aria-label={label}>
    <span className={active ? 'is-active' : ''}>
      {icon}
    </span>
    {count !== undefined && <small>{count}</small>}
  </button>
));

ActionItem.displayName = 'ActionItem';

const normalizeLink = (url?: string) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return '';
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
};

const truncateUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

const PostVideoPlayer = memo(({
  ariaLabel,
  className,
  onOpenPreview,
  src,
  variant,
}: {
  ariaLabel: string;
  className: string;
  onOpenPreview?: () => void;
  src: string;
  variant: 'card' | 'preview';
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPaused, setPaused] = useState(false);
  const [isMuted, setMuted] = useState(true);

  useEffect(() => {
    setPaused(false);
    setMuted(true);
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = isMuted;
    if (isPaused) {
      video.pause();
      return;
    }

    const playRequest = video.play();
    if (playRequest) {
      playRequest.catch(() => setPaused(true));
    }
  }, [isMuted, isPaused, src]);

  const togglePlayback = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    setPaused((current) => !current);
  }, []);

  const toggleMute = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMuted((current) => !current);
  }, []);

  return (
    <div
      className={cn('v1-post-card__video-player', `v1-post-card__video-player--${variant}`)}
      onClick={variant === 'card' ? onOpenPreview : () => setPaused((current) => !current)}
      onKeyDown={(event) => {
        if (variant !== 'card' || !onOpenPreview) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpenPreview();
        }
      }}
      role={variant === 'card' ? 'button' : undefined}
      tabIndex={variant === 'card' ? 0 : undefined}
      aria-label={variant === 'card' ? 'Open video preview' : undefined}
    >
      <video
        ref={videoRef}
        className={className}
        src={src}
        autoPlay
        muted={isMuted}
        playsInline
        loop
        preload="metadata"
        disablePictureInPicture
        aria-label={ariaLabel}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      <div className="v1-post-card__video-controls" aria-label="Video controls">
        <button type="button" onClick={togglePlayback} aria-label={isPaused ? 'Play video' : 'Pause video'}>
          {isPaused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
        </button>
        <button type="button" onClick={toggleMute} aria-label={isMuted ? 'Turn sound on' : 'Turn sound off'}>
          {isMuted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
});

PostVideoPlayer.displayName = 'PostVideoPlayer';

const PostCard = ({ className, fallbackAuthor, hideFeedbackAction = false, post, viewerId }: PostCardProps) => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [isEditOpen, setEditOpen] = useState(false);
  const [isCommentsOpen, setCommentsOpen] = useState(false);
  const [isCollectionsOpen, setCollectionsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const [isShareOpen, setShareOpen] = useState(false);
  const [isAnalyticsOpen, setAnalyticsOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showFullCode, setShowFullCode] = useState(false);
  const [activeAttachmentPanel, setActiveAttachmentPanel] = useState<PostAttachmentPanel>('code');
  const [hasManuallySelectedAttachmentPanel, setHasManuallySelectedAttachmentPanel] = useState(false);
  const [isMediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const [trackPostLinkClick] = useTrackPostLinkClickMutation();
  const { data: fullPostData, isFetching: isPostFetching } = useGetPostQuery(post._id, { skip: !isEditOpen });
  const { isLiked, likesCount, toggleLike } = usePostLike(post);
  const { isReposted, isRepostUpdating, repostsCount, toggleRepost } = usePostRepost(post);
  const { isSaved, isSaveUpdating, markSaved, toggleSave } = usePostSave(post);

  const author = getPostAuthor(post, fallbackAuthor);
  const ownerId = getPostOwnerId(post, fallbackAuthor);
  const avatarUrl = getPostImageUrl(author);
  const media = useMemo(() => getPostMedia(post), [post]);
  const activeMedia = media[currentIndex];
  const mediaStageStyle = useMemo(() => {
    if (!activeMedia?.width || !activeMedia.height) return undefined;

    return { '--post-media-aspect': `${activeMedia.width} / ${activeMedia.height}` } as CSSProperties;
  }, [activeMedia]);
  const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId);
  const counts = post.counts || {};
  const commentsDisabled = Boolean(post.settings?.commentsDisabled);
  const hideLikesCount = Boolean(post.settings?.hideLikesCount);
  const caption = post.caption || '';
  const code = post.codeSnippet?.code || '';
  const hasCode = Boolean(code);
  const hasMedia = media.length > 0;
  const hasAttachmentSwitcher = hasCode && hasMedia;
  const shouldShowCode = hasCode && (!hasAttachmentSwitcher || activeAttachmentPanel === 'code');
  const shouldShowMedia = Boolean(activeMedia) && (!hasAttachmentSwitcher || activeAttachmentPanel === 'media');
  const shouldCollapseCaption = caption.length > 120 || caption.split(/\r?\n/).length > 2;
  const shouldCollapseCode = code.length > 600 || code.split(/\r?\n/).length > 10;
  const editablePost = fullPostData?.post || null;
  const userName = author?.userName || 'User';
  const extraLinks = useMemo<PostDisplayLink[]>(() => {
    const links = Array.isArray(post.links) ? post.links : [];
    return links
      .map((link, index) => ({ ...link, linkKey: `custom:${index}` }))
      .filter((link) => link.label?.trim() && link.url?.trim());
  }, [post.links]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((current) => (current === 0 ? media.length - 1 : current - 1));
  }, [media.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((current) => (current + 1) % media.length);
  }, [media.length]);

  const closeComments = useCallback(() => {
    setCommentsOpen(false);
  }, []);

  const closeCollections = useCallback(() => {
    setCollectionsOpen(false);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
  }, []);

  const closeFeedback = useCallback(() => {
    setFeedbackOpen(false);
  }, []);

  const closeMediaPreview = useCallback(() => {
    setMediaPreviewOpen(false);
  }, []);

  const closeReport = useCallback(() => {
    setReportOpen(false);
  }, []);

  const closeShare = useCallback(() => {
    setShareOpen(false);
  }, []);

  const closeAnalytics = useCallback(() => {
    setAnalyticsOpen(false);
  }, []);

  const openComments = useCallback(() => {
    setCommentsOpen(true);
  }, []);

  const openFeedback = useCallback(() => {
    setFeedbackOpen(true);
  }, []);

  const openMediaPreview = useCallback(() => {
    setMediaPreviewOpen(true);
  }, []);

  const toggleDropdown = useCallback(() => {
    setShowDropdown((current) => !current);
  }, []);

  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmOpen(false);
  }, []);

  const selectAttachmentPanel = useCallback((panel: PostAttachmentPanel) => {
    setActiveAttachmentPanel(panel);
    setHasManuallySelectedAttachmentPanel(true);
  }, []);

  useLockBodyScroll(isMediaPreviewOpen);

  useEffect(() => {
    setActiveAttachmentPanel('code');
    setHasManuallySelectedAttachmentPanel(false);
    setShowFullCode(false);
    setCurrentIndex(0);
  }, [post._id]);

  useEffect(() => {
    if (!hasAttachmentSwitcher || hasManuallySelectedAttachmentPanel) return;

    const intervalId = window.setInterval(() => {
      setActiveAttachmentPanel((current) => (current === 'code' ? 'media' : 'code'));
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [hasAttachmentSwitcher, hasManuallySelectedAttachmentPanel]);

  useEffect(() => {
    if (!isMediaPreviewOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMediaPreview();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [closeMediaPreview, isMediaPreviewOpen]);

  const handleDelete = useCallback(async () => {
    try {
      const result = await deletePost(post._id).unwrap();
      setDeleteConfirmOpen(false);
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [deletePost, post._id, showError, showSuccess]);

  const handleSaveClick = useCallback(async () => {
    const wasSaved = isSaved;
    const didUpdate = await toggleSave();

    if (!wasSaved && didUpdate) {
      setShowSaveTooltip(true);
      window.setTimeout(() => setShowSaveTooltip(false), 3000);
    }
  }, [isSaved, toggleSave]);

  const trackLinkClick = useCallback((linkKey: string) => {
    void trackPostLinkClick({ postId: post._id, linkKey }).unwrap().catch(() => undefined);
  }, [post._id, trackPostLinkClick]);

  const copyCode = useCallback(async () => {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      showSuccess('Code copied.');
    } catch {
      showError('Code could not be copied.');
    }
  }, [code, showError, showSuccess]);

  const openHashtag = useCallback((tag: string) => {
    navigate(`/search?q=${encodeURIComponent(`#${tag}`)}`);
  }, [navigate]);

  const renderCaption = useCallback((text: string) => {
    const parts = text.split(/(#[a-zA-Z0-9_]+)/g);

    return parts.map((part, index) => {
      if (!part.startsWith('#') || part.length === 1) return <span key={`${part}-${index}`}>{part}</span>;

      const tag = part.slice(1);
      return (
        <button
          type="button"
          className="rich-post-card__caption-tag"
          key={`${part}-${index}`}
          onClick={() => openHashtag(tag)}
        >
          {part}
        </button>
      );
    });
  }, [openHashtag]);

  return (
    <article className={cn('v1-post-card-outer', className)}>
      <div className="v1-post-card rich-post-card">
        <header className="v1-post-card__header">
          <button type="button" onClick={() => navigate(author?._id ? `/profile/${author._id}` : '/dashboard')} className="v1-post-card__author">
            <span className="v1-post-card__avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} aria-hidden="true" />}
            </span>
            <span className="v1-post-card__author-copy">
              <strong>{userName}</strong>
              <small>{formatTime(post.createdAt)}</small>
            </span>
          </button>

          <div className="v1-post-card__top-actions">
            {post.isProjectPost && <span className="v1-post-card__project"><Sparkles size={12} aria-hidden="true" />Project</span>}
            <div className="v1-post-card__menu">
              <button type="button" onClick={toggleDropdown} aria-label="Post options">
                <MoreHorizontal size={20} aria-hidden="true" />
              </button>
              {showDropdown && (
                <>
                  <button type="button" className="v1-post-card__scrim" onClick={closeDropdown} aria-label="Close post options" />
                  <div className="v1-post-card__dropdown">
                    <button type="button" onClick={() => { setShowDropdown(false); setShareOpen(true); }}><Share2 size={16} />Share</button>
                    {isOwner && <button type="button" onClick={() => { setShowDropdown(false); setEditOpen(true); }}><Edit3 size={16} />Edit</button>}
                    {isOwner && <button type="button" onClick={() => { setShowDropdown(false); setAnalyticsOpen(true); }}><BarChart3 size={16} />Analytics</button>}
                    {isOwner && <button type="button" className="is-danger" onClick={() => { setShowDropdown(false); setDeleteConfirmOpen(true); }} disabled={isDeleting}>{isDeleting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <><Trash2 size={16} aria-hidden="true" />Delete</>}</button>}
                    {!isOwner && <button type="button" className="is-danger" onClick={() => { setShowDropdown(false); setReportOpen(true); }}><MessageSquareWarning size={16} />Report</button>}
                    <button type="button" className="is-muted" onClick={() => setShowDropdown(false)}><X size={16} />Cancel</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {caption && (
          <p className="v1-post-card__caption rich-post-card__caption">
            <span className={cn('rich-post-card__caption-text', shouldCollapseCaption && !showFullCaption && 'is-collapsed')}>
              {renderCaption(caption)}
            </span>
            {shouldCollapseCaption && <button type="button" className="rich-post-card__more" onClick={() => setShowFullCaption((current) => !current)}>{showFullCaption ? 'less' : 'more'}</button>}
          </p>
        )}

        {hasAttachmentSwitcher && (
          <div className="rich-post-card__attachment-switcher" role="tablist" aria-label="Post attachment view">
            <button
              type="button"
              className={activeAttachmentPanel === 'code' ? 'is-active' : ''}
              onClick={() => selectAttachmentPanel('code')}
              role="tab"
              aria-selected={activeAttachmentPanel === 'code'}
            >
              Code
            </button>
            <button
              type="button"
              className={activeAttachmentPanel === 'media' ? 'is-active' : ''}
              onClick={() => selectAttachmentPanel('media')}
              role="tab"
              aria-selected={activeAttachmentPanel === 'media'}
            >
              Media
            </button>
          </div>
        )}

        {extraLinks.length > 0 && (
          <div className="rich-post-card__inline-links">
            {extraLinks.map((link) => {
              const href = normalizeLink(link.url);
              return (
                <a key={`${link.label}-${link.url}`} href={href} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick(link.linkKey)}>
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>{link.label}</span>
                  <small>{truncateUrl(href)}</small>
                </a>
              );
            })}
          </div>
        )}

        {shouldShowCode && (
          <section className="rich-post-card__code">
            <header>
              <span>{post.codeSnippet?.language || 'text'}</span>
              <button type="button" onClick={copyCode}>
                <Copy size={14} aria-hidden="true" />
                Copy
              </button>
            </header>
            <pre className={cn(shouldCollapseCode && !showFullCode && 'is-collapsed')}><code>{code}</code></pre>
            {shouldCollapseCode && (
              <button type="button" className="rich-post-card__code-toggle" onClick={() => setShowFullCode((current) => !current)}>
                {showFullCode ? 'less' : 'more'}
              </button>
            )}
          </section>
        )}

        {shouldShowMedia && activeMedia && (
          <section className="v1-post-card__media-shell">
            <div className="v1-post-card__media-stage" style={mediaStageStyle}>
              {!isVideoMedia(activeMedia) && <img className="v1-post-card__media-bg" src={activeMedia.url} alt="" aria-hidden="true" />}
              <div className="v1-post-card__media-overlay" />
              {isVideoMedia(activeMedia) ? (
                <PostVideoPlayer
                  ariaLabel={`Post video ${currentIndex + 1}`}
                  className="v1-post-card__media-main"
                  src={activeMedia.url}
                  variant="card"
                  onOpenPreview={openMediaPreview}
                />
              ) : (
                <img className="v1-post-card__media-main" src={activeMedia.url} alt={`Post content ${currentIndex + 1}`} loading="lazy" />
              )}
              {!isVideoMedia(activeMedia) && <button type="button" className="v1-post-card__media-open" onClick={openMediaPreview} aria-label="Open media preview" />}

              {media.length > 1 && currentIndex > 0 && <button type="button" className="v1-post-card__media-nav v1-post-card__media-nav--left" onClick={goToPrevious} aria-label="Previous media"><ChevronLeft size={20} /></button>}
              {media.length > 1 && currentIndex < media.length - 1 && <button type="button" className="v1-post-card__media-nav v1-post-card__media-nav--right" onClick={goToNext} aria-label="Next media"><ChevronRight size={20} /></button>}
              {media.length > 1 && (
                <div className="v1-post-card__dots">
                  {media.map((item, index) => <button key={`${item.fileId}-${index}`} type="button" className={index === currentIndex ? 'is-active' : ''} onClick={() => setCurrentIndex(index)} aria-label={`Go to media ${index + 1}`} />)}
                </div>
              )}
            </div>
          </section>
        )}

        {post.isProjectPost && (
          <div className="v1-post-card__links rich-post-card__project-links">
            {post.projectLinks?.liveDemoUrl && <a href={normalizeLink(post.projectLinks.liveDemoUrl)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick('project:liveDemo')}><ExternalLink size={14} />Live Demo</a>}
            {post.projectLinks?.repositoryUrl && <a href={normalizeLink(post.projectLinks.repositoryUrl)} target="_blank" rel="noopener noreferrer" onClick={() => trackLinkClick('project:repository')}><GitFork size={14} />Github</a>}
          </div>
        )}

        <section className="v1-post-card__actions rich-post-card__actions">
          <div className="rich-post-card__action-left">
            <ActionItem label="Like" count={hideLikesCount ? undefined : Number(likesCount || 0)} active={isLiked} onClick={toggleLike} icon={<Heart size={20} className={isLiked ? 'is-filled' : ''} />} />
            {!commentsDisabled && <ActionItem label="Comment" count={Number(counts.comments || 0)} onClick={openComments} icon={<MessageCircle size={20} />} />}
            {!isOwner && <ActionItem label="Repost" count={Number(repostsCount || 0)} active={isReposted} disabled={isRepostUpdating} onClick={toggleRepost} icon={<Repeat2 size={20} />} />}
            {!hideFeedbackAction && !isOwner && ownerId && <ActionItem label="Feedback" count={Number(counts.feedbacks || 0)} onClick={openFeedback} icon={<SendHorizontal size={20} />} />}
          </div>
          <div className="v1-post-card__save-action rich-post-card__save-right">
            <ActionItem label="Save" active={isSaved} disabled={isSaveUpdating} onClick={handleSaveClick} icon={<Bookmark size={20} className={isSaved ? 'is-filled' : ''} />} />
            {showSaveTooltip && (
              <div className="v1-post-card__save-tooltip">
                <div className="v1-post-card__save-tooltip-card">
                  <div className="v1-post-card__save-tooltip-head">
                    <span>Saved</span>
                    <CircleCheckBig size={18} aria-hidden="true" />
                  </div>
                  <button type="button" onClick={() => { setShowSaveTooltip(false); setCollectionsOpen(true); }}>
                    Manage collections
                  </button>
                  <i aria-hidden="true" />
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <Suspense fallback={null}>
        {isEditOpen && <PostComposerModal isOpen={isEditOpen} mode="edit" onClose={closeEdit} post={editablePost || post} isPostLoading={isPostFetching && !editablePost} />}
        {isCommentsOpen && <CommentModal isOpen={isCommentsOpen} onClose={closeComments} post={post} />}
        {isCollectionsOpen && <ManageSaveCollectionsModal isOpen={isCollectionsOpen} onClose={closeCollections} postId={post._id} onSaved={markSaved} />}
        {isReportOpen && <ReportModal isOpen={isReportOpen} onClose={closeReport} targetId={post._id} onModel="Post" />}
        {isShareOpen && <SharePostModal isOpen={isShareOpen} onClose={closeShare} post={post} />}
        {isAnalyticsOpen && <PostAnalyticsModal isOpen={isAnalyticsOpen} onClose={closeAnalytics} postId={post._id} />}
        {isDeleteConfirmOpen && (
          <ConfirmDialog
            isOpen={isDeleteConfirmOpen}
            isBusy={isDeleting}
            title="Delete post?"
            description="This post will be permanently removed from your profile, feed, saves, and related activity."
            confirmLabel="Delete"
            onCancel={closeDeleteConfirm}
            onConfirm={handleDelete}
          />
        )}
      </Suspense>
      {isMediaPreviewOpen && activeMedia && createPortal(
        <div className="v1-post-card__media-preview" role="dialog" aria-modal="true" aria-label="Media preview">
          <button type="button" className="v1-post-card__media-preview-backdrop" onClick={closeMediaPreview} aria-label="Close media preview" />
          <div className="v1-post-card__media-preview-stage">
            {isVideoMedia(activeMedia) ? (
              <PostVideoPlayer
                ariaLabel={`Post video ${currentIndex + 1} preview`}
                className="v1-post-card__media-preview-media"
                src={activeMedia.url}
                variant="preview"
              />
            ) : (
              <img className="v1-post-card__media-preview-media" src={activeMedia.url} alt={`Post content ${currentIndex + 1}`} />
            )}
          </div>
          <button type="button" className="v1-post-card__media-preview-close" onClick={closeMediaPreview} aria-label="Close media preview">
            <X size={22} aria-hidden="true" />
          </button>
        </div>,
        document.body,
      )}
      <Suspense fallback={null}>
        {isFeedbackOpen && ownerId && (
          <SendFeedbackModal
            isOpen={isFeedbackOpen}
            onClose={closeFeedback}
            feedbackOn="Post"
            receiverId={ownerId}
            receiverName={userName}
            postId={post._id}
          />
        )}
      </Suspense>
    </article>
  );
};

export default memo(PostCard);
