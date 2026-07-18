import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Types } from 'mongoose';

import { AuthService } from '../src/modules/auth/auth.service.js';
import { AuthSessionService } from '../src/modules/auth/session/authSession.service.js';
import { ChatService } from '../src/modules/chat/chat.service.js';
import { CollabService } from '../src/modules/collab/collab.service.js';
import { CommentService } from '../src/modules/comments/comment.service.js';
import { HealthService } from '../src/modules/health/health.service.js';
import { IssueService, ISSUE_SUBMISSION_COOLDOWN_MS } from '../src/modules/issues/issue.service.js';
import { LikeService } from '../src/modules/likes/like.service.js';
import { MediaService } from '../src/modules/media/media.service.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { PostService } from '../src/modules/posts/post.service.js';
import { ProblemService } from '../src/modules/problems/problem.service.js';
import { ReportService } from '../src/modules/reports/report.service.js';
import { SaveService } from '../src/modules/saves/save.service.js';
import { SearchService } from '../src/modules/search/search.service.js';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../src/shared/errors/index.js';

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

describe('Auth and session services', () => {
  it('rejects missing refresh tokens and allows no-token logout', async () => {
    const service = new AuthService({} as never, {} as never, {} as never, {} as never);

    await assert.rejects(() => service.refresh(null), UnauthorizedError);
    assert.deepEqual(await service.logout(null), { message: 'Logged out successfully!' });
  });

  it('creates, rotates, validates, and revokes refresh sessions through the repository', async () => {
    let storedHash = '';
    let sessionId = '';
    const repository = {
      create: async (record: { _id: Types.ObjectId; refreshTokenHash: string }) => {
        sessionId = record._id.toString();
        storedHash = record.refreshTokenHash;
        return record;
      },
      findActiveByIdAndHash: async (id: string, hash: string) => (id === sessionId && hash === storedHash ? { _id: id } : null),
      updateRefreshToken: async (id: string, hash: string) => {
        assert.equal(id, sessionId);
        storedHash = hash;
        return { _id: id };
      },
      revokeByIdAndHash: async (id: string, hash: string, reason: string) => ({ id, hash, reason }),
      revokeAllByUserId: async (id: string, reason: string) => ({ id, reason }),
    };
    const service = new AuthSessionService(repository as never);
    const subject = { id: userId, email: 'samar@example.com', role: 'USER' };

    const created = await service.createSession(subject, null);
    const validated = await service.assertValidRefreshSession(created.refreshToken);
    const rotatedToken = await service.rotateSession(created.refreshToken, subject);
    const revoked = await service.revokeSession(rotatedToken, 'LOGOUT');

    assert.equal(created.sessionId, sessionId);
    assert.equal(validated.payload.sessionId, sessionId);
    assert.notEqual(rotatedToken, created.refreshToken);
    assert.equal((revoked as { reason?: string } | null)?.reason, 'LOGOUT');
    await assert.rejects(() => service.assertValidRefreshSession('bad-token'), UnauthorizedError);
  });
});

describe('Issue, health, and media services', () => {
  it('creates issues with defaults and enforces invalid input/cooldown guards', async () => {
    const createdIssues: unknown[] = [];
    const service = new IssueService({
      findLatestByReporter: async () => null,
      create: async (input: unknown) => {
        createdIssues.push(input);
        return input;
      },
    } as never);

    const result = await service.createIssue(userId, { description: '  Something broke  ' });
    assert.equal(result.message, 'Bug Report Submitted Successfully!');
    assert.deepEqual(createdIssues, [{ reporter: userId, category: 'Bug', description: 'Something broke' }]);

    await assert.rejects(() => service.createIssue(userId, { category: 'Unknown' as never, description: 'x' }), BadRequestError);

    const lockedService = new IssueService({
      findLatestByReporter: async () => ({ createdAt: new Date(Date.now() - ISSUE_SUBMISSION_COOLDOWN_MS + 1000) }),
      create: async () => undefined,
    } as never);
    await assert.rejects(() => lockedService.createIssue(userId, { description: 'Again' }), TooManyRequestsError);
  });

  it('reports health and identifies managed media ids without storage calls', async () => {
    const health = new HealthService().getHealth();
    const media = new MediaService();

    assert.equal(health.status, 'ok');
    assert.equal(media.isManagedFileId('0'), false);
    assert.equal(media.isManagedFileId('external'), false);
    assert.equal(media.isManagedFileId('file-id'), true);
    await media.deleteMany(['0', 'external']);
  });
});

