import { Loader2, MessageSquare, Send, X } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { useSendMessageMutation } from '@/features/messages/api/chat.api';
import type { FeedbackTargetType } from '@/features/messages/model/chat.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type SendFeedbackModalProps = {
  feedbackOn: FeedbackTargetType;
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  receiverId?: string;
  userId?: string;
};

const getTitle = (feedbackOn: FeedbackTargetType) => (
  feedbackOn === 'Post' ? 'Send post feedback' : 'Send profile feedback'
);

const SendFeedbackModal = ({ feedbackOn, isOpen, onClose, postId, receiverId, userId }: SendFeedbackModalProps) => {
  const { showError, showSuccess } = useToast();
  const [message, setMessage] = useState('');
  const [sendMessage, { isLoading }] = useSendMessageMutation();

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) setMessage('');
  }, [isOpen]);

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

    try {
      const result = await sendMessage({
        receiverId,
        message: trimmedMessage,
        isFeedback: true,
        feedbackOn,
        ...(feedbackOn === 'Post' ? { postId } : { userId }),
      }).unwrap();
      showSuccess(result.message || 'Feedback sent successfully!');
      onClose();
    } catch (error) {
      showError(getErrorMessage(error, 'Feedback could not be sent.'));
    }
  }, [feedbackOn, message, onClose, postId, receiverId, sendMessage, showError, showSuccess, userId]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <form className="modal-card report-modal" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <MessageSquare size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Feedback</p>
            <h1>{getTitle(feedbackOn)}</h1>
          </div>
          <Button variant="ghost" className="button--icon" type="button" onClick={onClose} aria-label="Close feedback modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        <div className="report-modal__body">
          <label className="field">
            <span>Message</span>
            <textarea
              className="input textarea report-modal__textarea"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Share your feedback"
              maxLength={2000}
              required
            />
          </label>
          <small className="report-modal__count">{message.length}/2000</small>
        </div>

        <footer className="report-modal__footer">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
            Send
          </Button>
        </footer>
      </form>
    </div>,
    document.body,
  );
};

export default SendFeedbackModal;