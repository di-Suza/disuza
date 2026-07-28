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
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import Image from '@/shared/components/Image/Image';
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

const FEED_VIDEO_MUTED_STORAGE_KEY = 'disuza:feed-video-muted';
const FEED_VIDEO_PLAY_EVENT = 'disuza:feed-video-play';
const FEED_VIDEO_MUTED_EVENT = 'disuza:feed-video-muted';
const FEED_VIDEO_VISIBLE_THRESHOLD = 0.4;

type VideoPreviewSnapshot = {
  currentTime: number;
  src: string;
  userPaused: boolean;
  wasPlaying: boolean;
};

type VideoRestoreRequest = VideoPreviewSnapshot & {
  requestId: number;
};

let sharedFeedVideoMuted: boolean | null = null;

const getSharedFeedVideoMuted = () => {
  if (sharedFeedVideoMuted !== null) return sharedFeedVideoMuted;

  if (typeof window === 'undefined') {
    sharedFeedVideoMuted = true;
    return sharedFeedVideoMuted;
  }

  try {
    const storedValue = window.localStorage.getItem(FEED_VIDEO_MUTED_STORAGE_KEY);
    sharedFeedVideoMuted = storedValue === null ? true : storedValue === 'true';
  } catch {
    sharedFeedVideoMuted = true;
  }

  return sharedFeedVideoMuted;
};

const updateSharedFeedVideoMuted = (muted: boolean) => {
  sharedFeedVideoMuted = muted;

  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(FEED_VIDEO_MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Local storage can be unavailable in private or restricted browser sessions.
  }

  window.dispatchEvent(new CustomEvent(FEED_VIDEO_MUTED_EVENT, { detail: { muted } }));
};

