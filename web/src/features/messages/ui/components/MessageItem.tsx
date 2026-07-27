import { Check, CheckCheck, CircleX, Clock3, Flag, MoreVertical, Undo2 } from 'lucide-react';
import { lazy, memo, Suspense, useEffect, useRef, useState } from 'react';

import { formatChatMessageTime, getFeedbackMediaUrl, getSharedPostMediaUrl } from '@/features/messages/model/chat.helpers';
import type { ChatMessage } from '@/features/messages/model/chat.types';
import ChatAvatar from './ChatAvatar';
import MessageAttachment from './MessageAttachment';
import { useMessageItem } from './useMessageItem';
import './MessageItem.css';

type MessageItemProps = {
  message: ChatMessage;
  senderName?: string;
};

const ReportModal = lazy(() => import('@/features/reports/ui/components/ReportModal'));

const MessageItem = ({ message, senderName }: MessageItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const menuRootRef = useRef<HTMLDivElement | null>(null);
  const {
    goToFeedbackPost,
    goToFeedbackProfile,
    goToSharedPost,
    handleUnsendMessage,
    isUnsendLoading,
    deliveryStatus,
    senderIsMe,
  } = useMessageItem({ message });
  const feedbackMediaUrl = getFeedbackMediaUrl(message.feedbackDetails);
  const sharedPostMediaUrl = getSharedPostMediaUrl(message.sharedPostDetails);
  const isPostMessage = message.messageType === 'post' || Boolean(message.sharedPost || message.sharedPostDetails);
  const sharedPostAuthor = message.sharedPostDetails?.user?.userName || 'Disuza';
  const sharedPostCaption = message.sharedPostDetails?.caption || 'View shared post';
  const feedbackPostCaption = message.feedbackDetails?.caption?.trim() || '';
  const shouldShowText = Boolean(message.text?.trim()) && !(message.messageType === 'attachment' && message.text === 'Sent an attachment');
  const isPendingMessage = deliveryStatus === 'pending';
  const isFailedMessage = deliveryStatus === 'failed';
  const shouldShowMenuButton = !isPendingMessage && !isFailedMessage;

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && menuRootRef.current?.contains(event.target)) return;
      setIsMenuOpen(false);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMenuOpen]);

  if (message.messageType === 'system') {
    return (
      <div className="messages-v1-system-message">
        <span>{message.text}</span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`messages-v1-message ${senderIsMe ? 'is-mine' : 'is-theirs'}`}
      >
        <div className="messages-v1-message__inner">
          <div className={`messages-v1-message__actions ${isFailedMessage ? 'is-visible' : ''}`} ref={menuRootRef}>
            {isFailedMessage ? (
              <span className="messages-v1-send-error-indicator" aria-label="Message failed to send" title="Message failed to send">
                <CircleX size={17} aria-hidden="true" />
              </span>
            ) : isPendingMessage ? (
              <span className="messages-v1-message__action-placeholder" aria-hidden="true" />
            ) : (
              <button
                type="button"
                className="messages-v1-icon-button"
                onClick={() => setIsMenuOpen((current) => !current)}
                aria-label="Message options"
              >
                <MoreVertical size={16} aria-hidden="true" />
              </button>
            )}

            {shouldShowMenuButton && isMenuOpen && (
              <div className={`messages-v1-menu messages-v1-message__menu ${senderIsMe ? 'is-right' : 'is-left'}`}>
                {senderIsMe ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      handleUnsendMessage();
                    }}
                    disabled={isUnsendLoading}
                  >
                    <Undo2 size={16} aria-hidden="true" />
                    {isUnsendLoading ? 'Unsending...' : 'Unsend'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="is-danger"
                    onClick={() => {
                      setIsMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                  >
                    <Flag size={16} aria-hidden="true" />
                    Report
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="messages-v1-message__content">
            {senderName && (
              <span className="messages-v1-message__sender">{senderName}</span>
            )}

            {message.isFeedback && (
              <div className="messages-v1-feedback-card">
                {message.feedbackOn?.type === 'Post' && (
                  <button type="button" className="messages-v1-feedback-post" onClick={goToFeedbackPost}>
                    {feedbackMediaUrl && (
                      <span className="messages-v1-feedback-post__media">
                        <img src={feedbackMediaUrl} alt="" loading="lazy" />
                        {feedbackPostCaption && (
                          <span>
                            {feedbackPostCaption.substring(0, 20)}
                            ...
                          </span>
                        )}
                      </span>
                    )}
                    {!feedbackMediaUrl && feedbackPostCaption && (
                      <strong className="messages-v1-feedback-post__caption">
                        {feedbackPostCaption}
                      </strong>
                    )}
                    <small>{senderIsMe ? 'Your feedback on this POST' : 'Feedback on your Post'}</small>
                  </button>
                )}

                {message.feedbackOn?.type === 'User' && (
                  <button type="button" className="messages-v1-feedback-user" onClick={goToFeedbackProfile}>
                    <ChatAvatar user={message.feedbackDetails} className="messages-v1-feedback-user__avatar" />
                    <span>
                      <small>{senderIsMe ? 'Your feedback on profile' : 'Feedback on your profile'}</small>
                      <strong>{message.feedbackDetails?.userName}</strong>
                    </span>
                  </button>
                )}
              </div>
            )}

            {isPostMessage && (
              <button type="button" className="messages-v1-shared-post" onClick={goToSharedPost}>
                {sharedPostMediaUrl && <img src={sharedPostMediaUrl} alt="" loading="lazy" />}
                <span>
                  <small>{message.sharedPostDetails?.isProjectPost ? 'Project post' : 'Shared post'}</small>
                  <strong>{sharedPostAuthor}</strong>
                  <em>{sharedPostCaption}</em>
                </span>
              </button>
            )}

            <div className="messages-v1-bubble">
              {message.attachment && <MessageAttachment attachment={message.attachment} />}
              {shouldShowText && <p>{message.text}</p>}
              <span className="messages-v1-bubble__meta">
                <time dateTime={message.createdAt}>{formatChatMessageTime(message.createdAt)}</time>
                {deliveryStatus && deliveryStatus !== 'failed' && (
                  <span
                    className={`messages-v1-delivery-status is-${deliveryStatus}`}
                    aria-label={deliveryStatus === 'pending' ? 'Sending' : deliveryStatus === 'seen' ? 'Seen' : deliveryStatus === 'delivered' ? 'Delivered' : 'Sent'}
                    title={deliveryStatus === 'pending' ? 'Sending' : deliveryStatus === 'seen' ? 'Seen' : deliveryStatus === 'delivered' ? 'Delivered' : 'Sent'}
                  >
                    {deliveryStatus === 'pending'
                      ? <Clock3 size={13} aria-hidden="true" />
                      : deliveryStatus === 'sent'
                        ? <Check size={14} aria-hidden="true" />
                        : <CheckCheck size={14} aria-hidden="true" />}
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        {isReportModalOpen && (
          <ReportModal
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            targetId={message._id}
            onModel="Message"
          />
        )}
      </Suspense>
    </>
  );
};

export default memo(MessageItem);
