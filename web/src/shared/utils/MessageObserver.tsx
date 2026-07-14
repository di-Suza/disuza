import { useEffect } from 'react';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { removeLastReceivedMessage } from '@/features/messages/state/chatSlice';
import { useToast } from '@/shared/hooks/useToast';

const MessageObserver = () => {
  const dispatch = useAppDispatch();
  const lastReceivedMessage = useAppSelector((state) => state.chat.lastReceivedMessage);
  const { showNotify } = useToast();

  useEffect(() => {
    if (!lastReceivedMessage?.senderInfo) return;

    const senderName = lastReceivedMessage.senderInfo.userName || 'Someone';
    const image = lastReceivedMessage.senderInfo.profilePicture?.url;
    let message = `Sent you message - "${lastReceivedMessage.text}"!`;

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
