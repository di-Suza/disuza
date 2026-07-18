import { type AuthenticatedSocket } from './realtime.types.js';
import ConversationModel from '../../modules/chat/conversation.model.js';

type TypingPayload = {
  conversationId?: string;
};

async function getTypingRecipients(conversationId: string, userId: string) {
  const conversation = await ConversationModel.findOne({
    _id: conversationId,
    participants: userId,
    hiddenBy: { $ne: userId },
  }).select('participants hiddenBy').lean();

  if (!conversation) return [];

  const hiddenIds = new Set((conversation.hiddenBy || []).map((id) => id.toString()));
  return conversation.participants
    .map((id) => id.toString())
    .filter((id) => id !== userId && !hiddenIds.has(id));
}

function chatHandler(socket: AuthenticatedSocket): void {
  socket.join(socket.user.id);
  socket.emit('socket_ready', { userId: socket.user.id });

  socket.on('heartbeat', (ack?: () => void) => {
    if (typeof ack === 'function') ack();
  });

  socket.on('typing_start', (payload: TypingPayload = {}) => {
    void (async () => {
      if (!payload.conversationId) return;
      const recipients = await getTypingRecipients(payload.conversationId, socket.user.id);
      recipients.forEach((recipientId) => {
        socket.to(recipientId).emit('typing_start', {
          conversationId: payload.conversationId,
          user: socket.user,
        });
      });
    })();
  });

  socket.on('typing_stop', (payload: TypingPayload = {}) => {
    void (async () => {
      if (!payload.conversationId) return;
      const recipients = await getTypingRecipients(payload.conversationId, socket.user.id);
      recipients.forEach((recipientId) => {
        socket.to(recipientId).emit('typing_stop', {
          conversationId: payload.conversationId,
          user: socket.user,
        });
      });
    })();
  });
}

export default chatHandler;
