import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import { useDeleteCommentMutation, useGetAllCommentsQuery, usePostCommentMutation } from '@/features/comments/api/comment.api';
import type { CommentItem } from '@/features/comments/model/comment.types';
import type { Post } from '@/features/posts/model/post.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseCommentModalOptions = {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
};

type ReplyTarget = Pick<CommentItem, '_id'> & {
  userName?: string;
};

export const useCommentModal = ({ isOpen, onClose, post }: UseCommentModalOptions) => {
  useLockBodyScroll(isOpen);

  const { showError } = useToast();
  const user = useAppSelector((state) => state.auth.user);
  const inputRef = useRef<HTMLInputElement>(null);
  const [page, setPage] = useState(1);
  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [emptyError, setEmptyError] = useState(false);

  const { data, error, isError, isFetching, isLoading, refetch } = useGetAllCommentsQuery(
    { postId: post._id, page },
    { skip: !post._id || !isOpen, refetchOnMountOrArgChange: true },
  );

  const [postComment, { isLoading: isPosting }] = usePostCommentMutation();
  const [deleteComment, { isLoading: isDeleting }] = useDeleteCommentMutation();

  const allComments = data?.allComments || [];
  const hasMore = Boolean(data?.hasMore);
  const myCommentIds = useMemo(() => allComments.filter((comment) => comment.user?._id === user?._id).map((comment) => comment._id), [allComments, user?._id]);
  const [highlightMyComments, setHighlightMyComments] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setPage(1);
    setReplyTarget(null);
    setCommentText('');
    setEmptyError(false);
  }, [isOpen, post._id]);

  useEffect(() => {
    if (!isOpen || myCommentIds.length === 0) return;

    setHighlightMyComments(true);
    const timer = window.setTimeout(() => setHighlightMyComments(false), 1000);

    return () => window.clearTimeout(timer);
  }, [isOpen, myCommentIds.length]);

  useEffect(() => {
    if (!emptyError) return;

    const timer = window.setTimeout(() => setEmptyError(false), 1800);
    return () => window.clearTimeout(timer);
  }, [emptyError]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleLoadMore = useCallback(() => setPage((currentPage) => currentPage + 1), []);

  const handleStartReply = useCallback((comment: CommentItem) => {
    setReplyTarget({ _id: comment._id, userName: comment.user?.userName });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleCancelReply = useCallback(() => setReplyTarget(null), []);

  const handleSubmitComment = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();

    const text = commentText.trim();
    const previousText = commentText;
    const previousReplyTarget = replyTarget;

    if (!text) {
      setEmptyError(true);
      return;
    }

    setCommentText('');
    setReplyTarget(null);
    setEmptyError(false);

    try {
      await postComment({
        postId: post._id,
        comment: text,
        ...(replyTarget?._id ? { parentCommentId: replyTarget._id } : {}),
      }).unwrap();
    } catch (apiError) {
      setCommentText(previousText);
      setReplyTarget(previousReplyTarget);
      showError(getErrorMessage(apiError));
    }
  }, [commentText, post._id, postComment, replyTarget, showError]);

  const handleDeleteComment = useCallback(async (commentId: string, parentCommentId?: string | null) => {
    try {
      await deleteComment({ postId: post._id, commentId, parentCommentId }).unwrap();
    } catch (apiError) {
      showError(getErrorMessage(apiError));
    }
  }, [deleteComment, post._id, showError]);

  return {
    allComments,
    commentText,
    currentUser: user,
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
  };
};
