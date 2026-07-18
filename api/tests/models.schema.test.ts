import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import AuthSessionModel from '../src/modules/auth/session/authSession.model.js';
import OtpModel from '../src/modules/auth/otp.model.js';
import ConversationModel from '../src/modules/chat/conversation.model.js';
import MessageModel from '../src/modules/chat/message.model.js';
import CollabRequestModel from '../src/modules/collab/collabRequest.model.js';
import CollabRoomModel from '../src/modules/collab/collabRoom.model.js';
import CommentModel from '../src/modules/comments/comment.model.js';
import ContributionLogModel from '../src/modules/contributions/contributionLog.model.js';
import DailyContributionModel from '../src/modules/contributions/dailyContribution.model.js';
import IssueModel from '../src/modules/issues/issue.model.js';
import LikeModel from '../src/modules/likes/like.model.js';
import NotificationModel from '../src/modules/notifications/notification.model.js';
import PostModel from '../src/modules/posts/post.model.js';
import ProblemModel from '../src/modules/problems/problem.model.js';
import RoomProblemModel from '../src/modules/problems/roomProblem.model.js';
import ReportModel from '../src/modules/reports/report.model.js';
import RepostModel from '../src/modules/reposts/repost.model.js';
import SaveModel from '../src/modules/saves/save.model.js';
import SavedCollectionModel from '../src/modules/saves/savedCollection.model.js';
import AccountDeletionVerificationModel from '../src/modules/users/accountDeletionVerification.model.js';
import BlockModel from '../src/modules/users/block/block.model.js';
import FollowModel from '../src/modules/users/follow/follow.model.js';
import ProfileViewModel from '../src/modules/users/profileView.model.js';
import UserModel from '../src/modules/users/user.model.js';
import { oid, otherUserId, postId, userId } from './helpers/domain.js';

describe('Mongoose model schemas', () => {
  it('loads every backend model with the expected collection names', () => {
    const models = [
      [AuthSessionModel, 'auth_sessions'],
      [OtpModel, 'otps'],
      [ConversationModel, 'conversations'],
      [MessageModel, 'messages'],
      [CollabRequestModel, 'collabrequests'],
      [CollabRoomModel, 'collabrooms'],
      [CommentModel, 'comments'],
      [ContributionLogModel, 'contributionlogs'],
      [DailyContributionModel, 'dailycontributions'],
      [IssueModel, 'issues'],
      [LikeModel, 'likes'],
      [NotificationModel, 'notifications'],
      [PostModel, 'posts'],
      [ProblemModel, 'problems'],
      [RoomProblemModel, 'roomproblems'],
      [ReportModel, 'reports'],
      [RepostModel, 'reposts'],
      [SaveModel, 'saves'],
      [SavedCollectionModel, 'savedpostscollections'],
      [AccountDeletionVerificationModel, 'accountdeletionverifications'],
      [BlockModel, 'blocks'],
      [FollowModel, 'follows'],
      [ProfileViewModel, 'profileviews'],
      [UserModel, 'users'],
    ] as const;

    assert.deepEqual(models.map(([model, collection]) => [model.collection.name, collection]), models.map(([, collection]) => [collection, collection]));
  });

  it('normalizes post media order, links, hashtags, code snippets, and project-link requirements', async () => {
    const invalidProject = new PostModel({
      user: oid(userId),
      isProjectPost: true,
      projectLinks: { liveDemoUrl: 'https://demo.example' },
    });
    await assert.rejects(() => invalidProject.validate(), /Both liveDemoUrl and repositoryUrl/);

    const post = new PostModel({
      user: oid(userId),
      caption: ' Launch ',
      media: [
        { url: '2.jpg', fileId: 'file-2', mediaType: 'image', order: 5 },
        { url: '1.jpg', fileId: 'file-1', mediaType: 'image', order: 1 },
      ],
      links: [{ label: ' Docs ', url: ' https://docs.example ' }, { label: ' ', url: 'https://empty.example' }],
      hashtags: ['#React', 'react', '  Node  '],
      codeSnippet: { language: ' ', code: ' ' },
    });

    await post.validate();

    assert.deepEqual(post.media.map((media) => [media.fileId, media.order]), [['file-1', 0], ['file-2', 1]]);
    assert.deepEqual(post.links.map((link) => link.label), ['Docs']);
    assert.deepEqual(post.hashtags, ['react', 'node']);
    assert.equal(post.codeSnippet, undefined);
  });

  it('normalizes message feedback, post, and attachment-only fields by message type', async () => {
    const text = new MessageModel({
      conversationId: oid(postId),
      sender: oid(userId),
      text: 'hello',
      messageType: 'text',
      feedbackOn: { type: 'Post', _id: oid(postId) },
      sharedPost: oid(postId),
      attachment: { fileId: 'file-1', mediaType: 'file' },
    });
    await text.validate();
    assert.equal(text.feedbackOn?.type, undefined);
    assert.equal(text.feedbackOn?._id, undefined);
    assert.equal(text.sharedPost, undefined);
    assert.equal(text.attachment?.fileId, undefined);
    assert.equal(text.attachment?.mediaType, undefined);

    const feedback = new MessageModel({
      conversationId: oid(postId),
      sender: oid(userId),
      text: 'feedback',
      isFeedback: true,
      feedbackOn: { type: 'Post', _id: oid(postId) },
    });
    await feedback.validate();
    assert.equal(feedback.messageType, 'feedback');
  });

  it('applies user, conversation, notification, and problem defaults', async () => {
    const user = new UserModel({
      userName: 'Samar',
      email: 'SAMAR@EXAMPLE.COM',
      password: 'secret',
      handles: [{ label: 'GitHub', link: 'https://github.com/di-Suza' }],
    });
    await user.validate();
    const publicUser = user.toJSON() as Record<string, unknown>;
    assert.equal(user.email, 'samar@example.com');
    assert.equal(publicUser.password, undefined);
    assert.equal(user.profilePicture.fileId, '0');

    const conversation = new ConversationModel({ participants: [oid(userId), oid(otherUserId)] });
    await conversation.validate();
    assert.equal(conversation.isUnread, true);
    assert.equal(conversation.isGroup, false);

    const notification = new NotificationModel({
      type: 'LIKE',
      recipient: oid(userId),
      sender: oid(otherUserId),
    });
    await notification.validate();
    assert.equal(notification.isRead, false);

    const problem = new ProblemModel({
      title: 'Two Sum',
      description: 'Return indices',
      testCases: [{ input: '[1,2]', expectedOutput: '3' }],
    });
    await problem.validate();
    assert.equal(problem.difficulty, 'Easy');
    assert.equal(problem.boilerplate.javascript?.includes('function solution'), true);
  });
});
