import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import ConversationModel from '../../src/modules/chat/conversation.model.js';
import collabRoomAccessService from '../../src/modules/collab/collabRoomAccess.service.js';
import RoomProblemModel from '../../src/modules/problems/roomProblem.model.js';
import chatHandler from '../../src/infrastructure/realtime/chatHandler.js';
import collabHandler from '../../src/infrastructure/realtime/collabHandler.js';
import { oid, otherUserId, roomId, roomProblemId, userId } from '../helpers/domain.js';

type HandlerMap = Record<string, (payload?: unknown, ack?: () => void) => void>;

const waitForAsyncHandlers = () => new Promise((resolve) => {
  setTimeout(resolve, 0);
});

const createSocket = () => {
  const handlers: HandlerMap = {};
  const emitted: Array<{ event: string; payload: unknown }> = [];
  const roomEmits: Array<{ roomId: string; event: string; payload: unknown }> = [];
  const joined: string[] = [];
  const left: string[] = [];

  const socket = {
    id: 'socket-1',
    user: { id: userId, userName: 'Samar', profilePicture: { url: 'pp.jpg', fileId: 'file-1' } },
    data: {},
    join: async (targetRoomId: string) => {
      joined.push(targetRoomId);
    },
    leave: (targetRoomId: string) => {
      left.push(targetRoomId);
    },
    emit: (event: string, payload: unknown) => {
      emitted.push({ event, payload });
    },
    to: (targetRoomId: string) => ({
      emit: (event: string, payload: unknown) => {
        roomEmits.push({ roomId: targetRoomId, event, payload });
      },
    }),
    on: (event: string, handler: HandlerMap[string]) => {
      handlers[event] = handler;
    },
  };

  return { emitted, handlers, joined, left, roomEmits, socket };
};

describe('realtime socket handlers', () => {
  it('joins the user room, emits readiness, acknowledges heartbeat, and fans typing events to visible recipients', async () => {
    const originalFindOne = ConversationModel.findOne;
    ConversationModel.findOne = (() => ({
      select: () => ({
        lean: async () => ({
          participants: [oid(userId), oid(otherUserId)],
          hiddenBy: [],
        }),
      }),
    })) as never;
    const { emitted, handlers, joined, roomEmits, socket } = createSocket();

    try {
      chatHandler(socket as never);
      assert.deepEqual(joined, [userId]);
      assert.deepEqual(emitted[0], { event: 'socket_ready', payload: { userId } });

      let acked = false;
      handlers.heartbeat(() => {
        acked = true;
      });
      assert.equal(acked, true);

      handlers.typing_start({ conversationId: '507f1f77bcf86cd799439015' });
      handlers.typing_stop({ conversationId: '507f1f77bcf86cd799439015' });
      await waitForAsyncHandlers();

      assert.deepEqual(roomEmits.map((entry) => [entry.roomId, entry.event]), [
        [otherUserId, 'typing_start'],
        [otherUserId, 'typing_stop'],
      ]);
    } finally {
      ConversationModel.findOne = originalFindOne;
    }
  });

  it('emits collab presence, voice state, code sync, and Yjs sync events for authorized rooms', async () => {
    const originalGetRoomAccess = collabRoomAccessService.getRoomAccess;
    const mutableRoomProblemModel = RoomProblemModel as unknown as {
      exists: (filter: unknown) => Promise<unknown>;
      findOneAndUpdate: (...args: unknown[]) => Promise<unknown>;
    };
    const originalExists = mutableRoomProblemModel.exists;
    const originalFindOneAndUpdate = mutableRoomProblemModel.findOneAndUpdate;
    const realtimeEmits: Array<{ roomId: string; event: string; payload: unknown }> = [];
    collabRoomAccessService.getRoomAccess = async () => ({ canUseRealtime: true }) as never;
    mutableRoomProblemModel.exists = async () => ({ _id: oid(roomProblemId) });
    mutableRoomProblemModel.findOneAndUpdate = async () => ({ _id: oid(roomProblemId) });

    const realtime = {
      emitToRoom: (targetRoomId: string, event: string, payload: unknown) => {
        realtimeEmits.push({ roomId: targetRoomId, event, payload });
      },
    };
    const { emitted, handlers, joined, roomEmits, socket } = createSocket();

    try {
      collabHandler(socket as never, realtime as never);
      handlers.join_collab_room({ roomId });
      await waitForAsyncHandlers();
      assert.ok(joined.includes(roomId));
      assert.ok(emitted.some((entry) => entry.event === 'presence_state'));

      handlers.voice_join_room({ roomId, peerId: 'peer-1', micEnabled: true });
      await waitForAsyncHandlers();
      assert.ok(realtimeEmits.some((entry) => entry.event === 'voice_state'));

      handlers.code_change({ roomId, roomProblemId, code: 'const a = 1;', language: 'javascript' });
      handlers.yjs_code_update({ roomId, roomProblemId, update: [1, 2, 3], code: 'const b = 2;', language: 'javascript' });
      await waitForAsyncHandlers();

      assert.ok(roomEmits.some((entry) => entry.event === 'room_sync' && (entry.payload as { type?: string }).type === 'CODE_CHANGE'));
      assert.ok(roomEmits.some((entry) => entry.event === 'room_sync' && (entry.payload as { type?: string }).type === 'YJS_CODE_UPDATE'));
      await new Promise((resolve) => {
        setTimeout(resolve, 750);
      });
    } finally {
      collabRoomAccessService.getRoomAccess = originalGetRoomAccess;
      mutableRoomProblemModel.exists = originalExists;
      mutableRoomProblemModel.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });
});
