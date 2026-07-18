import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '@/app/store/hooks';
import { useUnsendMessageMutation } from '@/features/messages/api/chat.api';
import { isMessageFromUser } from '@/features/messages/model/chat.helpers';
import type { ChatMessage } from '@/features/messages/model/chat.types';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type UseMessageItemArgs = {
  message: ChatMessage;
};

export const useMessageItem = ({ message }: UseMessageItemArgs) => {
  const navigate = useNavigate();
  const { showError } = useToast();
  const userId = useAppSelector((state) => state.auth.user?._id);
  const [unsendMessage, { isLoading: isUnsendLoading }] = useUnsendMessageMutation();
  const senderIsMe = isMessageFromUser(message, userId);
  const seenCount = senderIsMe
    ? new Set((message.seenBy || [])
      .map((receipt) => receipt.user)
      .filter((receiptUserId) => receiptUserId && receiptUserId !== userId)).size
    : 0;
  const deliveredCount = senderIsMe
    ? new Set((message.deliveredTo || [])
      .map((recipientId) => recipientId?.toString())
      .filter((recipientId) => recipientId && recipientId !== userId)).size
    : 0;
  const deliveryStatus = senderIsMe
    ? seenCount > 0
      ? 'seen'
      : deliveredCount > 0
        ? 'delivered'
        : 'sent'
    : null;

  const goToFeedbackPost = useCallback(() => {
    const postId = message.feedbackDetails?._id;
    if (postId) navigate(`/post/${postId}`);
  }, [message.feedbackDetails?._id, navigate]);

  const goToFeedbackProfile = useCallback(() => {
    const profileId = message.feedbackDetails?._id;
    if (profileId) navigate(`/profile/${profileId}`);
  }, [message.feedbackDetails?._id, navigate]);

  const goToSharedPost = useCallback(() => {
    const postId = message.sharedPostDetails?._id || message.sharedPost;
    if (postId) navigate(`/post/${postId}`);
  }, [message.sharedPost, message.sharedPostDetails?._id, navigate]);

  const handleUnsendMessage = useCallback(async () => {
    if (!senderIsMe || !message._id || !message.conversationId) return;

    try {
      await unsendMessage({
        messageId: message._id,
        conversationId: message.conversationId,
      }).unwrap();
    } catch (error) {
      showError(getErrorMessage(error, 'Message could not be unsent.'));
    }
  }, [message._id, message.conversationId, senderIsMe, showError, unsendMessage]);

  return {
    goToFeedbackPost,
    goToFeedbackProfile,
    goToSharedPost,
    handleUnsendMessage,
    isUnsendLoading,
    deliveryStatus,
    senderIsMe,
  };
};
