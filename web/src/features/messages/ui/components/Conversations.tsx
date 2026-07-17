import { Loader2, MessageSquarePlus, MoreVertical, Search, Trash2, Users, X } from 'lucide-react';
import { memo, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react';

import { useAppDispatch } from '@/app/store/hooks';
import { useDeleteConversationMutation } from '@/features/messages/api/chat.api';
import { formatChatMessageTime, getConversationPreview, getConversationTitle } from '@/features/messages/model/chat.helpers';
import type { ChatConversation } from '@/features/messages/model/chat.types';
import { clearSelectedChatFromState, setChatWindowClosed } from '@/features/messages/state/chatSlice';
import { useToast } from '@/shared/hooks/useToast';
import Input from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import ChatAvatar from './ChatAvatar';
import ConversationStartModal from './ConversationStartModal';
import { useConversations } from './useConversations';

type ConversationsProps = {
  conversations: ChatConversation[];
  getConversationsLoading: boolean;
  handleChatSelect: (chat: ChatConversation | null) => void;
  selectedChat: ChatConversation | null;
};

const CONVERSATION_PAGE_SIZE = 12;

const Conversations = ({ conversations, getConversationsLoading, handleChatSelect, selectedChat }: ConversationsProps) => {
  const dispatch = useAppDispatch();
  const { showError, showSuccess } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [startMode, setStartMode] = useState<'chat' | 'group' | null>(null);
  const [visibleCount, setVisibleCount] = useState(CONVERSATION_PAGE_SIZE);
  const [deleteConversation, { isLoading: deletingConversation }] = useDeleteConversationMutation();
  const { handleConversationSelect, userId } = useConversations({ conversations, handleChatSelect, selectedChat });

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return conversations;

    return conversations.filter((chat) => getConversationTitle(chat).toLowerCase().includes(query));
  }, [conversations, searchQuery]);
  const visibleConversations = useMemo(
    () => filteredConversations.slice(0, visibleCount),
    [filteredConversations, visibleCount],
  );
  const hasMoreConversations = filteredConversations.length > visibleConversations.length;

  useEffect(() => {
    setVisibleCount(CONVERSATION_PAGE_SIZE);
  }, [conversations.length, searchQuery]);

  useEffect(() => {
    if (!openMenuId) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-conversation-menu-root]')) return;
      setOpenMenuId(null);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenuId]);

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('[data-message-create-menu-root]')) return;
      setIsCreateMenuOpen(false);
    };

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsCreateMenuOpen(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isCreateMenuOpen]);

  const handleSelectChat = (chat: ChatConversation) => {
    handleConversationSelect(chat);
    setSearchQuery('');
    setOpenMenuId(null);
  };

  const handleConversationKeyDown = (event: KeyboardEvent<HTMLElement>, chat: ChatConversation) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    handleSelectChat(chat);
  };

  const handleMenuToggle = (event: MouseEvent<HTMLButtonElement>, chatId: string) => {
    event.stopPropagation();
    setOpenMenuId((current) => (current === chatId ? null : chatId));
  };

  const handleDeleteChat = async (event: MouseEvent<HTMLButtonElement>, chat: ChatConversation) => {
    event.stopPropagation();

    if (!chat._id || deletingConversation) return;

    try {
      await deleteConversation({ conversationId: chat._id }).unwrap();
      if (selectedChat?._id === chat._id) {
        dispatch(clearSelectedChatFromState());
        dispatch(setChatWindowClosed());
        handleChatSelect(null);
      }
      setOpenMenuId(null);
      showSuccess('Conversation removed from your inbox!');
    } catch (error) {
      showError(getErrorMessage(error, 'Conversation could not be removed!'));
    }
  };

  return (
    <aside className={`messages-v1-sidebar ${selectedChat ? 'is-hidden-mobile' : ''}`}>
      <div className="messages-v1-sidebar__header">
        <div className="messages-v1-sidebar__title-row">
          <div>
            <p>Inbox</p>
            <h1>Messages</h1>
          </div>
          <div className="messages-v1-create-menu-root" data-message-create-menu-root>
            <button
              type="button"
              className="messages-v1-sidebar__icon"
              onClick={() => setIsCreateMenuOpen((current) => !current)}
              aria-label="Create conversation"
            >
              <MoreVertical size={20} aria-hidden="true" />
            </button>
            {isCreateMenuOpen && (
              <div className="messages-v1-menu messages-v1-create-menu">
                <button
                  type="button"
                  onClick={() => {
                    setStartMode('chat');
                    setIsCreateMenuOpen(false);
                  }}
                >
                  <MessageSquarePlus size={16} aria-hidden="true" />
                  New chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStartMode('group');
                    setIsCreateMenuOpen(false);
                  }}
                >
                  <Users size={16} aria-hidden="true" />
                  New group
                </button>
              </div>
            )}
          </div>
        </div>

        <label className="messages-v1-search">
          <Search size={16} aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </label>
      </div>

      {getConversationsLoading ? (
        <div className="messages-v1-state">
          <Loader2 className="spin" size={22} aria-hidden="true" />
          <p>Loading chats...</p>
        </div>
      ) : (
        <div className="messages-v1-list">
          {filteredConversations.length > 0 ? (
            <>
              {visibleConversations.map((chat) => {
              const isActive = selectedChat?._id === chat._id;
              const hasUnread = Boolean(chat.isUnread && chat.lastMessage?.sender !== userId);

              return (
                <article
                  key={chat._id || chat.otherUser?._id}
                  role="button"
                  tabIndex={0}
                  className={`messages-v1-conversation ${isActive ? 'is-active' : ''}`}
                  onClick={() => handleSelectChat(chat)}
                  onKeyDown={(event) => handleConversationKeyDown(event, chat)}
                >
                  <ChatAvatar user={chat.isGroup ? { userName: getConversationTitle(chat), profilePicture: chat.groupAvatar } : chat.otherUser} className="messages-v1-conversation__avatar" />

                  <div className="messages-v1-conversation__body">
                    <div className="messages-v1-conversation__topline">
                      <span>{getConversationTitle(chat)}</span>
                      <div className="messages-v1-conversation__meta">
                        <small>{formatChatMessageTime(chat.updatedAt)}</small>
                        <button
                          type="button"
                          className="messages-v1-icon-button messages-v1-conversation__menu-button"
                          data-conversation-menu-root
                          onClick={(event) => handleMenuToggle(event, chat._id)}
                          aria-label="Conversation options"
                        >
                          <MoreVertical size={16} aria-hidden="true" />
                        </button>

                        {openMenuId === chat._id && (
                          <div className="messages-v1-menu messages-v1-conversation__menu" data-conversation-menu-root onClick={(event) => event.stopPropagation()}>
                            <button type="button" onClick={(event) => handleDeleteChat(event, chat)} disabled={deletingConversation}>
                              <Trash2 size={16} aria-hidden="true" />
                              {deletingConversation ? 'Removing...' : 'Delete'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="messages-v1-conversation__preview">
                      <p className={hasUnread ? 'is-unread' : ''}>
                        {chat.isBlocked || chat.hasBlockedMe ? 'Chat unavailable' : getConversationPreview(chat.lastMessage)}
                      </p>
                      {hasUnread && <span aria-label="Unread conversation" />}
                    </div>
                  </div>
                </article>
              );
            })}

              {hasMoreConversations && (
                <div className="messages-v1-conversation-load-more">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((current) => current + CONVERSATION_PAGE_SIZE)}
                  >
                    Load more
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="messages-v1-empty-list">
              {searchQuery.trim() ? 'No conversations found' : 'No chats yet'}
            </div>
          )}
        </div>
      )}

      {startMode && (
        <ConversationStartModal
          isOpen={Boolean(startMode)}
          mode={startMode}
          onClose={() => setStartMode(null)}
          onConversationReady={handleSelectChat}
        />
      )}
    </aside>
  );
};

export default memo(Conversations);
