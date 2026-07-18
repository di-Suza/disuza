import { RefreshCw } from 'lucide-react';

import ChatWindow from '@/features/messages/ui/components/ChatWindow';
import Conversations from '@/features/messages/ui/components/Conversations';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Button from '@/shared/ui/Button';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { useMessagesPage } from './useMessagesPage';
import './MessagesPage.css';
import '@/app/layouts/ProductShell.css';

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
      <ErrorBoundary variant="section" title="Conversation list could not be rendered." resetKeys={[selectedChat?._id]} showReload={false}>
        <Conversations
          conversations={allConversations}
          getConversationsLoading={getConversationsLoading}
          handleChatSelect={handleChatSelect}
          selectedChat={selectedChat}
        />
      </ErrorBoundary>

      <ErrorBoundary variant="section" title="Chat window could not be rendered." resetKeys={[selectedChat?._id]} showReload={false}>
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
      </ErrorBoundary>
    </main>
  );
};

export default MessagesPage;
