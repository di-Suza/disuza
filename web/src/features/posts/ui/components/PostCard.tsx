import { Bookmark, Edit3, ExternalLink, Flag, FolderOpen, GitFork, Heart, Loader2, MessageCircle, MessageSquare, Trash2, UserRound } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import CommentModal from '@/features/comments/ui/components/CommentModal';
import SendFeedbackModal from '@/features/messages/ui/components/SendFeedbackModal';
import { useDeletePostMutation, useGetPostQuery } from '@/features/posts/api/post.api';
import { getPostAuthor, getPostImageUrl, getPostOwnerId, getPostMedia } from '@/features/posts/model/post.helpers';
import type { Post, PostAuthor } from '@/features/posts/model/post.types';
import { usePostLike } from '@/features/posts/ui/hooks/usePostLike';
import ReportModal from '@/features/reports/ui/components/ReportModal';
import ManageSaveCollectionsModal from '@/features/saves/ui/components/ManageSaveCollectionsModal';
import { usePostSave } from '@/features/saves/ui/hooks/usePostSave';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import PostComposerModal from './PostComposerModal';
import PostMediaCarousel from './PostMediaCarousel';

type PostCardProps = {
  post: Post;
  viewerId?: string;
  fallbackAuthor?: PostAuthor;
  className?: string;
  compact?: boolean;
};

const formatPostDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
};

