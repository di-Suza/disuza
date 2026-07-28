import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { removeLastReceivedMessage } from '@/features/messages/state/chatSlice';
import { useToast } from '@/shared/hooks/useToast';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

const MessageObserver = () => {
  const dispatch = useAppDispatch();
  const lastReceivedMessage = useAppSelector((state) => state.chat.lastReceivedMessage);
  const { showNotify } = useToast();

  useEffect(() => {
    if (!lastReceivedMessage) return;

    const senderName = lastReceivedMessage.senderInfo?.userName || 'Someone';
    const rawImage = lastReceivedMessage.senderInfo?.profilePicture?.url;
    const image = rawImage ? getOptimizedImage(rawImage, 'avatarSmall') || rawImage : undefined;
    const preview = lastReceivedMessage.text?.trim() || (lastReceivedMessage.attachment ? 'Sent you an attachment' : 'Sent you a message');
    let message = `Sent you message - "${preview}"!`;

    if (lastReceivedMessage.isFeedback) {
      message = lastReceivedMessage.feedbackOn?.type === 'User'
        ? 'Gives you a feedback on your PORTFOLIO'
        : 'Gives you a feedback on your POST';
    }

    showNotify(message, image, senderName, 3000);
    dispatch(removeLastReceivedMessage());
  }, [dispatch, lastReceivedMessage, showNotify]);

  return null;
};

export default MessageObserver;