describe('Like, comment, notification, report, save, and search services', () => {
  it('handles like idempotency, notifications, rollback, and unlike cleanup', async () => {
    const sentNotifications: unknown[] = [];
    const removedNotifications: unknown[] = [];
    const deletedLikes: unknown[] = [];
    const posts = {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
      incrementLikesCount: async () => ({ _id: oid(postId) }),
    };
    const service = new LikeService({
      createOnce: async () => ({ created: false }),
      deleteOne: async (likerId: string, targetPostId: string) => {
        deletedLikes.push({ likerId, targetPostId });
        return { deleted: false };
      },
    } as never, posts as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async (input: unknown) => sentNotifications.push(input),
      remove: async (input: unknown) => removedNotifications.push(input),
    } as never);

    assert.deepEqual(await service.likePost(userId, postId), { liked: true, alreadyLiked: true });
    assert.equal(sentNotifications.length, 0);
    assert.deepEqual(await service.unlikePost(userId, postId), { liked: false, alreadyUnliked: true });

    const successService = new LikeService({
      createOnce: async () => ({ created: true }),
      deleteOne: async () => ({ deleted: true }),
    } as never, posts as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      send: async (input: unknown) => sentNotifications.push(input),
      remove: async (input: unknown) => removedNotifications.push(input),
    } as never);

    assert.deepEqual(await successService.likePost(userId, postId), { liked: true, alreadyLiked: false });
    assert.equal(sentNotifications.length, 1);
    assert.deepEqual(await successService.unlikePost(userId, postId), { liked: false, alreadyUnliked: false });
    assert.equal(removedNotifications.length, 1);

    const rollbackService = new LikeService({
      createOnce: async () => ({ created: true }),
      deleteOne: async (likerId: string, targetPostId: string) => deletedLikes.push({ likerId, targetPostId }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
      incrementLikesCount: async () => null,
    } as never, { ensureUsersCanInteract: async () => undefined } as never, { send: async () => undefined } as never);

    await assert.rejects(() => rollbackService.likePost(userId, postId), NotFoundError);
    assert.ok(deletedLikes.length > 0);
  });

  it('creates, paginates, and deletes comments with notifications and heatmap updates', async () => {
    const commentObjectId = oid('507f1f77bcf86cd799439019');
    const replyObjectId = oid('507f1f77bcf86cd799439020');
    const notifications: unknown[] = [];
    const heatmapUpdates: unknown[] = [];
    const service = new CommentService({
      findTopLevelById: async () => ({ _id: commentObjectId, user: oid(thirdUserId), post: oid(postId), postOwner: oid(otherUserId) }),
      create: async (input: Record<string, unknown>) => ({ _id: replyObjectId, ...input }),
      populateAuthor: async (comment: unknown) => comment,
      incrementReplyCount: async () => undefined,
      getTopLevelComments: async () => [{ _id: commentObjectId }],
      getReplies: async () => [{ _id: replyObjectId }],
      findByIdAndPost: async () => ({ _id: commentObjectId, user: oid(userId), postOwner: oid(otherUserId), parentComment: null }),
      findReplies: async () => [{ _id: replyObjectId, user: oid(thirdUserId) }],
      deleteMany: async () => ({ deletedCount: 2 }),
    } as never, {
      findVisibleCommentTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), settings: { commentsDisabled: false } }),
      incrementCommentsCount: async () => undefined,
    } as never, {
      ensureUsersCanInteract: async () => undefined,
      getBlockedUserIds: async () => [],
    } as never, {
      send: async (input: unknown) => notifications.push(input),
      removeManyForContent: async () => undefined,
    } as never, {
      updateContribution: async (...input: unknown[]) => heatmapUpdates.push(input),
      removeContribution: async () => undefined,
    } as never);

    await assert.rejects(() => service.createComment(userId, { postId, comment: '   ' }), BadRequestError);
    const comment = await service.createComment(userId, { postId, comment: '  Thanks  ', parentCommentId: commentObjectId.toString() });
    assert.equal(comment.comment, 'Thanks');
    assert.equal(notifications.length, 1);
    assert.equal(heatmapUpdates.length, 1);

    const allComments = await service.getAllComments(postId, '-1', '99', userId);
    assert.equal(allComments.currentPage, 1);
    assert.equal(allComments.hasMore, false);

    const replies = await service.getReplies(commentObjectId.toString(), '2', '1', userId);
    assert.equal(replies.currentPage, 2);
    assert.equal(replies.hasMore, true);

    const deleteResult = await service.deleteComment(userId, postId, commentObjectId.toString());
    assert.equal(deleteResult.deletedCount, 2);

    const disabledService = new CommentService({} as never, {
      findVisibleCommentTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), settings: { commentsDisabled: true } }),
    } as never, { ensureUsersCanInteract: async () => undefined } as never, {} as never, {} as never);
    await assert.rejects(() => disabledService.createComment(userId, { postId, comment: 'Nope' }), BadRequestError);
  });

  it('cleans notification orphans, skips self/blocked sends, and emits deletes', async () => {
    const emitted: unknown[] = [];
    const deletedIds: unknown[] = [];
    const notificationId = oid('507f1f77bcf86cd799439021');
    const service = new NotificationService({
      findByRecipient: async () => [
        { _id: notificationId, type: 'LIKE', contentId: null },
        { _id: oid('507f1f77bcf86cd799439022'), type: 'GROUP_INVITE', contentId: oid(conversationId), onModel: 'User' },
      ],
      deleteManyByIds: async (ids: unknown[]) => deletedIds.push(...ids),
      countUnreadByRecipient: async () => 3,
      markAllRead: async () => undefined,
      deleteOwnedById: async () => ({ _id: notificationId }),
      deleteAllByRecipient: async () => undefined,
      create: async (input: Record<string, unknown>) => ({ _id: notificationId, ...input }),
      findPopulatedById: async () => null,
      deleteByFilter: async () => ({ _id: notificationId, recipient: oid(otherUserId) }),
      findManyByContent: async () => [{ _id: notificationId, recipient: oid(otherUserId) }],
    } as never, {
      getBlockedUserIds: async () => [],
      getBlockStatus: async () => ({ block: null }),
    } as never, {
      emitToUser: (...input: unknown[]) => emitted.push(input),
    } as never);

    const result = await service.getNotifications(userId, '-1', '99');
    assert.equal(result.unreadCount, 3);
    assert.equal(result.notifications.length, 1);
    assert.equal(result.notifications[0].contentId, undefined);
    assert.deepEqual(deletedIds, [notificationId]);

    assert.equal(await service.send({ senderId: userId, recipientId: userId, type: 'LIKE', contentId: postId, onModel: 'Post' }), null);
    assert.ok(await service.send({ senderId: userId, recipientId: otherUserId, type: 'LIKE', contentId: postId, onModel: 'Post' }));
    await service.deleteNotification(userId, notificationId.toString());
    await service.remove({ senderId: userId, recipientId: otherUserId, type: 'LIKE', contentId: postId });
    await service.removeManyForContent([postId], ['LIKE']);
    assert.ok(emitted.length >= 4);

    const blockedService = new NotificationService({} as never, {
      getBlockStatus: async () => ({ block: { _id: oid(postId) } }),
    } as never, {} as never);
    assert.equal(await blockedService.send({ senderId: userId, recipientId: otherUserId, type: 'LIKE' }), null);
  });

  it('validates reports across post/user/message targets', async () => {
    const reports: unknown[] = [];
    const service = new ReportService({
      findExisting: async () => null,
      create: async (input: unknown) => {
        reports.push(input);
        return input;
      },
      findByReporter: async () => [{ _id: oid(postId) }],
      countByReporter: async () => 2,
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
    } as never, {
      findById: async (id: string) => ({ _id: oid(id) }),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
    } as never, {
      findMessageById: async () => ({ _id: oid(postId), sender: oid(otherUserId), conversationId: oid(conversationId) }),
      findConversationByParticipant: async () => ({ _id: oid(conversationId) }),
    } as never);

    await assert.rejects(() => service.createReport(userId, { targetId: postId, onModel: 'Bad' as never, reason: 'Spam', description: 'x' }), BadRequestError);
    await assert.rejects(() => service.createReport(userId, { targetId: userId, onModel: 'User', reason: 'Spam', description: 'x' }), BadRequestError);

    const report = await service.createReport(userId, { targetId: postId, onModel: 'Post', reason: 'Spam', description: '  bad  ' });
    assert.equal((report as { description: string }).description, 'bad');
    assert.equal(reports.length, 1);

    const paged = await service.getMyReports(userId, '-1', '99');
    assert.equal(paged.page, 1);
    assert.equal(paged.hasMore, true);

    const duplicateService = new ReportService({
      findExisting: async () => ({ _id: oid(postId) }),
    } as never, {
      findVisibleActionTarget: async () => ({ _id: oid(postId), user: oid(otherUserId) }),
    } as never, {} as never, { ensureUsersCanInteract: async () => undefined } as never, {} as never);
    await assert.rejects(() => duplicateService.createReport(userId, { targetId: postId, onModel: 'Post', reason: 'Spam', description: 'x' }), ConflictError);

    const forbiddenMessageService = new ReportService({} as never, {} as never, {} as never, {} as never, {
      findMessageById: async () => ({ _id: oid(postId), sender: oid(otherUserId), conversationId: oid(conversationId) }),
      findConversationByParticipant: async () => null,
    } as never);
    await assert.rejects(() => forbiddenMessageService.createReport(userId, { targetId: postId, onModel: 'Message', reason: 'Spam', description: 'x' }), ForbiddenError);
  });

  it('handles save collection moves, duplicate collection names, and saved post state', async () => {
    const collectionId = oid('507f1f77bcf86cd799439023');
    const sourceCollectionId = oid('507f1f77bcf86cd799439024');
    const selectedCalls: unknown[] = [];
    const service = new SaveService({
      findByUserAndPost: async () => ({ _id: oid('507f1f77bcf86cd799439025'), collectionId: sourceCollectionId }),
      updateCollection: async (...input: unknown[]) => selectedCalls.push(input),
      findLatestInCollection: async () => null,
      countVisibleByCollections: async () => [{ _id: collectionId, postsCount: 2 }],
      findVisibleCollectionPosts: async () => [[{
        post: { _id: oid(postId), caption: 'Saved post' },
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      }], [{ totalPosts: 1 }]],
      deleteByUserAndPost: async () => ({ collectionId }),
    } as never, {
      findOwnedById: async () => ({ _id: collectionId, name: 'Work', selected: true, isSystemGenerated: false }),
      findSelected: async () => ({ _id: collectionId, name: 'Work', selected: true, isSystemGenerated: false }),
      ensureDefaultCollection: async () => ({ _id: collectionId, name: 'Default', selected: true, toObject: () => ({ _id: collectionId, name: 'Default' }) }),
      selectOnly: async (...input: unknown[]) => selectedCalls.push(input),
      updateCover: async () => undefined,
      findAllByOwner: async () => [{ _id: collectionId, name: 'Work' }],
      clearSelected: async () => undefined,
      create: async () => {
        throw { code: 11000 };
      },
      updateName: async () => {
        throw { code: 11000 };
      },
      findOwnedByIdLean: async () => ({ _id: collectionId, name: 'Work' }),
      deleteById: async () => undefined,
    } as never, {
      findVisibleSaveTarget: async () => ({ _id: oid(postId), user: oid(otherUserId), media: [{ url: 'cover.jpg' }] }),
      findVisibleCoverMedia: async () => ({ media: [{ url: 'next.jpg' }] }),
    } as never, {
      findLikedPostIds: async () => new Set([postId]),
    } as never, {
      ensureUsersCanInteract: async () => undefined,
      getBlockedUserIds: async () => [],
    } as never);

    const saveResult = await service.savePost(userId, { postId, collectionId: collectionId.toString() });
    assert.equal(saveResult.saved, true);
    assert.equal(selectedCalls.length, 1);

    const unsaveResult = await service.unsavePost(userId, postId);
    assert.equal(unsaveResult.saved, false);

    const collections = await service.getSavedPostsCollections(userId);
    assert.equal(collections[0].postsCount, 2);

    await assert.rejects(() => service.createCollection(userId, { name: ' Work ' }), ConflictError);
    await assert.rejects(() => service.updateCollection(userId, collectionId.toString(), { name: ' Work ' }), ConflictError);

    const posts = await service.getSavedCollectionPosts(userId, collectionId.toString(), '1', '12');
    assert.equal(posts.posts[0].isLiked, true);
    assert.equal(posts.posts[0].isSaved, true);

    const systemService = new SaveService({} as never, {
      findOwnedById: async () => ({ _id: collectionId, isSystemGenerated: true }),
    } as never, {} as never, {} as never, {} as never);
    await assert.rejects(() => systemService.deleteCollection(userId, collectionId.toString()), BadRequestError);
  });

  it('returns search and discovery results with viewer state and blocked-user filtering', async () => {
    const postObjectId = oid(postId);
    const service = new SearchService({
      findUsers: async () => [{ _id: oid(otherUserId) }],
      findPosts: async () => [{ _id: postObjectId, caption: 'React' }],
      countUsers: async () => 2,
      countPosts: async () => 2,
      findTopContributors: async () => [{ _id: oid(thirdUserId) }],
      findTrendingPosts: async () => [{ _id: postObjectId, caption: 'Trending' }],
      countTrendingPosts: async () => 2,
    } as never, {
      getBlockedUserIds: async () => [oid(thirdUserId)],
    } as never, {
      findLikedPostIds: async () => new Set([postId]),
    } as never, {
      findSavedPostIds: async () => new Set([postId]),
    } as never);

    const results = await service.search(userId, '#react.*', { userPage: '-2', postPage: '1', limit: '1' });
    assert.equal(results.userPage, 1);
    assert.equal(results.hasMoreUsers, true);
    assert.equal(results.matchedPosts[0].isLiked, true);
    assert.equal(results.matchedPosts[0].isSaved, true);

    const discover = await service.discover(userId, { page: '1', limit: '1' });
    assert.equal(discover.hasMoreTrendingPosts, true);
    assert.equal(discover.trendingPosts[0].isSaved, true);
  });
});

