import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, it } from 'node:test';

const expectedRepositories: Record<string, string[]> = {
  'src/modules/auth/auth.repository.ts': [],
  'src/modules/auth/otp.repository.ts': ['findByEmail', 'upsertOtp', 'incrementVerifyAttempts', 'decrementOtpCount', 'deleteByEmail'],
  'src/modules/auth/session/authSession.repository.ts': [
    'create',
    'findActiveByIdAndHash',
    'updateRefreshToken',
    'revokeBySessionId',
    'revokeByIdAndHash',
    'revokeAllByUserId',
  ],
  'src/modules/chat/chat.repository.ts': [
    'findConversationById',
    'findConversationByParticipant',
    'findConversationForUser',
    'findGroupConversationForUser',
    'findOrCreateConversation',
    'startDirectConversation',
    'setPinnedForUser',
    'createGroupConversation',
    'createMessage',
    'getConversations',
    'getMessages',
    'findMessageById',
    'findMessageForAttachment',
    'deleteMessage',
    'findLatestMessage',
    'markMessagesSeen',
    'findFeedbackActivity',
    'findPostFeedbacks',
    'countFeedbacksReceivedByDay',
    'populateFeedbackDetails',
    'withSafeAttachment',
    'enrichFeedbackMessages',
  ],
  'src/modules/collab/collab.repository.ts': [
    'findConversationById',
    'findRoomByConversation',
    'findRequestByConversation',
    'createRequest',
    'deleteRequestById',
    'createSharedRoom',
    'findRoomById',
    'findHydratedRoomById',
    'findPopulatedRoom',
    'getOrCreatePersonalRoom',
    'findUserConversationsWithOtherUser',
    'findSharedRoomsByConversationIds',
    'aggregateRoomStats',
    'findRoomProblems',
  ],
  'src/modules/comments/comment.repository.ts': [
    'create',
    'findTopLevelById',
    'findByIdAndPost',
    'findReplies',
    'incrementReplyCount',
    'deleteOne',
    'deleteMany',
    'populateAuthor',
    'getTopLevelComments',
    'findUserActivity',
    'findPostAnalyticsComments',
    'countReceivedByDay',
    'getReplies',
  ],
  'src/modules/issues/issue.repository.ts': ['findLatestByReporter', 'create'],
  'src/modules/likes/like.repository.ts': [
    'createOnce',
    'deleteOne',
    'exists',
    'findUserActivity',
    'findPostLikes',
    'findLikedPostIds',
    'countReceivedByDay',
  ],
  'src/modules/notifications/notification.repository.ts': [
    'create',
    'findPopulatedById',
    'findByRecipient',
    'countUnreadByRecipient',
    'markAllRead',
    'deleteOwnedById',
    'deleteAllByRecipient',
    'deleteByFilter',
    'findOne',
    'findManyByContent',
    'deleteManyByIds',
    'deleteManyByContent',
    'toObjectId',
  ],
  'src/modules/posts/post.repository.ts': [
    'create',
    'findOwnedVisibleById',
    'findOwnedAnalyticsTarget',
    'findVisibleById',
    'findVisibleLinkTarget',
    'findVisibleActionTarget',
    'findVisibleCommentTarget',
    'incrementCommentsCount',
    'findVisibleSaveTarget',
    'findVisibleCoverMedia',
    'incrementLikesCount',
    'incrementFeedbacksCount',
    'incrementRepostsCount',
    'incrementSharesCount',
    'incrementLinkClick',
    'markUserPostsDeleting',
    'findDashboardPosts',
    'findProfilePosts',
    'updateById',
    'markDeleting',
    'restoreDeleting',
    'findFeedPosts',
    'countCreatedByDay',
  ],
  'src/modules/problems/problem.repository.ts': [
    'findProblemById',
    'searchProblems',
    'existsInRoom',
    'findRoomProblem',
    'createRoomProblem',
    'findCollabRoomById',
    'findRoomProblemById',
    'updateRoomProblemLanguage',
    'updateAttemptedProblem',
  ],
  'src/modules/reports/report.repository.ts': ['findExisting', 'create', 'findByReporter', 'countByReporter'],
  'src/modules/reposts/repost.repository.ts': [
    'exists',
    'create',
    'delete',
    'findRepostedPostIds',
    'findPostReposts',
    'findVisibleUserReposts',
    'findVisibleById',
    'deleteManyByPost',
    'countReceivedByDay',
  ],
  'src/modules/saves/save.repository.ts': [
    'findByUserAndPost',
    'exists',
    'create',
    'updateCollection',
    'upsertCollection',
    'deleteByUserAndPost',
    'deleteManyByCollection',
    'findLatestInCollection',
    'findSavedPostIds',
    'countVisibleByCollections',
    'findVisibleCollectionPosts',
  ],
  'src/modules/saves/savedCollection.repository.ts': [
    'findOwnedById',
    'findOwnedByIdLean',
    'findSelected',
    'findAllByOwner',
    'ensureDefaultCollection',
    'create',
    'updateName',
    'deleteById',
    'selectOnly',
    'updateCover',
    'clearSelected',
  ],
  'src/modules/search/search.repository.ts': [
    'findUsers',
    'countUsers',
    'findPosts',
    'countPosts',
    'findTopContributors',
    'findTrendingPosts',
    'countTrendingPosts',
  ],
  'src/modules/users/accountDeletionVerification.repository.ts': ['upsert', 'findValid', 'deleteByUser'],
  'src/modules/users/block/block.repository.ts': [
    'findBetweenUsers',
    'findOne',
    'create',
    'deleteOne',
    'findRelationsForUser',
    'getBlockedUsers',
  ],
  'src/modules/users/follow/follow.repository.ts': [
    'findOne',
    'exists',
    'create',
    'deleteOne',
    'deleteBetweenUsers',
    'getFollowers',
    'getFollowing',
    'findFollowingActivity',
    'findFollowingIds',
    'findFollowerIds',
    'findMutualRelations',
    'countFollowersByDay',
  ],
  'src/modules/users/profileView.repository.ts': ['findRecent', 'create', 'countByDay'],
  'src/modules/users/user.repository.ts': [
    'create',
    'findById',
    'findByIdWithPassword',
    'findProfileById',
    'findPublicById',
    'findByEmail',
    'findByEmailWithSecrets',
    'updateLoginSuccess',
    'incrementFailedLogin',
    'markGoogleLogin',
    'updatePassword',
    'updateIdentity',
    'updateGeneralInfo',
    'updateProfessionalInfo',
    'incrementCounter',
    'markInactive',
    'findRecommendationUsers',
    'findFallbackRecommendations',
  ],
};

const findRepositoryFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = join(directory, entry.name);
  if (entry.isDirectory()) return findRepositoryFiles(entryPath);
  if (!entry.name.endsWith('.repository.ts')) return [];
  return relative(process.cwd(), entryPath).replace(/\\/g, '/');
});

const extractRepositoryMethods = (file: string) => {
  const source = readFileSync(join(process.cwd(), file), 'utf8');
  const methods = Array.from(source.matchAll(/^  (?:async )?([a-zA-Z]\w*)\(/gm), ([, method]) => method)
    .filter((method) => method !== 'constructor');

  return methods;
};

describe('Repository source contracts', () => {
  it('keeps every repository file represented in the backend test matrix', () => {
    const discovered = findRepositoryFiles(join(process.cwd(), 'src/modules')).sort();
    const expected = Object.keys(expectedRepositories).sort();

    assert.deepEqual(discovered, expected);
  });

  it('keeps repository public methods explicit and reviewed', () => {
    for (const [file, methods] of Object.entries(expectedRepositories)) {
      assert.deepEqual(extractRepositoryMethods(file), methods, file);
    }
  });
});
