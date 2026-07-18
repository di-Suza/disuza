import { ChevronDown, MessageCircleReply, Trash2, UserRound } from 'lucide-react';
import { memo, useState } from 'react';

import { useGetRepliesQuery } from '@/features/comments/api/comment.api';
import { canDeleteComment, formatCommentTime, getCommentAvatarUrl } from '@/features/comments/model/comment.helpers';
import type { CommentItem } from '@/features/comments/model/comment.types';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';

type CommentRepliesProps = {
  parentComment: CommentItem;
  userId?: string;
  onDeleteComment: (commentId: string, parentCommentId?: string | null) => void;
};

const CommentReplies = ({ onDeleteComment, parentComment, userId }: CommentRepliesProps) => {
  const [isOpen, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data, error, isError, isFetching, isLoading, refetch } = useGetRepliesQuery(
    { commentId: parentComment._id, page },
    { skip: !isOpen },
  );

  const replies = data?.replies || [];
  const hasMore = Boolean(data?.hasMore);
  const replyCount = Number(parentComment.replyCount || 0);

  if (replyCount <= 0) return null;

  return (
    <div className="comment-replies">
      {!isOpen && (
        <button type="button" className="comment-replies__toggle" onClick={() => setOpen(true)}>
          <MessageCircleReply size={14} aria-hidden="true" />
          View {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
        </button>
      )}

      {isOpen && (
        <div className="comment-replies__list">
          {isLoading && <LoadingSpinner label="Loading replies" />}
          {isError && (
            <div className="comment-inline-error">
              <p>{error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Replies could not be loaded.'}</p>
              <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
            </div>
          )}

          {!isLoading && !isError && replies.map((reply) => {
            const avatarUrl = getCommentAvatarUrl(reply);
            return (
              <article className="comment-item comment-item--reply" key={reply._id}>
                <span className="comment-avatar comment-avatar--small">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={15} aria-hidden="true" />}
                </span>
                <div className="comment-item__body">
                  <div className="comment-item__meta">
                    <strong>{reply.user?.userName || 'DevLoopFeed user'}</strong>
                    <span>{formatCommentTime(reply.createdAt)}</span>
                  </div>
                  <p>{reply.comment}</p>
                </div>
                {canDeleteComment(reply, userId) && (
                  <Button variant="danger" className="button--icon comment-item__delete" onClick={() => onDeleteComment(reply._id, parentComment._id)} aria-label="Delete reply">
                    <Trash2 size={15} aria-hidden="true" />
                  </Button>
                )}
              </article>
            );
          })}

          {hasMore && (
            <button type="button" className="comment-replies__load" onClick={() => setPage((currentPage) => currentPage + 1)} disabled={isFetching}>
              {isFetching ? <LoadingSpinner inline label="Loading replies" size={14} /> : <ChevronDown size={14} aria-hidden="true" />}
              {!isFetching && 'Load more replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(CommentReplies);
