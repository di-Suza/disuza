import { Send, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import { useSendMessageMutation } from '@/features/messages/api/chat.api';
import type { FeedbackTargetType, SendMessageRequest } from '@/features/messages/model/chat.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './SendFeedbackModal.css';

type SendFeedbackModalProps = {
  feedbackOn: FeedbackTargetType;
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  receiverId?: string;
  receiverName?: string;
  userId?: string;
};

const SendFeedbackModal = ({ feedbackOn, isOpen, onClose, postId, receiverId, receiverName, userId }: SendFeedbackModalProps) => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [message, setMessage] = useState('');
  const [sendAsFeedback, setSendAsFeedback] = useState(true);
  const [sendMessage, { isLoading }] = useSendMessageMutation();

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setMessage('');
      setSendAsFeedback(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const receiverLabel = useMemo(() => receiverName?.trim() || 'this user', [receiverName]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      showError('Feedback cannot be empty.');
      return;
    }

    if (!receiverId) {
      showError('Feedback receiver is missing.');
      return;
    }

    if (sendAsFeedback && feedbackOn === 'Post' && !postId) {
      showError('Post feedback target is missing.');
      return;
    }

    if (sendAsFeedback && feedbackOn === 'User' && !userId) {
      showError('Profile feedback target is missing.');
      return;
    }

    const payload: SendMessageRequest = {
      receiverId,
      message: trimmedMessage,
      ...(sendAsFeedback
        ? {
            isFeedback: true,
            feedbackOn,
            ...(feedbackOn === 'Post' ? { postId } : { userId }),
          }
        : {}),
    };

    try {
      const result = await sendMessage(payload).unwrap();
      showSuccess(result.message || 'Feedback sent successfully!');
      onClose();
      navigate('/messages', {
        state: {
          openConversationId: result.newMessage?.conversationId,
          openChatUserId: receiverId,
        },
      });
    } catch (error) {
      showError(getErrorMessage(error, 'Feedback could not be sent.'));
    }
  }, [feedbackOn, message, navigate, onClose, postId, receiverId, sendAsFeedback, sendMessage, showError, showSuccess, userId]);

  const handleTextareaKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop feedback-modal-v1-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <form className="feedback-modal-v1" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close feedback modal" className="feedback-modal-v1__close">
          <X size={20} aria-hidden="true" />
        </button>

        <header className="feedback-modal-v1__header">
          <h1>Send Your Feedback to {receiverLabel}</h1>
          <label className="feedback-modal-v1__toggle">
            <span>As feedback</span>
            <input type="checkbox" checked={sendAsFeedback} onChange={(event) => setSendAsFeedback(event.target.checked)} />
            <span className={`feedback-modal-v1__switch ${sendAsFeedback ? 'is-on' : ''}`} aria-hidden="true">
              <span />
            </span>
          </label>
        </header>

        <div className="feedback-modal-v1__body">
          <label className="feedback-modal-v1__field">
            <span className="visually-hidden">Message</span>
            <textarea
              className="feedback-modal-v1__textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Type here..."
              maxLength={2000}
              required
              autoFocus
            />
          </label>
          <div className="feedback-modal-v1__footer">
            <small>{message.length}/2000</small>
            <Button type="submit" variant="secondary" isLoading={isLoading} loadingLabel="Sending feedback">
              <Send size={17} aria-hidden="true" />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>,
    document.body,
  );
};

export default SendFeedbackModal;
