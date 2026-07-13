import { ArrowLeft, Code2, Loader2, RefreshCw, Send, UserX, X } from 'lucide-react';
import { memo, useState, type MouseEvent } from 'react';

import {
  formatChatDateDivider,
  getChatMessageDateKey,
  getConversationTitle,
} from '@/features/messages/model/chat.helpers';
import type { ChatConversation, ChatMessage } from '@/features/messages/model/chat.types';
import CollabPermissionModal from '@/features/collab/ui/components/CollabPermissionModal';
import { cn } from '@/shared/utils/cn';
import ChatAvatar from './ChatAvatar';
import MessageItem from './MessageItem';
import { useChatWindow } from './useChatWindow';

type ChatWindowProps = {
  allMessages: ChatMessage[];
  getMessagesLoading: boolean;
  handleChatSelect: (chat: ChatConversation | null) => void;
  hasMoreMessages: boolean;
  isFetchingMessages: boolean;
  isMessagesError: boolean;
  loadMore: () => void;
  messagesErrorMessage?: string;
  refetchMessages: () => void;
  selectedChat: ChatConversation | null;
};

type ContextMenu = {
  x: number;
  y: number;
};

const ChatWindow = ({
  allMessages,
  getMessagesLoading,
  handleChatSelect,
  hasMoreMessages,
  isFetchingMessages,
  isMessagesError,
  loadMore,
  messagesErrorMessage,
  refetchMessages,
  selectedChat,
}: ChatWindowProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const {
    handleBackToChats,
    handleCollabClick,
    handleMessageInputChange,
    handleMessageInputKeyDown,
    handleSendMessage,
    handleUserProfileClick,
    isCollabPermissionModalOpen,
    messageInput,
    messagesContainerRef,
    setIsCollabPermissionModalOpen,
  } = useChatWindow({
    allMessages,
    handleChatSelect,
    isFetchingMessages,
    selectedChat,
  });
  const isDeletedUser = Boolean(selectedChat?.otherUser?.isDeletedUser);
  const isBlockedChat = Boolean(selectedChat?.isBlocked || selectedChat?.hasBlockedMe);
  const canSendMessages = Boolean(selectedChat && !isDeletedUser && !isBlockedChat);

  const handleChatContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    if (!selectedChat) return;
    event.preventDefault();
    setContextMenu({ x: event.clientX, y: event.clientY });
  };

  const closeChatFromMenu = () => {
    setContextMenu(null);
    handleBackToChats();
  };

  return (
    <>
      <section
        className={cn('messages-v1-window', selectedChat ? 'is-selected' : 'is-empty')}
        onClick={() => setContextMenu(null)}
        onContextMenu={handleChatContextMenu}
      >
      {selectedChat ? (
        <>
          <header className="messages-v1-window__header">
            <div className="messages-v1-window__user">
              <button type="button" className="messages-v1-back-button" onClick={handleBackToChats} aria-label="Back to chats">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>

              <button type="button" className="messages-v1-window__avatar-button" onClick={handleUserProfileClick}>
                <ChatAvatar user={selectedChat.otherUser} className="messages-v1-window__avatar" />
              </button>

              <button type="button" className="messages-v1-window__identity" onClick={handleUserProfileClick}>
                <h3>{getConversationTitle(selectedChat)}</h3>
                <p>Right click anywhere to close chat</p>
              </button>
            </div>

            {canSendMessages && (
              <button type="button" className="messages-v1-collab-button" onClick={handleCollabClick}>
                <span>
                  <Code2 size={14} aria-hidden="true" />
                </span>
                <strong>Start Collab</strong>
                <em>Collab</em>
              </button>
            )}
          </header>

          {isBlockedChat ? (
            <div className="messages-v1-blocked-state">
              <article>
                <span>
                  <UserX size={28} aria-hidden="true" />
                </span>
                <h3>Chat unavailable</h3>
                <p>This conversation is blocked. You can remove it from your inbox from the right click menu.</p>
              </article>
            </div>
          ) : getMessagesLoading ? (
            <div className="messages-v1-state">
              <Loader2 className="spin" size={22} aria-hidden="true" />
              <p>Loading messages...</p>
            </div>
          ) : isMessagesError ? (
            <div className="messages-v1-state">
              <RefreshCw size={22} aria-hidden="true" />
              <p>{messagesErrorMessage || 'Messages could not be loaded'}</p>
              <button type="button" onClick={refetchMessages}>Retry</button>
            </div>
          ) : (
            <>
              {isDeletedUser && (
                <div className="messages-v1-deleted-banner">
                  This account no longer exists. Messages stay visible, but new messages are disabled.
                </div>
              )}

              <div className="messages-v1-thread" ref={messagesContainerRef}>
                {isFetchingMessages ? (
                  <div className="messages-v1-thread__loader">
                    <Loader2 className="spin" size={18} aria-hidden="true" />
                  </div>
                ) : hasMoreMessages ? (
                  <div className="messages-v1-load-more">
                    <button type="button" onClick={loadMore} aria-label="Load older messages">
                      <RefreshCw size={16} aria-hidden="true" />
                      <span>Load more</span>
                    </button>
                  </div>
                ) : null}

                {allMessages.map((message, index) => {
                  const previousMessage = allMessages[index - 1];
                  const showDateDivider = index === 0
                    || getChatMessageDateKey(message.createdAt) !== getChatMessageDateKey(previousMessage?.createdAt);

                  return (
                    <div key={`${message._id}_${index}`}>
                      {showDateDivider && (
                        <div className="messages-v1-date-divider">
                          <span>{formatChatDateDivider(message.createdAt)}</span>
                        </div>
                      )}
                      <MessageItem message={message} />
                    </div>
                  );
                })}
              </div>

              <footer className="messages-v1-composer">
                <div className="messages-v1-composer__inner">
                  <textarea
                    value={messageInput}
                    onChange={handleMessageInputChange}
                    onKeyDown={handleMessageInputKeyDown}
                    disabled={!canSendMessages}
                    placeholder={canSendMessages ? 'Type a message...' : 'Messaging unavailable'}
                    rows={1}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim() || !canSendMessages}
                    aria-label="Send message"
                  >
                    <Send size={17} aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </>
          )}
        </>
      ) : (
        <div className="messages-v1-select-state">
          <span>
            <Send size={44} aria-hidden="true" />
          </span>
          <h3>Select a conversation</h3>
          <p>Choose a chat from the sidebar to start messaging</p>
        </div>
      )}

      {contextMenu && (
        <div className="messages-v1-menu messages-v1-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={closeChatFromMenu}>
            <X size={16} aria-hidden="true" />
            Close chat
          </button>
        </div>
      )}
      </section>

      {isCollabPermissionModalOpen && canSendMessages && selectedChat && (
        <CollabPermissionModal
          isOpen={isCollabPermissionModalOpen}
          onClose={() => setIsCollabPermissionModalOpen(false)}
          otherUser={selectedChat.otherUser?.userName}
          conversationId={selectedChat._id}
        />
      )}
    </>
  );
};

export default memo(ChatWindow);