describe('Collab and problem services', () => {
  it('handles group room status, direct requests, and accepted requests', async () => {
    const notifications: unknown[] = [];
    const collab = {
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [], isGroup: false }),
      findRoomByConversation: async () => null,
      findRequestByConversation: async () => null,
      createRequest: async () => ({ _id: oid('507f1f77bcf86cd799439026'), sender: oid(userId), recipient: oid(otherUserId) }),
      createSharedRoom: async () => ({ _id: oid(roomId), conversationId: oid(conversationId) }),
      deleteRequestById: async () => undefined,
    };
    const service = new CollabService(collab as never, {
      send: async (input: unknown) => notifications.push(input),
      remove: async (input: unknown) => notifications.push(input),
      findOne: async () => null,
    } as never, {
      getBlockStatus: async () => ({ block: null }),
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never);

    const request = await service.sendCollabRequest(userId, conversationId);
    assert.equal(request.sender.toString(), userId);
    assert.equal(notifications.length, 1);

    const groupService = new CollabService({
      ...collab,
      findConversationById: async () => ({ _id: oid(conversationId), participants: [oid(userId), oid(otherUserId)], hiddenBy: [], isGroup: true }),
    } as never, {} as never, { getBlockStatus: async () => ({ block: null }) } as never, {} as never);
    const groupStatus = await groupService.checkCollabRequestStatus(userId, conversationId);
    assert.equal(groupStatus.status, 'accepted');

    const acceptService = new CollabService({
      ...collab,
      findRequestByConversation: async () => ({ _id: oid('507f1f77bcf86cd799439026'), sender: oid(userId), recipient: oid(otherUserId) }),
    } as never, {
      send: async (input: unknown) => notifications.push(input),
      remove: async (input: unknown) => notifications.push(input),
    } as never, { ensureUsersCanInteract: async () => undefined } as never, {} as never);
    const room = await acceptService.acceptCollabRequest(otherUserId, conversationId);
    assert.equal(room._id.toString(), roomId);
  });

  it('searches, adds, selects, unselects, updates, and runs room problems', async () => {
    const roomProblem = {
      _id: oid(roomProblemId),
      status: 'pending' as const,
      currentCode: '',
      language: 'javascript' as const,
      testCasesPassed: 0,
      problemId: {
        _id: oid(problemId),
        testCases: [{ input: '1', expectedOutput: '1', isHidden: false }],
      },
      async save() {
        return this;
      },
      async populate() {
        return this;
      },
    };
    const collabRoom = {
      _id: oid(roomId),
      currentlySelectedProblem: null as Types.ObjectId | null,
      async save() {
        return this;
      },
    };
    const service = new ProblemService({
      searchProblems: async () => [
        toObjectDocument({ _id: oid(problemId), title: 'Two Sum' }),
      ],
      existsInRoom: async () => true,
      findProblemById: async () => ({ _id: oid(problemId), boilerplate: { javascript: 'function solve() {}' } }),
      findRoomProblem: async () => null,
      createRoomProblem: async () => roomProblem,
      findCollabRoomById: async () => collabRoom,
      findRoomProblemById: () => ({
        then: (resolve: (value: typeof roomProblem) => void) => resolve(roomProblem),
        populate: async () => roomProblem,
      }),
      updateAttemptedProblem: async () => null,
      updateRoomProblemLanguage: async () => ({ ...roomProblem, language: 'python' }),
    } as never, {
      getRoomAccess: async () => ({ canUseRealtime: true }),
    } as never, {
      runTestCases: async () => ({ passedCount: 1, allPassed: true, results: [] }),
    } as never, {
      isEnabled: () => false,
      acquireLock: async () => true,
      releaseLock: async () => undefined,
    } as never);

    const problems = await service.searchProblem('two', '-1', '99', roomId, userId);
    assert.equal(problems[0].isAdded, true);

    const added = await service.addProblemToRoom(userId, roomId, problemId);
    assert.equal(added.isNew, true);

    const selected = await service.selectProblem(userId, roomId, roomProblemId);
    assert.equal(selected.selectedProblem.status, 'solving');

    const unselected = await service.unselectProblem(userId, roomId);
    assert.equal(unselected.canUseRealtime, true);

    const language = await service.updateProblemLanguage(userId, roomId, roomProblemId, 'python');
    assert.equal(language.roomProblem.language, 'python');

    await assert.rejects(() => service.runProblem({ userId, roomId, roomProblemId, code: '   ', language: 'javascript' }), BadRequestError);
    const run = await service.runProblem({ userId, roomId, roomProblemId, code: 'console.log(1)', language: 'javascript' });
    assert.equal(run.result.status, 'solved');
  });
});

