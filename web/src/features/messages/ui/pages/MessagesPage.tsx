import { MessageCircle } from 'lucide-react';

const MessagesPage = () => (
  <main className="messages-shell">
    <section className="messages-panel">
      <aside className="messages-conversations">
        <header>
          <p className="state-panel__eyebrow">Messages</p>
          <h1>Conversations</h1>
        </header>
        <div className="messages-empty-list">
          <MessageCircle size={24} aria-hidden="true" />
          <p>Your conversations will appear here.</p>
        </div>
      </aside>
      <section className="messages-window">
        <MessageCircle size={42} aria-hidden="true" />
        <h2>Select a conversation</h2>
        <p>Full realtime messaging UI will be wired in the messaging module.</p>
      </section>
    </section>
  </main>
);

export default MessagesPage;