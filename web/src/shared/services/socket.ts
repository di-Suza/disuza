import { io, type Socket } from 'socket.io-client';

import env from '@/shared/config/env';

type ServerToClientEvents = {
  socket_ready: (payload: { userId: string }) => void;
  session_disconnected: (payload: { reason?: string }) => void;
  new_notification: (payload: unknown) => void;
  delete_notification: (payload: { notificationId?: string }) => void;
  'receive-message': (payload: unknown) => void;
  'message-unsent': (payload: unknown) => void;
  messages_seen: (payload: unknown) => void;
  typing_start: (payload: unknown) => void;
  typing_stop: (payload: unknown) => void;
  presence_state: (payload: unknown) => void;
  presence: (payload: unknown) => void;
  presence_error: (payload: unknown) => void;
  room_sync: (payload: unknown) => void;
  room_sync_error: (payload: unknown) => void;
  code_execution: (payload: unknown) => void;
  call_signal: (payload: unknown) => void;
  voice_state: (payload: unknown) => void;
  voice_user_joined: (payload: unknown) => void;
  voice_user_left: (payload: unknown) => void;
  voice_media_state: (payload: unknown) => void;
  voice_error: (payload: unknown) => void;
};

type ClientToServerEvents = {
  heartbeat: (ack?: () => void) => void;
  join_collab_room: (payload: { roomId: string }) => void;
  leave_collab_room: (payload: { roomId: string }) => void;
  code_change: (payload: Record<string, unknown>) => void;
  yjs_code_update: (payload: Record<string, unknown>) => void;
  call_signal: (payload: Record<string, unknown>) => void;
  typing_start: (payload: Record<string, unknown>) => void;
  typing_stop: (payload: Record<string, unknown>) => void;
  voice_join_room: (payload: Record<string, unknown>) => void;
  voice_leave_room: (payload: Record<string, unknown>) => void;
  voice_media_state: (payload: Record<string, unknown>) => void;
};

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

function getSocket(accessToken?: string | null): AppSocket {
  if (!socket) {
    socket = io(env.socketBaseUrl, {
      withCredentials: true,
      autoConnect: false,
      auth: {
        accessToken: accessToken || '',
      },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20_000,
    });

    socket.io.on('reconnect_attempt', () => {
      if (socket && accessToken) {
        socket.auth = { accessToken };
      }
    });
  }

  if (accessToken) {
    socket.auth = { accessToken };
  }

  return socket;
}

function connectSocket(accessToken: string): AppSocket {
  const activeSocket = getSocket(accessToken);
  activeSocket.auth = { accessToken };

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket;
}

function disconnectSocket(): void {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}

export { connectSocket, disconnectSocket, getSocket, type AppSocket };
