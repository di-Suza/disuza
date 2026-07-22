import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AuthController } from '../../src/modules/auth/auth.controller.js';
import { ChatController } from '../../src/modules/chat/chat.controller.js';
import { CollabController } from '../../src/modules/collab/collab.controller.js';
import { CommentController } from '../../src/modules/comments/comment.controller.js';
import { HealthController } from '../../src/modules/health/health.controller.js';
import { IssueController } from '../../src/modules/issues/issue.controller.js';
import { LikeController } from '../../src/modules/likes/like.controller.js';
import { MediaController } from '../../src/modules/media/media.controller.js';
import { NotificationController } from '../../src/modules/notifications/notification.controller.js';
import { PostController } from '../../src/modules/posts/post.controller.js';
import { ProblemController } from '../../src/modules/problems/problem.controller.js';
import { ReportController } from '../../src/modules/reports/report.controller.js';
import { RepostController } from '../../src/modules/reposts/repost.controller.js';
import { SaveController } from '../../src/modules/saves/save.controller.js';
import { SearchController } from '../../src/modules/search/search.controller.js';
import { UserController } from '../../src/modules/users/user.controller.js';
import { invokeController } from '../helpers/controller.js';

const objectId = '507f1f77bcf86cd799439011';
const otherObjectId = '507f1f77bcf86cd799439012';

