import { RefreshCw } from 'lucide-react';

import ChatWindow from '@/features/messages/ui/components/ChatWindow';
import Conversations from '@/features/messages/ui/components/Conversations';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useMessagesPage } from './useMessagesPage';

const MessagesPage = () => {
  const {
    allConversations,
    allMessages,
    error,
    getConversationsLoading,
    getMessagesLoading,
    handleChatSelect,
    hasMoreMessages,
    isError,
    isFetching,
    isMessagesError,
    loadMore,
    messagesErrorMessage,
    refetch,
    refetchMessages,
    selectedChat,
  } = useMessagesPage();

  if (isError) {
    return (
      <main className="messages-v1-page messages-v1-page--center">
        <section className="messages-v1-error">
          <RefreshCw size={24} aria-hidden="true" />
          <h1>Conversations could not be loaded</h1>
          <p>{getErrorMessage(error, 'Please try again in a moment.')}</p>
          <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="messages-v1-page">
      <Conversations
        conversations={allConversations}
        getConversationsLoading={getConversationsLoading}
        handleChatSelect={handleChatSelect}
        selectedChat={selectedChat}
      />

      <ChatWindow
        allMessages={allMessages}
        getMessagesLoading={getMessagesLoading}
        handleChatSelect={handleChatSelect}
        hasMoreMessages={hasMoreMessages}
        isFetchingMessages={isFetching}
        isMessagesError={isMessagesError}
        loadMore={loadMore}
        messagesErrorMessage={messagesErrorMessage}
        refetchMessages={refetchMessages}
        selectedChat={selectedChat}
      />
    </main>
  );
};

export default MessagesPage;
