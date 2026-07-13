import type { Types } from 'mongoose';

import collabRoomAccessService from '../../modules/collab/collabRoomAccess.service.js';
import CollabRoomModel from '../../modules/collab/collabRoom.model.js';
import RoomProblemModel from '../../modules/problems/roomProblem.model.js';
import logger from '../../config/logger.js';
import { type AuthenticatedSocket, type PresenceUser } from './realtime.types.js';
import { type RealtimeService } from './realtime.service.js';

type RoomPayload = {
  roomId?: string;
};

type CallSignalPayload = RoomPayload & {
  type?: string;
  signal?: unknown;
  mediaState?: unknown;
};

type CodeChangePayload = RoomPayload & {
  roomProblemId?: string;
  code?: string;
  language?: string;
};

type YjsCodeUpdatePayload = RoomPayload & {
  roomProblemId?: string;
  update?: unknown;
  language?: string;
};

const activeRooms = new Map<string, Map<string, PresenceUser>>();
const activeCalls = new Map<string, string>();
const callRingTimers = new Map<string, NodeJS.Timeout>();
const codeSaveTimers = new Map<string, NodeJS.Timeout>();
const CODE_SAVE_DELAY_MS = 700;

function getRoomPresence(roomId: string) {
  let roomUsers = activeRooms.get(roomId);

  if (!roomUsers) {
    roomUsers = new Map<string, PresenceUser>();
    activeRooms.set(roomId, roomUsers);
  }

  return roomUsers;
}

function toPresenceUser(socket: AuthenticatedSocket): PresenceUser {
  return {
    _id: socket.user.id,
    userName: socket.user.userName,
    profilePicture: socket.user.profilePicture,
    socketId: socket.id,
  };
}

function clearCallState(roomId: string): void {
  const timer = callRingTimers.get(roomId);
  if (timer) clearTimeout(timer);
  callRingTimers.delete(roomId);
  activeCalls.delete(roomId);
}

async function ensureRealtimeAccess(userId: string, roomId: string): Promise<boolean> {
  const access = await collabRoomAccessService.getRoomAccess(userId, roomId);
  return access.canUseRealtime;
}

async function resolveRoomProblemId(roomId: string, roomProblemId?: string): Promise<Types.ObjectId | string | null> {
  if (roomProblemId) return roomProblemId;

  const room = await CollabRoomModel.findById(roomId).select('currentlySelectedProblem').lean();
  return room?.currentlySelectedProblem || null;
}

function scheduleCodeSave(payload: CodeChangePayload): void {
  if (!payload.roomId || typeof payload.code !== 'string') return;

  const key = `${payload.roomId}:${payload.roomProblemId || 'selected'}`;
  const existingTimer = codeSaveTimers.get(key);
  if (existingTimer) clearTimeout(existingTimer);

  const timer = setTimeout(() => {
    void (async () => {
      const selectedProblemId = await resolveRoomProblemId(payload.roomId!, payload.roomProblemId);
      if (!selectedProblemId) return;

      await RoomProblemModel.findOneAndUpdate(
        { _id: selectedProblemId, roomId: payload.roomId },
        {
          currentCode: payload.code,
          ...(payload.language ? { language: payload.language } : {}),
        },
      );
    })().catch((error) => {
      logger.warn({ error, roomId: payload.roomId }, 'Failed to persist realtime code change');
    }).finally(() => {
      codeSaveTimers.delete(key);
    });
  }, CODE_SAVE_DELAY_MS);

  codeSaveTimers.set(key, timer);
}

function removeSocketFromRoom(socket: AuthenticatedSocket, roomId: string, realtime: RealtimeService): void {
  const roomUsers = activeRooms.get(roomId);
  if (!roomUsers) return;

  roomUsers.delete(socket.id);
  if (roomUsers.size === 0) {
    activeRooms.delete(roomId);
    clearCallState(roomId);
  }

  socket.leave(roomId);
  socket.data.collabRooms?.delete(roomId);

  realtime.emitToRoom(roomId, 'presence', {
    type: 'leave',
    roomId,
    user: toPresenceUser(socket),
    users: Array.from(roomUsers.values()),
  });
}

