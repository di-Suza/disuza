import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getConversationPreview,
  getConversationTitle,
  getFeedbackMediaUrl,
  getSharedPostMediaUrl,
  getUserAvatarUrl,
  getUserInitial,
  isMessageFromUser,
} from '../dist-tests/features/messages/model/chat.helpers.js';
import { isRetryableMessageSendError } from '../dist-tests/features/messages/model/offlineMessageQueue.js';

describe('Chat helpers', () => {
  it('builds conversation titles for direct and group chats', () => {
    assert.equal(getConversationTitle({ isGroup: true, groupName: 'DSA Room' }), 'DSA Room');
    assert.equal(getConversationTitle({ isGroup: true }), 'Group Chat');
    assert.equal(getConversationTitle({ otherUser: { userName: 'Samar' } }), 'Samar');
  });

  it('formats conversation previews by message type', () => {
    assert.equal(getConversationPreview(null), 'Start a conversation');
    assert.equal(getConversationPreview({ messageType: 'system', text: 'Samar joined' }), 'Samar joined');
    assert.equal(getConversationPreview({ messageType: 'attachment', attachment: { mediaType: 'image' } }), 'Sent an image');
    assert.equal(getConversationPreview({ messageType: 'attachment', attachment: { mediaType: 'audio' } }), 'Sent an audio file');
    assert.equal(getConversationPreview({ messageType: 'post' }), 'Shared a post');
    assert.equal(getConversationPreview({ text: 'hello' }), 'hello');
  });

  it('resolves chat avatars, initials, and media previews safely', () => {
    assert.equal(getUserInitial({ userName: ' samar ' }), 'S');
    assert.equal(getUserInitial(null), 'U');
    assert.equal(getUserAvatarUrl({ profilePicture: { url: 'https://cdn.dev/avatar.png' } }), 'https://cdn.dev/avatar.png');
    assert.equal(getUserAvatarUrl({ profilePicture: { url: '' } }), null);
    assert.equal(getFeedbackMediaUrl({ media: [{ url: 'https://cdn.dev/feedback.png' }] }), 'https://cdn.dev/feedback.png');
    assert.equal(getSharedPostMediaUrl({ media: [{ thumbnailUrl: 'https://cdn.dev/thumb.png', url: 'https://cdn.dev/full.png' }] }), 'https://cdn.dev/thumb.png');
    assert.equal(getSharedPostMediaUrl({ images: [{ url: 'https://cdn.dev/legacy.png' }] }), 'https://cdn.dev/legacy.png');
  });

  it('checks sender ownership and retryable send errors', () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: true },
    });

    assert.equal(isMessageFromUser({ sender: 'user-1' }, 'user-1'), true);
    assert.equal(isMessageFromUser({ sender: 'user-2' }, 'user-1'), false);
    assert.equal(isRetryableMessageSendError({ status: 'FETCH_ERROR' }), true);
    assert.equal(isRetryableMessageSendError({ status: 'TIMEOUT_ERROR' }), true);
    assert.equal(isRetryableMessageSendError({ status: 400 }), false);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    assert.equal(isRetryableMessageSendError({ status: 400 }), true);

    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete globalThis.navigator;
    }
  });
});
