import { ArrowLeft, Code2, Loader2, MoreVertical, Paperclip, RefreshCw, Send, UserX, X } from 'lucide-react';
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import {
  formatChatDateDivider,
  getChatMessageDateKey,
  getConversationTitle,
} from '@/features/messages/model/chat.helpers';
import type { ChatConversation, ChatMessage } from '@/features/messages/model/chat.types';
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

const CollabPermissionModal = lazy(() => import('@/features/collab/ui/components/CollabPermissionModal'));
const GroupSettingsModal = lazy(() => import('./GroupSettingsModal'));

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
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const {
    fileInputRef,
    handleAttachmentButtonClick,
    handleAttachmentChange,
    handleBackToChats,
    handleCollabClick,
    handleMessageInputChange,
    handleMessageInputKeyDown,
    handleRemoveAttachment,
    handleSendMessage,
    handleUserProfileClick,
    isCollabPermissionModalOpen,
    messageInput,
    messagesContainerRef,
    selectedAttachment,
    setIsCollabPermissionModalOpen,
    typingLabel,
  } = useChatWindow({
    allMessages,
    handleChatSelect,
    isFetchingMessages,
    selectedChat,
  });
  const isDeletedUser = Boolean(selectedChat?.otherUser?.isDeletedUser);
  const isBlockedChat = Boolean(selectedChat?.isBlocked || selectedChat?.hasBlockedMe);
  const canSendMessages = Boolean(selectedChat && !isDeletedUser && !isBlockedChat);
  const headerAvatarUser = selectedChat?.isGroup
    ? { userName: getConversationTitle(selectedChat), profilePicture: selectedChat.groupAvatar }
    : selectedChat?.otherUser;
  const threadedMessages = useMemo(() => allMessages.map((message, index) => {
    const previousMessage = allMessages[index - 1];
    const showDateDivider = index === 0
      || getChatMessageDateKey(message.createdAt) !== getChatMessageDateKey(previousMessage?.createdAt);

    return { message, showDateDivider };
  }), [allMessages]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && contextMenuRef.current?.contains(event.target)) return;
      setContextMenu(null);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setContextMenu(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu]);

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
                <ChatAvatar user={headerAvatarUser} className="messages-v1-window__avatar" />
              </button>

              <button type="button" className="messages-v1-window__identity" onClick={handleUserProfileClick}>
                <h3>{getConversationTitle(selectedChat)}</h3>
                <p>{selectedChat.isGroup ? `${selectedChat.participants?.length || 1} members` : 'Right click anywhere to close chat'}</p>
              </button>
            </div>

            {canSendMessages && (
              <div className="messages-v1-window__actions">
                <button type="button" className="messages-v1-collab-button" onClick={handleCollabClick}>
                  <span>
                    <Code2 size={14} aria-hidden="true" />
                  </span>
                  <strong>{selectedChat.isGroup ? 'Open Room' : 'Start Collab'}</strong>
                  <em>{selectedChat.isGroup ? 'Room' : 'Collab'}</em>
                </button>
                {selectedChat.isGroup && (
                  <button
                    type="button"
                    className="messages-v1-icon-button"
                    onClick={() => setIsGroupSettingsOpen(true)}
                    aria-label="Group settings"
                  >
                    <MoreVertical size={17} aria-hidden="true" />
                  </button>
                )}
              </div>
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

                {threadedMessages.map(({ message, showDateDivider }, index) => (
                  <div key={`${message._id}_${index}`}>
                    {showDateDivider && (
                      <div className="messages-v1-date-divider">
                        <span>{formatChatDateDivider(message.createdAt)}</span>
                      </div>
                    )}
                    <MessageItem message={message} />
                  </div>
                ))}

                {typingLabel && (
                  <div className="messages-v1-typing">
                    <span>{typingLabel}</span>
                  </div>
                )}
              </div>

              <footer className="messages-v1-composer">
                {selectedAttachment && (
                  <div className="messages-v1-attachment-chip">
                    <Paperclip size={14} aria-hidden="true" />
                    <span>{selectedAttachment.name}</span>
                    <small>{Math.max(1, Math.ceil(selectedAttachment.size / 1024))} KB</small>
                    <button type="button" onClick={handleRemoveAttachment} aria-label="Remove attachment">
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
                )}
                <div className="messages-v1-composer__inner">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="messages-v1-attachment-input"
                    onChange={handleAttachmentChange}
                    aria-label="Attach file"
                  />
                  <button
                    type="button"
                    className="messages-v1-attach-button"
                    onClick={handleAttachmentButtonClick}
                    disabled={!canSendMessages}
                    aria-label="Attach file"
                  >
                    <Paperclip size={17} aria-hidden="true" />
                  </button>
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
                    disabled={(!messageInput.trim() && !selectedAttachment) || !canSendMessages}
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
        <div ref={contextMenuRef} className="messages-v1-menu messages-v1-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={closeChatFromMenu}>
            <X size={16} aria-hidden="true" />
            Close chat
          </button>
        </div>
      )}
      </section>

      <Suspense fallback={null}>
        {isCollabPermissionModalOpen && canSendMessages && selectedChat && !selectedChat.isGroup && (
          <CollabPermissionModal
            isOpen={isCollabPermissionModalOpen}
            onClose={() => setIsCollabPermissionModalOpen(false)}
            otherUser={selectedChat.otherUser?.userName}
            conversationId={selectedChat._id}
          />
        )}

        {isGroupSettingsOpen && selectedChat?.isGroup && (
          <GroupSettingsModal
            isOpen={isGroupSettingsOpen}
            conversation={selectedChat}
            onClose={() => setIsGroupSettingsOpen(false)}
            onConversationUpdated={(conversation) => handleChatSelect(conversation)}
            onLeftGroup={handleBackToChats}
          />
        )}
      </Suspense>
    </>
  );
};

export default memo(ChatWindow);
