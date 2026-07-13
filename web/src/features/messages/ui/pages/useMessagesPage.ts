import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '@/app/store/hooks';
import { useGetConversationsQuery, useGetMessagesQuery } from '@/features/messages/api/chat.api';
import type { ChatConversation } from '@/features/messages/model/chat.types';
import { setChatWindowActive, setSelectedChatInState } from '@/features/messages/state/chatSlice';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type MessagesRouteState = {
  openConversationId?: string;
  openChatUserId?: string;
} | null;

const MESSAGE_PAGE_SIZE = 20;

export const useMessagesPage = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const selectedChatId = useAppSelector((state) => state.chat.selectedChatId);
  const {
    data: conversationsData,
    error,
    isError,
    isLoading: getConversationsLoading,
    refetch,
  } = useGetConversationsQuery();
  const allConversations = useMemo(() => conversationsData?.conversations || [], [conversationsData?.conversations]);
  const selectedConversation = useMemo(
    () => allConversations.find((conversation) => conversation._id === selectedChatId) || null,
    [allConversations, selectedChatId],
  );
  const shouldBlockMessagesRequest = Boolean(
    selectedConversation?.isBlocked || selectedConversation?.hasBlockedMe,
  );
  const [chatPage, setChatPage] = useState(1);
  const {
    currentData: currentChatData,
    error: messagesError,
    isError: isMessagesError,
    isFetching,
    isLoading: getMessagesLoading,
    refetch: refetchMessages,
  } = useGetMessagesQuery(
    { conversationId: selectedChatId || '', page: chatPage, limit: MESSAGE_PAGE_SIZE },
    { skip: !selectedChatId || shouldBlockMessagesRequest },
  );
  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(selectedConversation);

  useEffect(() => {
    const routeState = location.state as MessagesRouteState;
    const openConversationId = routeState?.openConversationId;
    const openChatUserId = routeState?.openChatUserId;

    if (!allConversations.length || (!openConversationId && !openChatUserId)) return;

    const targetConversation = allConversations.find((conversation) => (
      conversation._id === openConversationId || conversation.otherUser?._id === openChatUserId
    ));

    if (!targetConversation) return;

    setChatPage(1);
    setSelectedChat(targetConversation);
    dispatch(setSelectedChatInState(targetConversation._id));
    dispatch(setChatWindowActive());
    navigate(location.pathname, { replace: true, state: null });
  }, [allConversations, dispatch, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (selectedConversation && selectedConversation._id !== selectedChat?._id) {
      setSelectedChat(selectedConversation);
    }
  }, [selectedConversation, selectedChat?._id]);

  const isSwitchingChat = Boolean(selectedChat?._id && selectedChatId && selectedChat._id !== selectedChatId);
  const isFirstPageFetch = chatPage === 1 && isFetching && !currentChatData;
  const shouldShowMessagesLoading = Boolean(
    selectedChatId
    && !shouldBlockMessagesRequest
    && (getMessagesLoading || isSwitchingChat || isFirstPageFetch),
  );
  const allMessages = shouldShowMessagesLoading ? [] : currentChatData?.messages || [];
  const hasMoreMessages = Boolean(currentChatData?.hasMore);

  const handleChatSelect = useCallback((chat: ChatConversation | null) => {
    setChatPage(1);
    setSelectedChat(chat);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMoreMessages || isFetching) return;
    setChatPage((currentPage) => currentPage + 1);
  }, [hasMoreMessages, isFetching]);

  return {
    allConversations,
    allMessages,
    error,
    getConversationsLoading,
    getMessagesLoading: shouldShowMessagesLoading,
    handleChatSelect,
    hasMoreMessages,
    isError,
    isFetching,
    isMessagesError,
    loadMore,
    messagesError,
    messagesErrorMessage: getErrorMessage(messagesError, 'Messages could not be loaded'),
    refetch,
    refetchMessages,
    selectedChat,
  };
};
