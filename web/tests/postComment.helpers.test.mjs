import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getPostAuthor,
  getPostImageUrl,
  getPostMedia,
  getPostOwnerId,
  isVideoMedia,
} from '../dist-tests/features/posts/model/post.helpers.js';
import {
  canDeleteComment,
  formatCommentTime,
  getCommentAvatarUrl,
} from '../dist-tests/features/comments/model/comment.helpers.js';

describe('Post helpers', () => {
  it('filters and orders post media by display order', () => {
    const media = getPostMedia({
      media: [
        { url: 'https://cdn.dev/second.png', order: 2 },
        { url: '   ', order: 1 },
        { url: 'https://cdn.dev/first.png', order: 1 },
      ],
    });

    assert.deepEqual(media.map((item) => item.url), [
      'https://cdn.dev/first.png',
      'https://cdn.dev/second.png',
    ]);
  });

  it('falls back to legacy images and resolves post ownership', () => {
    const fallbackAuthor = { _id: 'viewer-1', userName: 'Viewer' };
    const postWithStringUser = { user: 'owner-1', images: [{ url: 'https://cdn.dev/image.png' }] };
    const postWithObjectUser = { user: { _id: 'owner-2', userName: 'Owner' } };

    assert.equal(getPostMedia(postWithStringUser).length, 1);
    assert.equal(getPostOwnerId(postWithStringUser, fallbackAuthor), 'owner-1');
    assert.equal(getPostOwnerId(postWithObjectUser, fallbackAuthor), 'owner-2');
    assert.deepEqual(getPostAuthor({ user: null }, fallbackAuthor), fallbackAuthor);
  });

  it('detects video media and avatar URLs', () => {
    assert.equal(isVideoMedia({ url: 'https://cdn.dev/video.mp4', mediaType: 'video' }), true);
    assert.equal(isVideoMedia({ url: 'https://cdn.dev/video.mov', mime: 'video/quicktime' }), true);
    assert.equal(isVideoMedia({ url: 'https://cdn.dev/image.png', mime: 'image/png' }), false);
    assert.equal(getPostImageUrl({ profilePicture: { url: 'https://cdn.dev/avatar.png' } }), 'https://cdn.dev/avatar.png');
    assert.equal(getPostImageUrl({ profilePicture: { url: '  ' } }), null);
  });
});

describe('Comment helpers', () => {
  it('formats relative comment time from Date.now', () => {
    const originalNow = Date.now;
    Date.now = () => new Date('2026-07-18T08:10:00.000Z').getTime();

    try {
      assert.equal(formatCommentTime('2026-07-18T08:05:00.000Z'), '5 minutes ago');
      assert.equal(formatCommentTime('bad-date'), '');
    } finally {
      Date.now = originalNow;
    }
  });

  it('checks delete permissions for author and post owner', () => {
    const comment = { user: { _id: 'commenter-1' }, postOwner: 'owner-1' };

    assert.equal(canDeleteComment(comment, 'commenter-1'), true);
    assert.equal(canDeleteComment(comment, 'owner-1'), true);
    assert.equal(canDeleteComment(comment, 'other-user'), false);
    assert.equal(canDeleteComment(comment), false);
  });

  it('resolves comment avatar urls safely', () => {
    assert.equal(getCommentAvatarUrl({ user: { profilePicture: { url: 'https://cdn.dev/avatar.png' } } }), 'https://cdn.dev/avatar.png');
    assert.equal(getCommentAvatarUrl({ user: { profilePicture: { url: '' } } }), null);
  });
});
