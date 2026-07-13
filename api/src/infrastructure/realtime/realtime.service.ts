import type { Server as HttpServer } from 'node:http';
import { Server as SocketServer } from 'socket.io';

import env from '../../config/env.js';
import logger from '../../config/logger.js';
import chatHandler from './chatHandler.js';
import collabHandler from './collabHandler.js';
import socketAuth from './socketAuth.js';
import { type AuthenticatedSocket } from './realtime.types.js';

type RealtimeEventPayload = Record<string, unknown> | unknown[];

class RealtimeService {
  private io: SocketServer | null = null;

  private getCorsOrigin(): string | string[] {
    if (env.SOCKET_CORS_ORIGIN === '*') return '*';

    return env.SOCKET_CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  attach(server: HttpServer): SocketServer {
    if (this.io) return this.io;

    this.io = new SocketServer(server, {
      cors: {
        origin: this.getCorsOrigin(),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: env.SOCKET_PING_TIMEOUT_MS,
      pingInterval: env.SOCKET_PING_INTERVAL_MS,
      transports: ['websocket', 'polling'],
      allowEIO3: false,
    });

    this.io.use((socket, next) => socketAuth(socket as AuthenticatedSocket, next));
    this.io.on('connection', (socket) => {
      const authenticatedSocket = socket as AuthenticatedSocket;
      chatHandler(authenticatedSocket);
      collabHandler(authenticatedSocket, this);
    });

    logger.info('Realtime socket server attached');
    return this.io;
  }

  getServer(): SocketServer | null {
    return this.io;
  }

  emitToUser(userId: string, event: string, payload: RealtimeEventPayload): void {
    if (!this.io) return;
    this.io.to(userId.toString()).emit(event, payload);
  }

  emitToRoom(roomId: string, event: string, payload: RealtimeEventPayload): void {
    if (!this.io) return;
    this.io.to(roomId.toString()).emit(event, payload);
  }

  async disconnectUser(userId: string, reason = 'session-ended'): Promise<void> {
    if (!this.io) return;

    const sockets = await this.io.in(userId.toString()).fetchSockets();
    sockets.forEach((socket) => {
      socket.emit('session_disconnected', { reason });
      socket.disconnect(true);
    });
  }
}

const realtimeService = new RealtimeService();

export { RealtimeService };
export default realtimeService;
