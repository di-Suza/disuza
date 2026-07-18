import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getUnreadMessagesCount,
  getUnreadNotificationsCount,
} from '../dist-tests/shared/hooks/unreadCount.helpers.js';

describe('Unread count hook helpers', () => {
  it('counts only incoming unread messages and preserves numeric badges', () => {
    const conversations = [
      { isUnread: true, unreadCount: 3, lastMessage: { sender: 'other-1' } },
      { isUnread: true, unreadCount: 0, lastMessage: { sender: 'other-2' } },
      { isUnread: true, unreadCount: 5, lastMessage: { sender: 'viewer-1' } },
      { isUnread: false, unreadCount: 0, lastMessage: { sender: 'other-3' } },
    ];

    assert.equal(getUnreadMessagesCount(conversations, 'viewer-1'), 4);
  });

  it('returns zero without a viewer or conversations', () => {
    assert.equal(getUnreadMessagesCount(undefined, 'viewer-1'), 0);
    assert.equal(getUnreadMessagesCount([{ isUnread: true, lastMessage: { sender: 'other-1' } }], null), 0);
  });

  it('normalizes notification unread counts', () => {
    assert.equal(getUnreadNotificationsCount(7), 7);
    assert.equal(getUnreadNotificationsCount('4'), 4);
    assert.equal(getUnreadNotificationsCount(-1), 0);
    assert.equal(getUnreadNotificationsCount('bad'), 0);
  });
});
