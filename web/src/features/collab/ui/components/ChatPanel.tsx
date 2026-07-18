import { MessageSquare, RefreshCw, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { useGetMessagesQuery, useMarkAsReadMutation, useSendMessageMutation } from '@/features/messages/api/chat.api';
import MessageItem from '@/features/messages/ui/components/MessageItem';
import type { RoomChatPanelProps } from '@/features/collab/model/collab.types';
import { useToast } from '@/shared/hooks/useToast';
import Input from '@/shared/ui/Input';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import './ChatPanel.css';

const ChatPanel = ({ conversationId, otherUser }: RoomChatPanelProps) => {
  const { showError } = useToast();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState('');
  const {
    data: chatData,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useGetMessagesQuery(
    { conversationId: conversationId || '', page },
    { skip: !conversationId },
  );
  const allMessages = chatData?.messages || [];
  const hasMoreMessages = Boolean(chatData?.hasMore);
  const [sendMessage] = useSendMessageMutation();
  const [markAsRead] = useMarkAsReadMutation();

  useEffect(() => {
    if (!conversationId) return;
    markAsRead(conversationId).catch(() => undefined);
  }, [conversationId, markAsRead]);

  useEffect(() => {
    if (isLoading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [allMessages.length, conversationId, isLoading]);

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || !conversationId) return;

    try {
      await sendMessage({
        conversationId,
        message: trimmedMessage,
        receiverId: otherUser || undefined,
      }).unwrap();
      setMessage('');
    } catch (apiError) {
      showError(getErrorMessage(apiError, 'Message not sent! Try Again'));
    }
  };

  return (
    <section className="collab-chat-panel">
      <header>
        <MessageSquare size={20} aria-hidden="true" />
        <h3>Chat</h3>
      </header>

      <div className="collab-room-messages">
        {isLoading ? (
          <LoadingSpinner className="collab-modal-state" label="Loading messages" />
        ) : isError ? (
          <div className="collab-modal-state">
            <p>{getErrorMessage(error, 'Messages could not be loaded')}</p>
            <button type="button" onClick={() => refetch()}>
              <RefreshCw size={16} aria-hidden="true" />
              Retry
            </button>
          </div>
        ) : allMessages.length > 0 ? (
          <>
            {hasMoreMessages && (
              <button type="button" className="collab-load-more" disabled={isFetching} onClick={() => setPage((currentPage) => currentPage + 1)}>
                {isFetching ? <LoadingSpinner inline label="Loading messages" size={16} /> : 'Load more messages'}
              </button>
            )}
            {allMessages.map((item, index) => (
              <MessageItem key={`${item._id}_${index}`} message={item} />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <p className="collab-empty-box">No messages yet</p>
        )}
      </div>

      <footer>
        <Input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSendMessage();
          }}
          placeholder="Type a message..."
        />
        <button type="button" onClick={handleSendMessage} disabled={!message.trim()} aria-label="Send message">
          <Send size={19} aria-hidden="true" />
        </button>
      </footer>
    </section>
  );
};

export default ChatPanel;
