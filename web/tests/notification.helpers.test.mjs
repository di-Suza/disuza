import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  getNotificationPostId,
  getNotificationText,
  getNotificationThumbnailUrl,
} from '../dist-tests/features/notifications/model/notification.helpers.js';

const makeNotification = (overrides = {}) => ({
  _id: 'notification-1',
  type: 'LIKE',
  isRead: false,
  sender: {
    _id: 'sender-1',
    userName: 'Samar',
  },
  ...overrides,
});

describe('Notification helpers', () => {
  it('builds readable notification text for core activity types', () => {
    assert.equal(
      renderToStaticMarkup(getNotificationText(makeNotification({ type: 'FOLLOW' }))),
      '<strong>Samar</strong> started following you',
    );
    assert.equal(
      renderToStaticMarkup(getNotificationText(makeNotification({ type: 'COMMENT', contentId: { comment: 'nice work' } }))),
      '<strong>Samar</strong> commented: nice work',
    );
    assert.equal(
      renderToStaticMarkup(getNotificationText(makeNotification({ type: 'GROUP_INVITE', contentId: { groupName: 'Pair Room' } }))),
      '<strong>Samar</strong> invited you to <strong>Pair Room</strong>',
    );
  });

  it('resolves thumbnails from direct and nested post content', () => {
    assert.equal(
      getNotificationThumbnailUrl(makeNotification({ contentId: { media: [{ url: 'https://cdn.dev/direct.png' }] } })),
      'https://cdn.dev/direct.png',
    );
    assert.equal(
      getNotificationThumbnailUrl(makeNotification({ contentId: { post: { media: [{ url: 'https://cdn.dev/nested.png' }] } } })),
      'https://cdn.dev/nested.png',
    );
    assert.equal(getNotificationThumbnailUrl(makeNotification({ contentId: null })), null);
  });

  it('resolves post ids from direct and nested payloads', () => {
    assert.equal(getNotificationPostId(makeNotification({ contentId: { _id: 'post-1' } })), 'post-1');
    assert.equal(getNotificationPostId(makeNotification({ contentId: { post: { _id: 'post-2' } } })), 'post-2');
    assert.equal(getNotificationPostId(makeNotification({ contentId: {} })), null);
  });
});