describe('Post and chat services', () => {
  it('creates project posts, tracks link clicks with cooldowns, analytics, feed state, updates, and deletes', async () => {
    const postObjectId = oid(postId);
    const cleanupJobs: unknown[] = [];
    const posts = {
      create: async (input: Record<string, unknown>) => ({ _id: input._id, ...input }),
      findOwnedAnalyticsTarget: async () => ({
        _id: postObjectId,
        caption: 'Project',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        counts: { likes: 1, comments: 1, feedbacks: 1, reposts: 1 },
        analytics: { shares: 2, linkClicks: [{ key: 'project:liveDemo', clicks: 3 }] },
        isProjectPost: true,
        projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
        links: [{ label: 'Docs', url: 'https://docs.example' }],
      }),
      findVisibleLinkTarget: async () => ({
        _id: postObjectId,
        user: oid(otherUserId),
        analytics: { shares: 0, linkClicks: [] },
        isProjectPost: true,
        projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
        links: [],
      }),
      incrementLinkClick: async () => undefined,
      findFeedPosts: async () => [
        { _id: postObjectId, createdAt: new Date('2020-01-01T00:00:00.000Z') },
        { _id: oid('507f1f77bcf86cd799439027'), createdAt: new Date('2020-01-02T00:00:00.000Z') },
      ],
      findOwnedVisibleById: async () => toObjectDocument({
        _id: postObjectId,
        caption: 'Post',
        media: [],
        links: [],
        codeSnippet: undefined,
        hashtags: [],
        isProjectPost: false,
        projectLinks: undefined,
      }),
      updateById: async (_targetPostId: string, input: unknown) => ({ _id: postObjectId, input }),
      markDeleting: async () => ({ _id: postObjectId, isDeleting: true }),
      findVisibleById: async () => toObjectDocument({ _id: postObjectId, user: oid(otherUserId), caption: 'Post' }),
    };
    const service = new PostService(posts as never, {
      incrementCounter: async () => undefined,
    } as never, {
      exists: async () => true,
      findLikedPostIds: async () => new Set([postId]),
      findPostLikes: async () => [{ _id: oid(userId) }],
    } as never, {
      exists: async () => false,
      findSavedPostIds: async () => new Set([postId]),
    } as never, {
      exists: async () => true,
      findRepostedPostIds: async () => new Set([postId]),
      findPostReposts: async () => [{ _id: oid(otherUserId) }],
    } as never, {
      findPostAnalyticsComments: async () => [{ _id: oid('507f1f77bcf86cd799439028') }],
    } as never, {
      findPostFeedbacks: async () => [{ _id: oid('507f1f77bcf86cd799439029'), sender: { _id: oid(userId) }, text: 'Great' }],
    } as never, {
      findFollowingIds: async () => [{ following: oid(otherUserId) }],
    } as never, {
      ensureUsersCanInteract: async () => undefined,
      getBlockedUserIds: async () => [],
    } as never, {
      uploadPostMedia: async () => [],
      tryDeleteFile: async () => true,
    } as never, {
      updateContribution: async () => undefined,
    } as never, {
      enqueuePostCleanup: async (input: unknown) => cleanupJobs.push(input),
    } as never);

    await assert.rejects(() => service.createPost(userId, { isProjectPost: true, projectLinks: { liveDemoUrl: 'https://demo.example' } }, []), BadRequestError);
    const created = await service.createPost(userId, {
      caption: ' #Launch ',
      isProjectPost: true,
      projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' },
    }, []);
    assert.equal(created.isProjectPost, true);
    assert.deepEqual(created.hashtags, ['launch']);

    const click = await service.trackLinkClick(userId, postId, 'project:liveDemo', '127.0.0.1');
    const secondClick = await service.trackLinkClick(userId, postId, 'project:liveDemo', '127.0.0.1');
    assert.equal(click.counted, true);
    assert.equal(secondClick.counted, false);

    const analytics = await service.getPostAnalytics(userId, postId, 'feedbacks', '1', '1');
    assert.equal(analytics.overview.counts.linkClicks, 3);
    assert.equal((analytics.items[0] as { comment?: string }).comment, 'Great');
    assert.equal(analytics.hasMore, true);

    const feed = await service.getFeed(userId, '2', '2', 'following');
    const feedPost = feed.posts.find((item) => item._id.toString() === postId);
    assert.equal(feedPost?.isLiked, true);
    assert.equal(feedPost?.isSaved, true);
    assert.equal(feedPost?.isReposted, true);

    const post = await service.getPost(userId, postId);
    assert.equal(post.isLiked, true);
    assert.equal(post.isSaved, false);
    assert.equal(post.isReposted, true);

    await assert.rejects(() => service.updatePost(userId, postId, { projectLinks: { liveDemoUrl: 'https://demo.example', repositoryUrl: 'https://github.com/example/repo' } }, []), BadRequestError);
    const deleted = await service.deletePost(userId, postId);
    assert.equal(deleted.deleted, true);
    assert.equal(cleanupJobs.length, 1);
  });

  it('formats conversations, reads messages, unsends, deletes groups, and protects attachments', async () => {
    const emitted: unknown[] = [];
    const cleanupJobs: unknown[] = [];
    const conversation = createConversation({ isGroup: true, participants: [oid(userId), oid(otherUserId)], admins: [oid(userId)] });
    let findMessageCalls = 0;
    const service = new ChatService({
      getConversations: async () => [{
        _id: oid(conversationId),
        isGroup: true,
        participantsInfo: [{ _id: oid(userId) }, { _id: oid(otherUserId) }],
        participants: [oid(userId), oid(otherUserId)],
        hiddenBy: [oid(otherUserId)],
        admins: [oid(userId)],
        unreadCount: 2,
        isPinned: true,
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      }],
      findConversationForUser: async () => conversation,
      getMessages: async () => [{ _id: oid('507f1f77bcf86cd799439030') }],
      enrichFeedbackMessages: async (messages: unknown[]) => messages,
      findMessageById: async () => {
        findMessageCalls += 1;
        return {
          _id: oid(postId),
          sender: oid(findMessageCalls === 1 ? otherUserId : userId),
          conversationId: oid(conversationId),
        };
      },
      markMessagesSeen: async () => ({ count: 1, seenAt: new Date('2026-01-01T00:00:00.000Z') }),
      deleteMessage: async () => undefined,
      findLatestMessage: async () => null,
      setPinnedForUser: async () => ({ _id: oid(conversationId) }),
      findMessageForAttachment: async () => ({ attachment: { url: 'https://files.example/a.txt', mime: 'text/plain', name: 'a.txt' }, conversationId: oid(conversationId) }),
    } as never, {
      getBlockStatus: async () => ({ isBlocked: false, hasBlockedMe: false }),
      ensureUsersCanInteract: async () => undefined,
    } as never, {} as never, {
      removeContribution: async () => null,
    } as never, {
      emitToUser: (...input: unknown[]) => emitted.push(input),
      getOnlineUserIds: async () => [otherUserId],
    } as never, {} as never, {} as never, {} as never, {
      enqueueConversationCleanup: async (input: unknown) => cleanupJobs.push(input),
    } as never);

    const conversations = await service.getConversations(userId);
    assert.equal(conversations[0].participants.length, 1);
    assert.equal(conversations[0].unreadCount, 2);

    const pinned = await service.setConversationPinned(userId, conversationId, true);
    assert.equal(pinned.conversation?._id.toString(), conversationId);

    const messages = await service.getMessages(conversationId, userId, '-1', '1');
    assert.equal(messages.currentPage, 1);
    assert.equal(messages.hasMore, true);

    const read = await service.markAsRead(conversationId, userId);
    assert.equal(read.unreadCount, 0);
    assert.equal(read.seenCount, 1);
    assert.equal(emitted.length, 1);

    const unsent = await service.unsendMessage(postId, userId);
    assert.equal(unsent.wasLastMessage, true);

    await assert.rejects(() => service.deleteConversationForUser(conversationId, userId), BadRequestError);
    conversation.participants = [oid(userId)];
    const deleted = await service.deleteConversationForUser(conversationId, userId);
    assert.equal(deleted.deletedGroup, true);
    assert.equal(cleanupJobs.length, 1);

    const attachment = await service.getAttachmentAccess(userId, postId, 'file-1');
    assert.equal(attachment.mime, 'text/plain');

    const forbiddenAttachmentService = new ChatService({
      findMessageForAttachment: async () => ({ attachment: { url: 'https://files.example/a.txt' }, conversationId: oid(conversationId) }),
      findConversationForUser: async () => null,
    } as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never);
    await assert.rejects(() => forbiddenAttachmentService.getAttachmentAccess(userId, postId, 'file-1'), ForbiddenError);
  });
});