function collabHandler(socket: AuthenticatedSocket, realtime: RealtimeService): void {
  socket.data.collabRooms = socket.data.collabRooms || new Set<string>();

  socket.on('join_collab_room', (payload: RoomPayload = {}) => {
    void (async () => {
      const roomId = payload.roomId;
      if (!roomId) return;

      const canUseRealtime = await ensureRealtimeAccess(socket.user.id, roomId);
      if (!canUseRealtime) {
        socket.emit('presence_error', {
          roomId,
          message: 'Realtime collaboration is unavailable for this room.',
        });
        return;
      }

      await socket.join(roomId);
      socket.data.collabRooms!.add(roomId);

      const roomUsers = getRoomPresence(roomId);
      roomUsers.set(socket.id, toPresenceUser(socket));
      const users = Array.from(roomUsers.values());

      socket.emit('presence_state', { roomId, users });
      socket.to(roomId).emit('presence', {
        type: 'join',
        roomId,
        user: toPresenceUser(socket),
        users,
      });
    })().catch((error) => {
      socket.emit('presence_error', {
        roomId: payload.roomId,
        message: error instanceof Error ? error.message : 'Unable to join room.',
      });
    });
  });

  socket.on('leave_collab_room', (payload: RoomPayload = {}) => {
    if (!payload.roomId) return;
    removeSocketFromRoom(socket, payload.roomId, realtime);
  });

  socket.on('call_signal', (payload: CallSignalPayload = {}) => {
    void (async () => {
      const roomId = payload.roomId;
      if (!roomId || !payload.type) return;

      const canUseRealtime = await ensureRealtimeAccess(socket.user.id, roomId);
      if (!canUseRealtime) return;

      if (payload.type === 'CALL_REQUEST') {
        const activeCaller = activeCalls.get(roomId);
        if (activeCaller && activeCaller !== socket.user.id) {
          socket.emit('call_signal', { type: 'CALL_BUSY', roomId });
          return;
        }

        activeCalls.set(roomId, socket.user.id);
        const existingTimer = callRingTimers.get(roomId);
        if (existingTimer) clearTimeout(existingTimer);

        callRingTimers.set(roomId, setTimeout(() => {
          realtime.emitToRoom(roomId, 'call_signal', {
            type: 'CALL_UNAVAILABLE',
            roomId,
            from: socket.user,
          });
          clearCallState(roomId);
        }, 30_000));
      }

      if (['CALL_ACCEPTED', 'CALL_REJECTED', 'CALL_ENDED'].includes(payload.type)) {
        clearCallState(roomId);
      }

      socket.to(roomId).emit('call_signal', {
        ...payload,
        from: socket.user,
      });
    })().catch((error) => {
      socket.emit('call_signal', {
        type: 'CALL_ERROR',
        roomId: payload.roomId,
        message: error instanceof Error ? error.message : 'Call signal failed.',
      });
    });
  });

  socket.on('code_change', (payload: CodeChangePayload = {}) => {
    void (async () => {
      const roomId = payload.roomId;
      if (!roomId || typeof payload.code !== 'string') return;

      const canUseRealtime = await ensureRealtimeAccess(socket.user.id, roomId);
      if (!canUseRealtime) return;

      scheduleCodeSave(payload);
      socket.to(roomId).emit('room_sync', {
        type: 'CODE_CHANGE',
        roomId,
        data: {
          roomProblemId: payload.roomProblemId,
          code: payload.code,
          language: payload.language,
          changedBy: socket.user,
        },
      });
    })().catch((error) => {
      socket.emit('room_sync_error', {
        roomId: payload.roomId,
        message: error instanceof Error ? error.message : 'Code sync failed.',
      });
    });
  });

  socket.on('yjs_code_update', (payload: YjsCodeUpdatePayload = {}) => {
    void (async () => {
      const roomId = payload.roomId;
      if (!roomId || typeof payload.update === 'undefined') return;

      const canUseRealtime = await ensureRealtimeAccess(socket.user.id, roomId);
      if (!canUseRealtime) return;

      socket.to(roomId).emit('room_sync', {
        type: 'YJS_CODE_UPDATE',
        roomId,
        data: {
          roomProblemId: payload.roomProblemId,
          update: payload.update,
          language: payload.language,
          changedBy: socket.user,
        },
      });
    })().catch((error) => {
      socket.emit('room_sync_error', {
        roomId: payload.roomId,
        message: error instanceof Error ? error.message : 'Yjs sync failed.',
      });
    });
  });

  socket.on('disconnect', () => {
    const rooms = Array.from((socket.data.collabRooms as Set<string> | undefined) ?? new Set<string>());
    rooms.forEach((roomId) => removeSocketFromRoom(socket, roomId, realtime));
  });
}

function getActiveRoomUserIds(roomId: string): string[] {
  return Array.from(activeRooms.get(roomId)?.values() || []).map((user) => user._id);
}

function isUserActiveInRoom(roomId: string, userId: string): boolean {
  return getActiveRoomUserIds(roomId).some((activeUserId) => activeUserId === userId);
}

export { getActiveRoomUserIds, isUserActiveInRoom };
export default collabHandler;