const PostCard = ({ className, compact = false, fallbackAuthor, post, viewerId }: PostCardProps) => {
  const { showError, showSuccess } = useToast();
  const [isEditOpen, setEditOpen] = useState(false);
  const [isCommentsOpen, setCommentsOpen] = useState(false);
  const [isCollectionsOpen, setCollectionsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [isFeedbackOpen, setFeedbackOpen] = useState(false);
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();
  const { data: fullPostData, isFetching: isPostFetching } = useGetPostQuery(post._id, { skip: !isEditOpen });
  const { isLiked, isLikeUpdating, likesCount, toggleLike } = usePostLike(post);
  const { isSaved, isSaveUpdating, markSaved, toggleSave } = usePostSave(post);

  const author = getPostAuthor(post, fallbackAuthor);
  const ownerId = getPostOwnerId(post, fallbackAuthor);
  const avatarUrl = getPostImageUrl(author);
  const isOwner = Boolean(viewerId && ownerId && viewerId === ownerId);
  const orderedMedia = useMemo(() => getPostMedia(post), [post]);
  const postDate = formatPostDate(post.createdAt);
  const counts = post.counts || {};
  const commentsDisabled = Boolean(post.settings?.commentsDisabled);
  const hideLikesCount = Boolean(post.settings?.hideLikesCount);
  const canShowProjectLinks = Boolean(post.isProjectPost && post.projectLinks?.liveDemoUrl && post.projectLinks?.repositoryUrl);
  const editablePost = fullPostData?.post || null;

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Delete this post?')) return;

    try {
      const result = await deletePost(post._id).unwrap();
      showSuccess(result.message);
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [deletePost, post._id, showError, showSuccess]);

  return (
    <article className={cn('post-card', compact && 'post-card--compact', className)}>
      <header className="post-card__header">
        <Link to={author?._id ? `/profile/${author._id}` : '/dashboard'} className="post-card__author">
          <span className="post-card__avatar">
            {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={20} aria-hidden="true" />}
          </span>
          <span>
            <strong>{author?.userName || 'DevLoopFeed user'}</strong>
            <small>{postDate || author?.headline || 'Developer post'}</small>
          </span>
        </Link>

        <div className="post-card__header-actions">
          {post.isProjectPost && <span className="post-card__badge">Project</span>}
          {isOwner ? (
            <>
              <Button variant="ghost" className="button--icon" onClick={() => setEditOpen(true)} aria-label="Edit post">
                <Edit3 size={17} aria-hidden="true" />
              </Button>
              <Button variant="danger" className="button--icon" onClick={handleDelete} disabled={isDeleting} aria-label="Delete post">
                {isDeleting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Trash2 size={17} aria-hidden="true" />}
              </Button>
            </>
          ) : (
            <Button variant="ghost" className="button--icon" onClick={() => setReportOpen(true)} aria-label="Report post">
              <Flag size={17} aria-hidden="true" />
            </Button>
          )}
        </div>
      </header>

      {orderedMedia.length > 0 && <PostMediaCarousel media={orderedMedia} />}

      {post.caption && <p className="post-card__caption">{post.caption}</p>}

      {canShowProjectLinks && (
        <div className="post-card__links">
          <a href={post.projectLinks!.liveDemoUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} aria-hidden="true" />Live
          </a>
          <a href={post.projectLinks!.repositoryUrl} target="_blank" rel="noreferrer">
            <GitFork size={16} aria-hidden="true" />Code
          </a>
        </div>
      )}

      <footer className="post-card__footer">
        <button
          type="button"
          className={cn('post-card__footer-button post-card__footer-button--like', isLiked && 'is-active')}
          onClick={toggleLike}
          disabled={isLikeUpdating}
          aria-label={isLiked ? 'Unlike post' : 'Like post'}
          aria-pressed={isLiked}
        >
          {isLikeUpdating ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Heart size={16} aria-hidden="true" />}
          {hideLikesCount ? (isLiked ? 'Liked' : 'Like') : likesCount}
        </button>
        {commentsDisabled ? (
          <span><MessageCircle size={16} aria-hidden="true" />Off</span>
        ) : (
          <button type="button" className="post-card__footer-button" onClick={() => setCommentsOpen(true)} aria-label="Open comments">
            <MessageCircle size={16} aria-hidden="true" />{Number(counts.comments || 0)}
          </button>
        )}
        <button
          type="button"
          className={cn('post-card__footer-button post-card__footer-button--save', isSaved && 'is-active')}
          onClick={toggleSave}
          disabled={isSaveUpdating}
          aria-label={isSaved ? 'Unsave post' : 'Save post'}
          aria-pressed={isSaved}
        >
          {isSaveUpdating ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Bookmark size={16} aria-hidden="true" />}
          {isSaved ? 'Saved' : 'Save'}
        </button>
        {!isOwner && ownerId && (
          <button type="button" className="post-card__footer-button" onClick={() => setFeedbackOpen(true)} aria-label="Send feedback">
            <MessageSquare size={16} aria-hidden="true" />Feedback
          </button>
        )}
        {isSaved && (
          <button type="button" className="post-card__footer-button" onClick={() => setCollectionsOpen(true)} aria-label="Manage saved collection">
            <FolderOpen size={16} aria-hidden="true" />Manage
          </button>
        )}
      </footer>

      {isEditOpen && (
        <PostComposerModal
          isOpen={isEditOpen}
          mode="edit"
          onClose={() => setEditOpen(false)}
          post={editablePost || post}
          isPostLoading={isPostFetching && !editablePost}
        />
      )}

      {isCommentsOpen && (
        <CommentModal
          isOpen={isCommentsOpen}
          onClose={() => setCommentsOpen(false)}
          post={post}
        />
      )}

      {isCollectionsOpen && (
        <ManageSaveCollectionsModal
          isOpen={isCollectionsOpen}
          onClose={() => setCollectionsOpen(false)}
          postId={post._id}
          onSaved={markSaved}
        />
      )}

      {isReportOpen && (
        <ReportModal
          isOpen={isReportOpen}
          onClose={() => setReportOpen(false)}
          targetId={post._id}
          onModel="Post"
        />
      )}
      {isFeedbackOpen && ownerId && (
        <SendFeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          feedbackOn="Post"
          receiverId={ownerId}
          postId={post._id}
        />
      )}
    </article>
  );
};

export default memo(PostCard);