describe('Controller response contracts', () => {
  it('maps auth controller actions to their service contracts', async () => {
    const service = {
      refresh: async () => ({ accessToken: 'access-token', refreshToken: 'next-refresh' }),
      sendRegistrationOtp: async () => 1,
      verifyOtpAndRegister: async () => ({ user: { userName: 'Samar' }, accessToken: 'access-token', refreshToken: 'refresh-token' }),
      loginUser: async () => ({ user: { userName: 'Samar' }, accessToken: 'access-token', refreshToken: 'refresh-token' }),
      getMe: async () => ({ userName: 'Samar' }),
      logout: async () => ({ message: 'Logged out successfully!' }),
      logoutAllDevices: async () => ({ message: 'Logged out from all devices successfully!' }),
      googleSign: async () => ({ user: { userName: 'Samar', isNew: true }, accessToken: 'access-token', refreshToken: 'refresh-token' }),
      sendForgotPasswordOtp: async () => 2,
      verifyForgotPasswordOtp: async () => ({ token: 'reset-token', email: 'samar@example.com' }),
      updateForgotPassword: async () => ({ userName: 'Samar' }),
    };
    const cookies = {
      getRefreshToken: () => 'refresh-token',
      setRefreshToken: () => undefined,
      clearRefreshToken: () => undefined,
    };
    const controller = new AuthController(service as never, cookies as never);

    assert.equal((await invokeController(controller.refresh)).statusCode, 200);
    assert.equal((await invokeController(controller.sendOtp, { body: { email: 'samar@example.com' } })).statusCode, 201);
    assert.equal((await invokeController(controller.verifyAndRegister, { body: { email: 'samar@example.com' } })).statusCode, 201);
    assert.equal((await invokeController(controller.login, { body: { email: 'samar@example.com' } })).statusCode, 200);
    assert.equal((await invokeController(controller.getMe)).statusCode, 200);
    assert.equal((await invokeController(controller.logout)).statusCode, 200);
    assert.equal((await invokeController(controller.logoutAllDevices)).statusCode, 200);
    assert.equal((await invokeController(controller.google, { body: { code: 'code' } })).statusCode, 201);
    assert.equal((await invokeController(controller.sendOtpForForgotPassword, { body: { email: 'samar@example.com' } })).statusCode, 201);
    assert.equal((await invokeController(controller.verifyOtpForForgotPassword, { body: { email: 'samar@example.com', otp: '123456' } })).statusCode, 200);
    assert.equal((await invokeController(controller.updateNewPasswordForgotPassword, { body: { token: 'token', newPassword: 'password123' } })).statusCode, 200);
  });

  it('maps post, like, repost, save, comment, and report controllers', async () => {
    const postController = new PostController({
      createPost: async () => ({ _id: objectId }),
      getDashboardPosts: async () => ({ posts: [], hasMore: false }),
      getPost: async () => ({ _id: objectId }),
      getPostAnalytics: async () => ({ overview: {}, items: [], hasMore: false }),
      trackLinkClick: async () => ({ counted: true, clicks: 1 }),
      updatePost: async () => ({ _id: objectId, caption: 'Updated' }),
      deletePost: async () => ({ alreadyDeleting: false }),
      getFeed: async () => ({ posts: [], hasMore: false }),
    } as never);
    const likeController = new LikeController({
      likePost: async () => ({ liked: true, likesCount: 1 }),
      unlikePost: async () => ({ liked: false, likesCount: 0 }),
    } as never);
    const repostController = new RepostController({
      getRepost: async () => ({ _id: objectId }),
      getUserReposts: async () => ({ reposts: [], hasMore: false }),
      repost: async () => ({ reposted: true, repostsCount: 1 }),
      unrepost: async () => ({ reposted: false, alreadyUnreposted: false, repostsCount: 0 }),
    } as never);
    const saveController = new SaveController({
      savePost: async () => ({ saved: true }),
      unsavePost: async () => ({ saved: false }),
      getSavedPostsCollections: async () => [],
      changeSavedPostCollection: async () => ({ saved: true }),
      createCollection: async () => ({ _id: objectId }),
      updateCollection: async () => ({ _id: objectId, name: 'Work' }),
      deleteCollection: async () => ({ deleted: true }),
      getSavedCollectionPosts: async () => ({ posts: [], hasMore: false }),
    } as never);
    const commentController = new CommentController({
      createComment: async () => ({ _id: objectId }),
      getAllComments: async () => ({ comments: [], hasMore: false }),
      getReplies: async () => ({ replies: [], hasMore: false }),
      deleteComment: async () => ({ deletedCount: 1, parentCommentId: null }),
    } as never);
    const reportController = new ReportController({
      createReport: async () => ({ _id: objectId }),
      getMyReports: async () => ({ reports: [], hasMore: false }),
    } as never);

    assert.equal((await invokeController(postController.createPost, { body: { caption: 'Post' } })).statusCode, 201);
    assert.equal((await invokeController(postController.getAllPosts, { query: { page: '1' } })).statusCode, 200);
    assert.equal((await invokeController(postController.getPost, { params: { postId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(postController.getPostAnalytics, { params: { postId: objectId }, query: { section: 'likes' } })).statusCode, 200);
    assert.equal((await invokeController(postController.trackLinkClick, { params: { postId: objectId }, body: { linkKey: 'live' } })).statusCode, 200);
    assert.equal((await invokeController(postController.updatePost, { params: { postId: objectId }, body: { caption: 'Updated' } })).statusCode, 200);
    assert.equal((await invokeController(postController.deletePost, { params: { postId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(postController.getFeed, { query: { type: 'all' } })).statusCode, 200);

    assert.equal((await invokeController(likeController.likePost, { params: { postId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(likeController.unlikePost, { params: { postId: objectId } })).statusCode, 200);

    assert.equal((await invokeController(repostController.getRepost, { params: { repostId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(repostController.getUserReposts, { params: { userId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(repostController.repostPost, { params: { postId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(repostController.unrepostPost, { params: { postId: objectId } })).statusCode, 200);

    assert.equal((await invokeController(saveController.savePost, { body: { postId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(saveController.unsavePost, { params: { postId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(saveController.getSavedPostsCollections)).statusCode, 200);
    assert.equal((await invokeController(saveController.changeSavedPostCollection, { body: { postId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(saveController.createCollection, { body: { name: 'Work' } })).statusCode, 201);
    assert.equal((await invokeController(saveController.updateCollection, { params: { id: objectId }, body: { name: 'Work' } })).statusCode, 200);
    assert.equal((await invokeController(saveController.deleteCollection, { params: { id: objectId } })).statusCode, 201);
    assert.equal((await invokeController(saveController.getSavedCollectionPosts, { params: { id: objectId } })).statusCode, 200);

    assert.equal((await invokeController(commentController.postComment, { body: { postId: objectId, comment: 'Nice' } })).statusCode, 201);
    assert.equal((await invokeController(commentController.getAllComments, { params: { postId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(commentController.getReplies, { params: { commentId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(commentController.deleteComment, { body: { postId: objectId, commentId: objectId } })).statusCode, 200);

    assert.equal((await invokeController(reportController.createReport, { body: { onModel: 'User' } })).statusCode, 201);
    assert.equal((await invokeController(reportController.reportPost, { body: { postId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(reportController.getMyReports)).statusCode, 200);
  });

  it('maps chat controller actions including groups, pins, reads, and attachments', async () => {
    const controller = new ChatController({
      saveMessage: async () => ({ _id: objectId, message: 'Hello' }),
      getConversations: async () => [],
      getMessages: async () => ({ messages: [], hasMore: false }),
      markAsRead: async () => ({ updated: true }),
      unsendMessage: async () => ({ messageId: objectId }),
      deleteConversationForUser: async () => ({ deleted: true }),
      getAttachmentAccess: async () => ({ url: 'https://files.example/attachment.txt', name: 'attachment.txt', mime: 'text/plain' }),
      startConversation: async () => ({ conversation: { _id: objectId }, created: true }),
      setConversationPinned: async () => ({ conversation: { _id: objectId, isPinned: true } }),
      createGroup: async () => ({ conversation: { _id: objectId }, invitedMemberIds: [otherObjectId] }),
      acceptGroupInvite: async () => ({ conversation: { _id: objectId } }),
      updateGroupDetails: async () => ({ conversation: { _id: objectId, groupName: 'Team' } }),
      inviteGroupMembers: async () => ({ invitedMemberIds: [otherObjectId] }),
      removeGroupMember: async () => ({ memberId: otherObjectId }),
    } as never);
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(new Uint8Array([104, 105]), {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch;

    try {
      assert.equal((await invokeController(controller.sendMessage, { body: { conversationId: objectId, message: 'Hello' } })).statusCode, 201);
      assert.equal((await invokeController(controller.getConversations)).statusCode, 200);
      assert.equal((await invokeController(controller.startConversation, { body: { receiverId: otherObjectId } })).statusCode, 201);
      assert.equal((await invokeController(controller.pinConversation, { params: { conversationId: objectId }, body: { pinned: true } })).statusCode, 200);
      assert.equal((await invokeController(controller.createGroup, { body: { memberIds: [objectId, otherObjectId] } })).statusCode, 201);
      assert.equal((await invokeController(controller.acceptGroupInvite, { params: { conversationId: objectId } })).statusCode, 200);
      assert.equal((await invokeController(controller.updateGroupDetails, { params: { conversationId: objectId }, body: { groupName: 'Team' } })).statusCode, 200);
      assert.equal((await invokeController(controller.inviteGroupMembers, { params: { conversationId: objectId }, body: { memberIds: [otherObjectId] } })).statusCode, 200);
      assert.equal((await invokeController(controller.removeGroupMember, { params: { conversationId: objectId, memberId: otherObjectId } })).statusCode, 200);
      assert.equal((await invokeController(controller.getMessages, { params: { conversationId: objectId } })).statusCode, 200);
      assert.equal((await invokeController(controller.markAsRead, { params: { conversationId: objectId } })).statusCode, 200);
      assert.equal((await invokeController(controller.unsendMessage, { params: { messageId: objectId } })).statusCode, 200);
      assert.equal((await invokeController(controller.deleteConversation, { params: { conversationId: objectId } })).statusCode, 200);

      const attachment = await invokeController(controller.getAttachment, { params: { messageId: objectId, fileId: 'file-1' } });
      assert.equal(attachment.statusCode, 200);
      assert.equal(attachment.headers['Content-Type'], 'text/plain');
      assert.ok(Buffer.isBuffer(attachment.sent));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps collab and problem controller actions with realtime emissions', async () => {
    const emissions: Array<{ roomId: string; event: string; payload: unknown }> = [];
    const realtime = {
      emitToRoom: (roomId: string, event: string, payload: unknown) => {
        emissions.push({ roomId, event, payload });
      },
    };
    const collabController = new CollabController({
      checkCollabRequestStatus: async () => ({ status: 'none' }),
      sendCollabRequest: async () => ({ _id: objectId }),
      acceptCollabRequest: async () => ({ room: { _id: objectId } }),
      getCollabRoom: async () => ({ room: { _id: objectId } }),
      getMyRooms: async () => [],
      getOrCreatePersonalRoom: async () => ({ room: { _id: objectId } }),
    } as never);
    const problemController = new ProblemController({
      searchProblem: async () => [],
      addProblemToRoom: async () => ({ roomProblem: { _id: objectId }, isNew: true, canUseRealtime: true }),
      selectProblem: async () => ({ selectedProblem: { _id: objectId }, previousProblem: null, canUseRealtime: true }),
      unselectProblem: async () => ({ unselectedProblem: { _id: objectId }, canUseRealtime: true }),
      updateProblemLanguage: async () => ({ roomProblem: { _id: objectId, language: 'javascript' }, canUseRealtime: true }),
      removeProblemFromRoom: async () => ({
        removedProblem: { _id: otherObjectId },
        removedProblemId: otherObjectId,
        unselectedProblem: null,
        canUseRealtime: true,
      }),
      getRoomRealtimeAccess: async () => true,
      runProblem: async () => ({ roomProblem: { _id: objectId }, result: { passed: true }, canUseRealtime: true }),
    } as never, realtime as never);

    assert.equal((await invokeController(collabController.getMyRooms)).statusCode, 200);
    assert.equal((await invokeController(collabController.getPersonalRoom)).statusCode, 200);
    assert.equal((await invokeController(collabController.getCollabStatus, { params: { conversationId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(collabController.sendCollabRequest, { params: { conversationId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(collabController.acceptCollabRequest, { params: { conversationId: objectId } })).statusCode, 201);
    assert.equal((await invokeController(collabController.getCollabRoom, { params: { roomId: objectId } })).statusCode, 200);

    assert.equal((await invokeController(problemController.searchProblem, { params: { roomId: objectId }, query: { query: 'array' } })).statusCode, 200);
    assert.equal((await invokeController(problemController.addProblemToRoom, { body: { roomId: objectId, problemId: otherObjectId } })).statusCode, 201);
    assert.equal((await invokeController(problemController.selectProblem, { body: { roomId: objectId, roomProblemId: otherObjectId } })).statusCode, 200);
    assert.equal((await invokeController(problemController.unselectProblem, { body: { roomId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(problemController.updateProblemLanguage, { body: { roomId: objectId, roomProblemId: otherObjectId, language: 'javascript' } })).statusCode, 200);
    assert.equal((await invokeController(problemController.removeProblemFromRoom, { body: { roomId: objectId, roomProblemId: otherObjectId } })).statusCode, 200);
    assert.equal((await invokeController(problemController.runProblem, { body: { roomId: objectId, roomProblemId: otherObjectId, code: 'console.log(1)', language: 'javascript' } })).statusCode, 200);
    assert.ok(emissions.some((entry) => entry.event === 'room_sync'));
    assert.ok(emissions.some((entry) => entry.event === 'code_execution'));
  });

  it('maps user, notification, search, media, issue, and health controllers', async () => {
    const userController = new UserController({
      changePassword: async () => undefined,
      updateUserNameAndPP: async () => ({ userName: 'Samar' }),
      updateGeneralInfo: async () => ({ headline: 'Builder' }),
      updateProfessionalInfo: async () => ({ skills: ['React'] }),
      getUserProfile: async () => ({ success: true, user: { _id: objectId } }),
      getDashboardAnalytics: async () => ({ totals: { posts: 1 }, series: [] }),
      recordProfileView: async () => ({ counted: true }),
      getUserAccountHistory: async () => [{ _id: objectId }],
      verifyAccountDeletePassword: async () => undefined,
      sendAccountDeleteOtp: async () => undefined,
      verifyAccountDeleteOtp: async () => undefined,
      deleteUserAccount: async () => undefined,
      followUser: async () => ({ alreadyFollowing: false, followersCount: 1 }),
      unfollowUser: async () => undefined,
      getFollowers: async () => [{ _id: otherObjectId }],
      getFollowing: async () => [{ _id: otherObjectId }],
      blockUser: async () => ({ alreadyBlocked: false }),
      unblockUser: async () => undefined,
      getBlockedUsers: async () => ({ users: [], hasMore: false }),
      getUserRecommendations: async () => [],
    } as never);
    const notificationController = new NotificationController({
      getNotifications: async () => ({ notifications: [], hasMore: false }),
      markAllAsRead: async () => undefined,
      deleteNotification: async () => undefined,
      deleteAllNotifications: async () => undefined,
    } as never);
    const searchController = new SearchController({
      discover: async () => ({ posts: [], users: [] }),
      search: async () => ({ posts: [], users: [] }),
    } as never);
    const mediaController = new MediaController({
      getClientUploadAuth: () => ({ token: 'token', expire: 123, signature: 'signature' }),
    } as never);
    const issueController = new IssueController({
      createIssue: async () => ({ message: 'Issue created' }),
    } as never);
    const healthController = new HealthController({
      getHealth: () => ({ status: 'ok' }),
    } as never);

    assert.equal((await invokeController(userController.updatePassword, { body: { currentPassword: 'old', newPassword: 'new' } })).statusCode, 200);
    assert.equal((await invokeController(userController.updateUserNameAndPP, { body: { userName: 'Samar' } })).statusCode, 201);
    assert.equal((await invokeController(userController.updateGeneralInfo, { body: { headline: 'Builder' } })).statusCode, 200);
    assert.equal((await invokeController(userController.updateProfessionalInfo, { body: { skills: ['React'] } })).statusCode, 200);
    assert.equal((await invokeController(userController.getProfileUser, { params: { id: objectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.getDashboardAnalytics, { query: { range: '30d' } })).statusCode, 200);
    assert.equal((await invokeController(userController.trackProfileView, { params: { id: otherObjectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.getUserAccountHistory, { query: { type: 'likes' } })).statusCode, 200);
    assert.equal((await invokeController(userController.verifyAccountDeletePassword, { body: { password: 'password123' } })).statusCode, 200);
    assert.equal((await invokeController(userController.sendAccountDeleteOtp)).statusCode, 200);
    assert.equal((await invokeController(userController.verifyAccountDeleteOtp, { body: { otp: '123456' } })).statusCode, 200);
    assert.equal((await invokeController(userController.deleteUserAccount)).statusCode, 200);
    assert.equal((await invokeController(userController.followUser, { params: { id: otherObjectId } })).statusCode, 201);
    assert.equal((await invokeController(userController.unfollowUser, { params: { id: otherObjectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.getFollowers, { params: { id: objectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.getFollowing, { params: { id: objectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.blockUser, { params: { id: otherObjectId } })).statusCode, 201);
    assert.equal((await invokeController(userController.unblockUser, { params: { id: otherObjectId } })).statusCode, 200);
    assert.equal((await invokeController(userController.getBlockedUsers)).statusCode, 200);
    assert.equal((await invokeController(userController.getUserRecommendations)).statusCode, 200);

    assert.equal((await invokeController(notificationController.getNotifications)).statusCode, 200);
    assert.equal((await invokeController(notificationController.markAllAsRead)).statusCode, 200);
    assert.equal((await invokeController(notificationController.deleteNotification, { params: { notificationId: objectId } })).statusCode, 200);
    assert.equal((await invokeController(notificationController.deleteAllNotifications)).statusCode, 200);

    assert.equal((await invokeController(searchController.discover)).statusCode, 200);
    assert.equal((await invokeController(searchController.search, { query: { q: 'react' } })).statusCode, 200);
    assert.equal((await invokeController(mediaController.getUploadAuth)).statusCode, 200);
    assert.equal((await invokeController(issueController.createIssue, { body: { type: 'bug' } })).statusCode, 201);
    assert.equal((await invokeController(healthController.getHealth)).statusCode, 200);
  });
});
