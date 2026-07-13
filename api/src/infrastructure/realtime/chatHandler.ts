import { type AuthenticatedSocket } from './realtime.types.js';

function chatHandler(socket: AuthenticatedSocket): void {
  socket.join(socket.user.id);
  socket.emit('socket_ready', { userId: socket.user.id });

  socket.on('heartbeat', (ack?: () => void) => {
    if (typeof ack === 'function') ack();
  });
}

export default chatHandler;
