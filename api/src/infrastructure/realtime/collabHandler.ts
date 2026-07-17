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

type VoicePayload = RoomPayload & {
  peerId?: string;
  micEnabled?: boolean;
};

type VoiceParticipant = PresenceUser & {
  peerId: string;
  micEnabled: boolean;
};

const activeRooms = new Map<string, Map<string, PresenceUser>>();
const activeVoiceRooms = new Map<string, Map<string, VoiceParticipant>>();
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

function getVoicePresence(roomId: string) {
  let roomUsers = activeVoiceRooms.get(roomId);

  if (!roomUsers) {
    roomUsers = new Map<string, VoiceParticipant>();
    activeVoiceRooms.set(roomId, roomUsers);
  }

  return roomUsers;
}

function emitVoiceState(roomId: string, realtime: RealtimeService): void {
  const users = Array.from(activeVoiceRooms.get(roomId)?.values() || []);
  realtime.emitToRoom(roomId, 'voice_state', { roomId, users });
}

function removeVoiceUser(socket: AuthenticatedSocket, roomId: string, realtime: RealtimeService): void {
  const roomUsers = activeVoiceRooms.get(roomId);
  if (!roomUsers) return;

  const removedUser = roomUsers.get(socket.user.id);
  roomUsers.delete(socket.user.id);
  socket.data.voiceRooms?.delete(roomId);

  if (roomUsers.size === 0) {
    activeVoiceRooms.delete(roomId);
  }

  realtime.emitToRoom(roomId, 'voice_user_left', {
    roomId,
    userId: socket.user.id,
    user: removedUser,
  });
  emitVoiceState(roomId, realtime);
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
  removeVoiceUser(socket, roomId, realtime);

  realtime.emitToRoom(roomId, 'presence', {
    type: 'leave',
    roomId,
    user: toPresenceUser(socket),
    users: Array.from(roomUsers.values()),
  });
}

function collabHandler(socket: AuthenticatedSocket, realtime: RealtimeService): void {
  socket.data.collabRooms = socket.data.collabRooms || new Set<string>();
  socket.data.voiceRooms = socket.data.voiceRooms || new Set<string>();

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
      socket.emit('voice_state', {
        roomId,
        users: Array.from(activeVoiceRooms.get(roomId)?.values() || []),
      });
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

  socket.on('voice_join_room', (payload: VoicePayload = {}) => {
    void (async () => {
      const roomId = payload.roomId;
      if (!roomId || !payload.peerId) return;

      const canUseRealtime = await ensureRealtimeAccess(socket.user.id, roomId);
      if (!canUseRealtime) return;

      const voiceUsers = getVoicePresence(roomId);
      const voiceUser: VoiceParticipant = {
        ...toPresenceUser(socket),
        peerId: payload.peerId,
        micEnabled: payload.micEnabled ?? true,
      };

      voiceUsers.set(socket.user.id, voiceUser);
      socket.data.voiceRooms!.add(roomId);
      socket.to(roomId).emit('voice_user_joined', {
        roomId,
        user: voiceUser,
      });
      emitVoiceState(roomId, realtime);
    })().catch((error) => {
      socket.emit('voice_error', {
        roomId: payload.roomId,
        message: error instanceof Error ? error.message : 'Unable to connect audio.',
      });
    });
  });

  socket.on('voice_leave_room', (payload: RoomPayload = {}) => {
    if (!payload.roomId) return;
    removeVoiceUser(socket, payload.roomId, realtime);
  });

  socket.on('voice_media_state', (payload: VoicePayload = {}) => {
    const roomId = payload.roomId;
    if (!roomId) return;

    const voiceUsers = activeVoiceRooms.get(roomId);
    const currentUser = voiceUsers?.get(socket.user.id);
    if (!voiceUsers || !currentUser) return;

    const updatedUser = {
      ...currentUser,
      micEnabled: payload.micEnabled ?? currentUser.micEnabled,
    };
    voiceUsers.set(socket.user.id, updatedUser);
    realtime.emitToRoom(roomId, 'voice_media_state', {
      roomId,
      user: updatedUser,
    });
    emitVoiceState(roomId, realtime);
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
    const voiceRooms = Array.from((socket.data.voiceRooms as Set<string> | undefined) ?? new Set<string>());
    voiceRooms.forEach((roomId) => removeVoiceUser(socket, roomId, realtime));
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
