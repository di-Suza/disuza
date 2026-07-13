import { Flag, MoreVertical, Undo2 } from 'lucide-react';
import { memo, useState } from 'react';

import { formatChatMessageTime, getFeedbackMediaUrl } from '@/features/messages/model/chat.helpers';
import type { ChatMessage } from '@/features/messages/model/chat.types';
import ReportModal from '@/features/reports/ui/components/ReportModal';
import ChatAvatar from './ChatAvatar';
import { useMessageItem } from './useMessageItem';

type MessageItemProps = {
  message: ChatMessage;
};

const MessageItem = ({ message }: MessageItemProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const {
    goToFeedbackPost,
    goToFeedbackProfile,
    handleUnsendMessage,
    isUnsendLoading,
    senderIsMe,
  } = useMessageItem({ message });
  const feedbackMediaUrl = getFeedbackMediaUrl(message.feedbackDetails);

  return (
    <>
      <div
        className={`messages-v1-message ${senderIsMe ? 'is-mine' : 'is-theirs'}`}
        onMouseLeave={() => setIsMenuOpen(false)}
      >
        <div className="messages-v1-message__inner">
          <div className="messages-v1-message__actions">
            <button
              type="button"
              className="messages-v1-icon-button"
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-label="Message options"
            >
              <MoreVertical size={16} aria-hidden="true" />
            </button>

            {isMenuOpen && (
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
            {message.isFeedback && (
              <div className="messages-v1-feedback-card">
                {message.feedbackOn?.type === 'Post' && (
                  <button type="button" className="messages-v1-feedback-post" onClick={goToFeedbackPost}>
                    {feedbackMediaUrl && (
                      <span className="messages-v1-feedback-post__media">
                        <img src={feedbackMediaUrl} alt="" loading="lazy" />
                        {message.feedbackDetails?.caption && (
                          <span>
                            {message.feedbackDetails.caption.substring(0, 20)}
                            ...
                          </span>
                        )}
                      </span>
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

            <div className="messages-v1-bubble">
              <p>{message.text}</p>
              <time dateTime={message.createdAt}>{formatChatMessageTime(message.createdAt)}</time>
            </div>
          </div>
        </div>
      </div>

      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={message._id}
        onModel="Message"
      />
    </>
  );
};

export default memo(MessageItem);
