import { ChevronDown, MessageCircleReply, RefreshCw, Send, Trash2, UserRound, X } from 'lucide-react';
import { memo } from 'react';
import { createPortal } from 'react-dom';

import { canDeleteComment, formatCommentTime, getCommentAvatarUrl } from '@/features/comments/model/comment.helpers';
import type { Post } from '@/features/posts/model/post.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { cn } from '@/shared/utils/cn';
import CommentReplies from './CommentReplies';
import { useCommentModal } from '../hooks/useCommentModal';
import './Comments.css';

type CommentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
};

const CommentModal = ({ isOpen, onClose, post }: CommentModalProps) => {
  const {
    allComments,
    commentText,
    currentUser,
    emptyError,
    error,
    handleCancelReply,
    handleDeleteComment,
    handleLoadMore,
    handleStartReply,
    handleSubmitComment,
    hasMore,
    highlightMyComments,
    inputRef,
    isDeleting,
    isError,
    isFetching,
    isLoading,
    isPosting,
    refetch,
    replyTarget,
    setCommentText,
  } = useCommentModal({ isOpen, onClose, post });

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop comments-backdrop" role="dialog" aria-modal="true" aria-label="Comments">
      <section className="modal-card comments-modal">
        <div className="modal-card__header comments-modal__header">
          <div>
            <p className="state-panel__eyebrow">Discussion</p>
            <h1>Comments</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label="Close comments">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        <div className="comments-modal__body">
          {isLoading ? (
            <LoadingSpinner className="comment-state" label="Loading comments" />
          ) : isError ? (
            <div className="comment-state">
              <RefreshCw size={24} aria-hidden="true" />
              <p>{error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Comments could not be loaded.'}</p>
              <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : allComments.length === 0 ? (
            <div className="comment-state">
              <MessageCircleReply size={24} aria-hidden="true" />
              <p>No comments yet.</p>
            </div>
          ) : (
            <div className="comments-list">
              {allComments.map((comment) => {
                const avatarUrl = getCommentAvatarUrl(comment);
                const isMine = highlightMyComments && comment.user?._id === currentUser?._id;

                return (
                  <div className="comment-thread" key={comment._id}>
                    <article className={cn('comment-item', isMine && 'comment-item--mine')}>
                      <span className="comment-avatar">
                        {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={18} aria-hidden="true" />}
                      </span>
                      <div className="comment-item__body">
                        <div className="comment-item__meta">
                          <strong>{comment.user?.userName || 'Disuza user'}</strong>
                          <span>{formatCommentTime(comment.createdAt)}</span>
                        </div>
                        <p>{comment.comment}</p>
                        <button type="button" className="comment-item__reply" onClick={() => handleStartReply(comment)}>
                          <MessageCircleReply size={14} aria-hidden="true" />Reply
                        </button>
                      </div>
                      {canDeleteComment(comment, currentUser?._id) && (
                        <Button variant="danger" className="button--icon comment-item__delete" onClick={() => handleDeleteComment(comment._id)} disabled={isDeleting} aria-label="Delete comment">
                          <Trash2 size={15} aria-hidden="true" />
                        </Button>
                      )}
                    </article>

                    <CommentReplies parentComment={comment} userId={currentUser?._id} onDeleteComment={handleDeleteComment} />
                  </div>
                );
              })}
            </div>
          )}

          {hasMore && (
            <div className="comments-load-more">
              <Button variant="secondary" onClick={handleLoadMore} isLoading={isFetching} loadingLabel="Loading comments">
                <ChevronDown size={16} aria-hidden="true" />
                Load more comments
              </Button>
            </div>
          )}
        </div>

        <form className="comments-composer" onSubmit={handleSubmitComment}>
          {replyTarget && (
            <div className="comments-composer__reply-target">
              <span>Replying to <strong>@{replyTarget.userName || 'user'}</strong></span>
              <button type="button" onClick={handleCancelReply}>Cancel</button>
            </div>
          )}
          <div className="comments-composer__row">
            <span className="comment-avatar comment-avatar--small">
              {currentUser?.profilePicture?.url ? <img src={currentUser.profilePicture.url} alt="" /> : <UserRound size={15} aria-hidden="true" />}
            </span>
            <Input
              ref={inputRef}
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder={replyTarget ? `Reply to @${replyTarget.userName || 'user'}...` : 'Add a comment...'}
              className={cn('comments-composer__input', emptyError && 'comments-composer__input--error')}
              maxLength={1000}
            />
            <Button type="submit" className="button--icon" isLoading={isPosting} loadingLabel={replyTarget ? 'Posting reply' : 'Posting comment'} aria-label={replyTarget ? 'Post reply' : 'Post comment'}>
              <Send size={18} aria-hidden="true" />
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
};

export default memo(CommentModal);