const PostVideoPlayer = memo(({
  ariaLabel,
  className,
  onOpenPreview,
  playerId,
  restoreRequest,
  src,
  suspendAutoPlay = false,
  variant,
}: {
  ariaLabel: string;
  className: string;
  onOpenPreview?: (snapshot: VideoPreviewSnapshot) => void;
  playerId: string;
  restoreRequest?: VideoRestoreRequest | null;
  src: string;
  suspendAutoPlay?: boolean;
  variant: 'card' | 'preview';
}) => {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const isInViewRef = useRef(variant === 'preview');
  const isPausedRef = useRef(variant === 'card');
  const userPausedRef = useRef(false);
  const [isInView, setInView] = useState(variant === 'preview');
  const [isPaused, setPausedState] = useState(variant === 'card');
  const [isMuted, setMutedState] = useState(() => getSharedFeedVideoMuted());

  const setPaused = useCallback((paused: boolean) => {
    isPausedRef.current = paused;
    setPausedState(paused);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    setMutedState(muted);

    const video = videoRef.current;
    if (video) {
      video.muted = muted;
    }
  }, []);

  const announceActiveVideo = useCallback(() => {
    if (variant !== 'card') return;
    window.dispatchEvent(new CustomEvent(FEED_VIDEO_PLAY_EVENT, { detail: { playerId } }));
  }, [playerId, variant]);

  const pauseVideo = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }

    setPaused(true);
  }, [setPaused]);

  const playVideo = useCallback((announce = false) => {
    const video = videoRef.current;
    if (!video) {
      setPaused(false);
      return;
    }

    video.muted = getSharedFeedVideoMuted();
    const playRequest = video.play();
    setPaused(false);

    if (playRequest) {
      playRequest
        .then(() => {
          if (announce) announceActiveVideo();
        })
        .catch(() => setPaused(true));
      return;
    }

    if (announce) announceActiveVideo();
  }, [announceActiveVideo, setPaused]);

  useEffect(() => {
    userPausedRef.current = false;
    setMuted(getSharedFeedVideoMuted());

    const video = videoRef.current;
    if (!video) {
      setPaused(variant === 'card');
      return;
    }

    if (variant === 'preview') {
      try {
        video.currentTime = 0;
      } catch {
        // Some browsers only allow currentTime updates after metadata is ready.
      }

      playVideo(false);
      return;
    }

    setPaused(true);
    video.pause();
  }, [playVideo, setMuted, setPaused, src, variant]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    const handleMutedChange = (event: Event) => {
      const nextMuted = (event as CustomEvent<{ muted: boolean }>).detail?.muted;
      if (typeof nextMuted === 'boolean') {
        setMuted(nextMuted);
      }
    };

    window.addEventListener(FEED_VIDEO_MUTED_EVENT, handleMutedChange);
    return () => window.removeEventListener(FEED_VIDEO_MUTED_EVENT, handleMutedChange);
  }, [setMuted]);

  useEffect(() => {
    if (variant !== 'card') return;

    const handleActiveVideoChange = (event: Event) => {
      const activePlayerId = (event as CustomEvent<{ playerId: string }>).detail?.playerId;
      if (activePlayerId && activePlayerId !== playerId) {
        pauseVideo();
      }
    };

    window.addEventListener(FEED_VIDEO_PLAY_EVENT, handleActiveVideoChange);
    return () => window.removeEventListener(FEED_VIDEO_PLAY_EVENT, handleActiveVideoChange);
  }, [pauseVideo, playerId, variant]);

  useEffect(() => {
    if (variant !== 'card') return;

    const player = playerRef.current;
    if (!player || typeof IntersectionObserver === 'undefined') {
      isInViewRef.current = true;
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      const nextIsInView = entry.isIntersecting && entry.intersectionRatio >= FEED_VIDEO_VISIBLE_THRESHOLD;
      isInViewRef.current = nextIsInView;
      setInView(nextIsInView);
    }, { threshold: [0, 0.25, FEED_VIDEO_VISIBLE_THRESHOLD, 0.6, 0.8, 1] });

    observer.observe(player);
    return () => observer.disconnect();
  }, [src, variant]);

  useEffect(() => {
    if (variant !== 'card') return;

    if (!isInView || suspendAutoPlay) {
      pauseVideo();
      return;
    }

    if (!userPausedRef.current) {
      playVideo(true);
    }
  }, [isInView, pauseVideo, playVideo, suspendAutoPlay, variant]);

  useEffect(() => {
    if (variant !== 'card' || !restoreRequest || restoreRequest.src !== src) return;

    userPausedRef.current = restoreRequest.userPaused;

    const video = videoRef.current;
    if (video) {
      try {
        video.currentTime = restoreRequest.currentTime;
      } catch {
        // The browser will keep the current frame if the saved time cannot be applied yet.
      }
    }

    if (restoreRequest.wasPlaying && !restoreRequest.userPaused && isInViewRef.current && !suspendAutoPlay) {
      playVideo(true);
      return;
    }

    pauseVideo();
  }, [
    pauseVideo,
    playVideo,
    restoreRequest,
    restoreRequest?.currentTime,
    restoreRequest?.requestId,
    restoreRequest?.src,
    restoreRequest?.userPaused,
    restoreRequest?.wasPlaying,
    src,
    suspendAutoPlay,
    variant,
  ]);

  useEffect(() => () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  }, []);

  const openPreview = useCallback(() => {
    if (!onOpenPreview) return;

    const video = videoRef.current;
    const snapshot: VideoPreviewSnapshot = {
      currentTime: video?.currentTime || 0,
      src,
      userPaused: userPausedRef.current,
      wasPlaying: video ? !video.paused && !video.ended : !isPausedRef.current,
    };

    pauseVideo();
    onOpenPreview(snapshot);
  }, [onOpenPreview, pauseVideo, src]);

  const togglePlayback = useCallback((event?: MouseEvent<HTMLButtonElement>) => {
    event?.stopPropagation();
    const shouldPlay = isPausedRef.current;

    if (shouldPlay) {
      userPausedRef.current = false;
      playVideo(variant === 'card');
      return;
    }

    userPausedRef.current = variant === 'card';
    pauseVideo();
  }, [pauseVideo, playVideo, variant]);

  const toggleMute = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateSharedFeedVideoMuted(!getSharedFeedVideoMuted());
  }, []);

  const handlePlayerClick = useCallback(() => {
    if (variant === 'card') {
      openPreview();
      return;
    }

    togglePlayback();
  }, [openPreview, togglePlayback, variant]);

  return (
    <div
      ref={playerRef}
      className={cn('v1-post-card__video-player', `v1-post-card__video-player--${variant}`)}
      onClick={handlePlayerClick}
      onKeyDown={(event) => {
        if (variant !== 'card' || !onOpenPreview) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openPreview();
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
        autoPlay={variant === 'preview'}
        muted={isMuted}
        playsInline
        loop
        preload="metadata"
        disablePictureInPicture
        aria-label={ariaLabel}
        onPlay={() => {
          setPaused(false);
          announceActiveVideo();
        }}
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
  const [isMediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const [videoRestoreRequest, setVideoRestoreRequest] = useState<VideoRestoreRequest | null>(null);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const previewRestoreRef = useRef<VideoPreviewSnapshot | null>(null);
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
    const restoreSnapshot = previewRestoreRef.current;
    previewRestoreRef.current = null;
    setMediaPreviewOpen(false);

    if (restoreSnapshot) {
      setVideoRestoreRequest({ ...restoreSnapshot, requestId: Date.now() });
    }
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

  const openMediaPreview = useCallback((snapshot?: VideoPreviewSnapshot) => {
    previewRestoreRef.current = snapshot || null;
    setMediaPreviewOpen(true);
  }, []);

  const openImagePreview = useCallback(() => {
    openMediaPreview();
  }, [openMediaPreview]);

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
  }, []);

  useLockBodyScroll(isMediaPreviewOpen);

  useEffect(() => {
    setActiveAttachmentPanel('code');
    setShowFullCode(false);
    setCurrentIndex(0);
    setVideoRestoreRequest(null);
    previewRestoreRef.current = null;
  }, [post._id]);

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
              <AvatarImage src={avatarUrl} fallback={<UserRound size={22} aria-hidden="true" />} />
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
              {!isVideoMedia(activeMedia) && <Image className="v1-post-card__media-bg" src={activeMedia.url} type="card" alt="" aria-hidden="true" />}
              <div className="v1-post-card__media-overlay" />
              {isVideoMedia(activeMedia) ? (
                <PostVideoPlayer
                  ariaLabel={`Post video ${currentIndex + 1}`}
                  className="v1-post-card__media-main"
                  playerId={`post-card:${post._id}:${currentIndex}:${activeMedia.fileId || activeMedia.url}`}
                  restoreRequest={videoRestoreRequest}
                  src={activeMedia.url}
                  suspendAutoPlay={isMediaPreviewOpen}
                  variant="card"
                  onOpenPreview={openMediaPreview}
                />
              ) : (
                <Image className="v1-post-card__media-main" src={activeMedia.url} type="post" alt={`Post content ${currentIndex + 1}`} />
              )}
              {!isVideoMedia(activeMedia) && <button type="button" className="v1-post-card__media-open" onClick={openImagePreview} aria-label="Open media preview" />}

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
                key={`post-preview:${post._id}:${currentIndex}:${activeMedia.fileId || activeMedia.url}`}
                ariaLabel={`Post video ${currentIndex + 1} preview`}
                className="v1-post-card__media-preview-media"
                playerId={`post-preview:${post._id}:${currentIndex}:${activeMedia.fileId || activeMedia.url}`}
                src={activeMedia.url}
                variant="preview"
              />
            ) : (
              <Image className="v1-post-card__media-preview-media" src={activeMedia.url} type="preview" alt={`Post content ${currentIndex + 1}`} />
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
