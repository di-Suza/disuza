import { Types } from 'mongoose';

const userId = '507f1f77bcf86cd799439011';
const otherUserId = '507f1f77bcf86cd799439012';
const thirdUserId = '507f1f77bcf86cd799439013';
const postId = '507f1f77bcf86cd799439014';
const conversationId = '507f1f77bcf86cd799439015';
const roomId = '507f1f77bcf86cd799439016';
const problemId = '507f1f77bcf86cd799439017';
const roomProblemId = '507f1f77bcf86cd799439018';

const oid = (value: string) => new Types.ObjectId(value);

const toObjectDocument = <T extends Record<string, unknown>>(data: T) => ({
  ...data,
  toObject() {
    return { ...data };
  },
});

const createConversation = (overrides: Record<string, unknown> = {}) => ({
  _id: oid(conversationId),
  participants: [oid(userId), oid(otherUserId)],
  hiddenBy: [],
  admins: [oid(userId)],
  isGroup: false,
  isUnread: true,
  unreadCounts: new Map([[userId, 2]]),
  lastMessage: oid(postId),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  saveCalls: 0,
  async save() {
    this.saveCalls += 1;
    return this;
  },
  ...overrides,
});

export {
  conversationId,
  createConversation,
  oid,
  otherUserId,
  postId,
  problemId,
  roomId,
  roomProblemId,
  thirdUserId,
  toObjectDocument,
  userId,
};
