import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Code2,
  Copy,
  Edit3,
  ExternalLink,
  GitFork,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquareWarning,
  MoreHorizontal,
  Repeat2,
  SendHorizontal,
  Share2,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import CommentModal from '@/features/comments/ui/components/CommentModal';
import SendFeedbackModal from '@/features/messages/ui/components/SendFeedbackModal';
import { useDeletePostMutation, useGetPostQuery } from '@/features/posts/api/post.api';
import { getPostAuthor, getPostImageUrl, getPostMedia, getPostOwnerId, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post, PostAuthor, PostLink } from '@/features/posts/model/post.types';
import { usePostLike } from '@/features/posts/ui/hooks/usePostLike';
import { usePostRepost } from '@/features/posts/ui/hooks/usePostRepost';
import ReportModal from '@/features/reports/ui/components/ReportModal';
import ManageSaveCollectionsModal from '@/features/saves/ui/components/ManageSaveCollectionsModal';
import { usePostSave } from '@/features/saves/ui/hooks/usePostSave';
import { useToast } from '@/shared/hooks/useToast';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import PostComposerModal from './PostComposerModal';
import SharePostModal from './SharePostModal';

type PostCardProps = {
  post: Post;
  viewerId?: string;
  fallbackAuthor?: PostAuthor;
  className?: string;
  compact?: boolean;
};

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

