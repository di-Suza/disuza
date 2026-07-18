import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { validationResult, type ValidationChain } from 'express-validator';

import {
  emailAndOtpRules,
  googleRules,
  loginRules,
  newPasswordAndTokenRules,
  sendOtpRules,
  verifyAndRegisterRules,
} from '../src/modules/auth/validators/auth.validator.js';
import { sendMessageRules, createGroupRules, pinConversationRules } from '../src/modules/chat/validators/chat.validator.js';
import { conversationIdRules, roomIdRules } from '../src/modules/collab/validators/collab.validator.js';
import { createCommentRules, deleteCommentRules, getCommentsRules } from '../src/modules/comments/validators/comment.validator.js';
import { createIssueRules } from '../src/modules/issues/validators/issue.validator.js';
import {
  createPostRules,
  pageQueryRules as postPageQueryRules,
  postAnalyticsRules,
  trackPostLinkClickRules,
  updatePostRules,
} from '../src/modules/posts/validators/post.validator.js';
import { addProblemToRoomRules, runProblemRules, updateProblemLanguageRules } from '../src/modules/problems/validators/problem.validator.js';
import { getMyReportsRules, postReportRules, reportRules } from '../src/modules/reports/validators/report.validator.js';
import { collectionNameRules, savePostRules, savedCollectionPostsRules } from '../src/modules/saves/validators/save.validator.js';
import { discoverRules, searchRules } from '../src/modules/search/validators/search.validator.js';
import {
  analyticsRangeRules,
  passwordRules,
  recommendationRules,
  updateGeneralInfoRules,
  updateProfessionalInfoRules,
  updateUserNameAndPPRules,
  verifyDeleteAccountOtpRules,
  verifyDeleteAccountPasswordRules,
} from '../src/modules/users/validators/user.validator.js';
import { getNotificationRules, notificationIdParamRules } from '../src/modules/notifications/validators/notification.validator.js';

const objectId = '507f1f77bcf86cd799439011';
const otherObjectId = '507f1f77bcf86cd799439012';

type RequestLike = {
  body: Record<string, unknown>;
  query: Record<string, unknown>;
  params: Record<string, unknown>;
  files?: unknown;
  file?: unknown;
};

const runRules = async (rules: ValidationChain[], overrides: Partial<RequestLike> = {}) => {
  const req: RequestLike = {
    body: {},
    query: {},
    params: {},
    ...overrides,
  };

  for (const rule of rules) {
    await rule.run(req as never);
  }

  return {
    req,
    errors: validationResult(req as never).array(),
  };
};

describe('Backend validators', () => {
  it('validates auth payloads for registration, login, OTP, Google, and password reset', async () => {
    assert.equal((await runRules(sendOtpRules, { body: { userName: 'Sa', email: 'bad', password: 'short' } })).errors.length, 3);
    assert.equal((await runRules(verifyAndRegisterRules, {
      body: { userName: 'Samar Rajput', email: 'samar@example.com', password: 'password123', otp: '123456' },
    })).errors.length, 0);
    assert.equal((await runRules(loginRules, { body: { email: 'samar@example.com', password: 'password123' } })).errors.length, 0);
    assert.equal((await runRules(emailAndOtpRules, { body: { email: 'samar@example.com', otp: 'abc' } })).errors.length, 1);
    assert.equal((await runRules(googleRules, { body: { code: '  ' } })).errors.length, 1);
    assert.equal((await runRules(newPasswordAndTokenRules, { body: { token: 'bad-token', newPassword: 'short' } })).errors.length, 2);
  });

  it('validates post composer, analytics, link tracking, feed query, and update payloads', async () => {
    const missingProjectLinks = await runRules(createPostRules, {
      body: { isProjectPost: 'true', projectLinks: JSON.stringify({ liveDemoUrl: 'https://demo.example' }) },
    });
    assert.ok(missingProjectLinks.errors.some((error) => error.msg === 'Project post cannot be created without URLs!'));

    const validProject = await runRules(createPostRules, {
      body: {
        isProjectPost: 'true',
        projectLinks: JSON.stringify({
          liveDemoUrl: 'https://demo.example',
          repositoryUrl: 'https://github.com/example/repo',
        }),
      },
    });
    assert.equal(validProject.errors.length, 0);
    assert.equal(validProject.req.body.isProjectPost, true);

    assert.equal((await runRules(updatePostRules, { params: { postId: objectId }, body: {} })).errors.length, 1);
    assert.equal((await runRules(postAnalyticsRules, { params: { postId: objectId }, query: { page: '0', limit: '40', section: 'saves' } })).errors.length, 3);
    assert.equal((await runRules(trackPostLinkClickRules, { params: { postId: objectId }, body: { linkKey: '' } })).errors.length, 1);
    const feed = await runRules(postPageQueryRules, { query: { page: '2', limit: '5', type: 'following' } });
    assert.equal(feed.errors.length, 0);
    assert.equal(feed.req.query.page, 2);
  });

  it('validates user profile, dashboard, account delete, and recommendation payloads', async () => {
    assert.equal((await runRules(passwordRules, { body: { currentPassword: 'password123', newPassword: 'password123' } })).errors.length, 1);
    assert.equal((await runRules(verifyDeleteAccountPasswordRules, { body: { password: 'password123' } })).errors.length, 0);
    assert.equal((await runRules(verifyDeleteAccountOtpRules, { body: { otp: '12345x' } })).errors.length, 1);
    assert.equal((await runRules(updateUserNameAndPPRules, { body: {} })).errors.length, 1);
    assert.equal((await runRules(updateGeneralInfoRules, { body: { address: { city: 'Delhi', state: 'DL', country: 'India' } } })).errors.length, 0);
    assert.equal((await runRules(updateProfessionalInfoRules, { body: { handles: [{ label: 'GitHub', link: 'https://github.com/di-Suza' }] } })).errors.length, 0);
    assert.equal((await runRules(analyticsRangeRules, { query: { range: '365d' } })).errors.length, 1);
    assert.equal((await runRules(recommendationRules, { query: { limit: '21' } })).errors.length, 1);
  });

  it('validates chat messages, group management, and pin payloads', async () => {
    assert.equal((await runRules(sendMessageRules, { body: { receiverId: objectId, message: 'hello' } })).errors.length, 0);
    assert.equal((await runRules(sendMessageRules, { body: { receiverId: objectId, isFeedback: true, feedbackOn: 'Post' } })).errors.length, 1);
    assert.equal((await runRules(createGroupRules, { body: { memberIds: [objectId] } })).errors.length, 1);
    assert.equal((await runRules(createGroupRules, { body: { memberIds: [objectId, otherObjectId], groupName: 'Team' } })).errors.length, 0);
    const pin = await runRules(pinConversationRules, { params: { conversationId: objectId }, body: { pinned: 'true' } });
    assert.equal(pin.errors.length, 0);
    assert.equal(pin.req.body.pinned, true);
  });

  it('validates comments, reports, saves, search, issues, problems, notifications, and collab ids', async () => {
    assert.equal((await runRules(createCommentRules, { body: { postId: objectId, comment: 'Nice' } })).errors.length, 0);
    assert.equal((await runRules(deleteCommentRules, { body: { postId: 'bad', commentId: objectId } })).errors.length, 1);
    assert.equal((await runRules(getCommentsRules, { params: { postId: objectId }, query: { page: '1', limit: '30' } })).errors.length, 0);

    assert.equal((await runRules(reportRules, { body: { targetId: objectId, onModel: 'Post', reason: 'Spam', description: 'bad' } })).errors.length, 0);
    assert.equal((await runRules(postReportRules, { body: { targetId: objectId, reason: 'Bad reason', description: 'bad' } })).errors.length, 1);
    assert.equal((await runRules(getMyReportsRules, { query: { page: '0', limit: '21' } })).errors.length, 2);

    assert.equal((await runRules(savePostRules, { body: { postId: objectId, collectionId: otherObjectId } })).errors.length, 0);
    assert.equal((await runRules(collectionNameRules, { body: { name: '   ' } })).errors.length, 1);
    assert.equal((await runRules(savedCollectionPostsRules, { params: { id: objectId }, query: { page: '1', limit: '24' } })).errors.length, 0);

    assert.equal((await runRules(searchRules, { query: { q: 'react', userPage: '1', postPage: '1', limit: '20' } })).errors.length, 0);
    assert.equal((await runRules(discoverRules, { query: { page: '0', limit: '0' } })).errors.length, 2);
    assert.equal((await runRules(createIssueRules, { body: { category: 'Bug', description: 'broken' } })).errors.length, 0);

    assert.equal((await runRules(addProblemToRoomRules, { body: { roomId: objectId, problemId: otherObjectId } })).errors.length, 0);
    assert.equal((await runRules(updateProblemLanguageRules, { body: { roomId: objectId, roomProblemId: otherObjectId, language: 'java' } })).errors.length, 1);
    assert.equal((await runRules(runProblemRules, { body: { roomId: objectId, roomProblemId: otherObjectId, code: ' ', language: 'javascript' } })).errors.length, 1);

    assert.equal((await runRules(getNotificationRules, { query: { page: '1', limit: '20' } })).errors.length, 0);
    assert.equal((await runRules(notificationIdParamRules, { params: { notificationId: 'bad' } })).errors.length, 1);
    assert.equal((await runRules(conversationIdRules, { params: { conversationId: objectId } })).errors.length, 0);
    assert.equal((await runRules(roomIdRules, { params: { roomId: 'bad' } })).errors.length, 1);
  });
});