const ActionItem = ({
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
      {count !== undefined && Number(count) > 0 && <small>{count}</small>}
    </span>
    <em>{label}</em>
  </button>
);

const normalizeLink = (url?: string) => {
  const trimmedUrl = url?.trim();
  if (!trimmedUrl) return '';
  return /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;
};

const truncateUrl = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

const PostCard = ({ className, fallbackAuthor, post, viewerId }: PostCardProps) => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [isEditOpen, setEditOpen] = useState(false);
  const [isCommentsOpen, setCommentsOpen] = useState(false);
  const [isCollectionsOpen, setCollectionsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const [isShareOpen, setShareOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const { data: fullPostData, isFetching: isPostFetching } = useGetPostQuery(post._id, { skip: !isEditOpen });
  const { isLiked, isLikeUpdating, likesCount, toggleLike } = usePostLike(post);
  const { isReposted, isRepostUpdating, repostsCount, toggleRepost } = usePostRepost(post);
  const { isSaved, isSaveUpdating, markSaved, toggleSave } = usePostSave(post);

  const author = getPostAuthor(post, fallbackAuthor);
  const ownerId = getPostOwnerId(post, fallbackAuthor);
  const avatarUrl = getPostImageUrl(author);
  const media = useMemo(() => getPostMedia(post), [post]);
  const activeMedia = media[currentIndex];
  const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId);
  const counts = post.counts || {};
  const commentsDisabled = Boolean(post.settings?.commentsDisabled);
  const hideLikesCount = Boolean(post.settings?.hideLikesCount);
  const caption = post.caption || '';
  const shouldTruncate = caption.length > 280;
  const visibleCaption = showFullCaption || !shouldTruncate ? caption : `${caption.slice(0, 280)}...`;
  const editablePost = fullPostData?.post || null;
  const userName = author?.userName || 'User';
  const extraLinks = useMemo<PostLink[]>(() => {
    const links = Array.isArray(post.links) ? post.links : [];
    return links.filter((link) => link.label?.trim() && link.url?.trim());
  }, [post.links]);
  const hashtags = Array.isArray(post.hashtags) ? post.hashtags : [];

  const goToPrevious = useCallback(() => {
    setCurrentIndex((current) => (current === 0 ? media.length - 1 : current - 1));
  }, [media.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((current) => (current + 1) % media.length);
  }, [media.length]);

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this post?')) return;

    try {
      const result = await deletePost(post._id).unwrap();
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

  const copyCode = useCallback(async () => {
    const code = post.codeSnippet?.code;
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      showSuccess('Code copied.');
    } catch {
      showError('Code copy nahi ho paya.');
    }
  }, [post.codeSnippet?.code, showError, showSuccess]);

  const openHashtag = useCallback((tag: string) => {
    navigate(`/search?q=${encodeURIComponent(`#${tag}`)}`);
  }, [navigate]);

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
              <button type="button" onClick={() => setShowDropdown((current) => !current)} aria-label="Post options">
                <MoreHorizontal size={20} aria-hidden="true" />
              </button>
              {showDropdown && (
                <>
                  <button type="button" className="v1-post-card__scrim" onClick={() => setShowDropdown(false)} aria-label="Close post options" />
                  <div className="v1-post-card__dropdown">
                    {isOwner && <button type="button" onClick={() => { setShowDropdown(false); setEditOpen(true); }}><Edit3 size={16} />Edit</button>}
                    {isOwner && <button type="button" className="is-danger" onClick={() => { setShowDropdown(false); void handleDelete(); }} disabled={isDeleting}>{isDeleting ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}Delete</button>}
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
            <span>{visibleCaption}</span>
            {shouldTruncate && <button type="button" onClick={() => setShowFullCaption((current) => !current)}>{showFullCaption ? 'less' : 'more'}</button>}
          </p>
        )}

        {extraLinks.length > 0 && (
          <div className="rich-post-card__inline-links">
            {extraLinks.map((link) => {
              const href = normalizeLink(link.url);
              return (
                <a key={`${link.label}-${link.url}`} href={href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={14} aria-hidden="true" />
                  <span>{link.label}</span>
                  <small>{truncateUrl(href)}</small>
                </a>
              );
            })}
          </div>
        )}

        {post.codeSnippet?.code && (
          <section className="rich-post-card__code">
            <header>
              <span>{post.codeSnippet.language || 'text'}</span>
              <button type="button" onClick={copyCode}>
                <Copy size={14} aria-hidden="true" />
                Copy
              </button>
            </header>
            <pre><code>{post.codeSnippet.code}</code></pre>
          </section>
        )}

        {activeMedia && (
          <section className="v1-post-card__media-shell">
            <div className="v1-post-card__media-stage">
              {!isVideoMedia(activeMedia) && <img className="v1-post-card__media-bg" src={activeMedia.url} alt="" aria-hidden="true" />}
              <div className="v1-post-card__media-overlay" />
              {isVideoMedia(activeMedia) ? (
                <video className="v1-post-card__media-main" src={activeMedia.url} controls preload="metadata" />
              ) : (
                <img className="v1-post-card__media-main" src={activeMedia.url} alt={`Post content ${currentIndex + 1}`} loading="lazy" />
              )}

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
            {post.projectLinks?.liveDemoUrl && <a href={normalizeLink(post.projectLinks.liveDemoUrl)} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} />Live Demo</a>}
            {post.projectLinks?.repositoryUrl && <a href={normalizeLink(post.projectLinks.repositoryUrl)} target="_blank" rel="noopener noreferrer"><GitFork size={14} />Github</a>}
          </div>
        )}

        {hashtags.length > 0 && (
          <div className="rich-post-card__hashtags">
            {hashtags.map((tag) => (
              <button type="button" key={tag} onClick={() => openHashtag(tag)}>
                #{tag}
              </button>
            ))}
          </div>
        )}

        <section className="v1-post-card__actions rich-post-card__actions">
          <ActionItem label="Like" count={hideLikesCount ? undefined : Number(likesCount || 0)} active={isLiked} disabled={isLikeUpdating} onClick={toggleLike} icon={<Heart size={20} className={isLiked ? 'is-filled' : ''} />} />
          <ActionItem label="Comment" count={commentsDisabled ? undefined : Number(counts.comments || 0)} disabled={commentsDisabled} onClick={() => setCommentsOpen(true)} icon={<MessageCircle size={20} />} />
          <ActionItem label="Repost" count={Number(repostsCount || 0)} active={isReposted} disabled={isRepostUpdating} onClick={toggleRepost} icon={<Repeat2 size={20} />} />
          <div className="v1-post-card__save-action">
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
          <ActionItem label="Feedback" count={Number(counts.feedbacks || 0)} disabled={isOwner || !ownerId} onClick={() => setFeedbackOpen(true)} icon={<SendHorizontal size={20} />} />
          <ActionItem label="Share" onClick={() => setShareOpen(true)} icon={<Share2 size={20} />} />
        </section>
      </div>

      {isEditOpen && <PostComposerModal isOpen={isEditOpen} mode="edit" onClose={() => setEditOpen(false)} post={editablePost || post} isPostLoading={isPostFetching && !editablePost} />}
      {isCommentsOpen && <CommentModal isOpen={isCommentsOpen} onClose={() => setCommentsOpen(false)} post={post} />}
      {isCollectionsOpen && <ManageSaveCollectionsModal isOpen={isCollectionsOpen} onClose={() => setCollectionsOpen(false)} postId={post._id} onSaved={markSaved} />}
      {isReportOpen && <ReportModal isOpen={isReportOpen} onClose={() => setReportOpen(false)} targetId={post._id} onModel="Post" />}
      {isShareOpen && <SharePostModal isOpen={isShareOpen} onClose={() => setShareOpen(false)} post={post} />}
      {isFeedbackOpen && ownerId && (
        <SendFeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          feedbackOn="Post"
          receiverId={ownerId}
          receiverName={userName}
          postId={post._id}
        />
      )}
    </article>
  );
};

export default memo(PostCard);
