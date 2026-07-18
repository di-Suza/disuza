import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cn } from '../dist-tests/shared/utils/cn.js';
import { getErrorMessage } from '../dist-tests/shared/utils/getErrorMessage.js';
import { getOptimizedImage } from '../dist-tests/shared/utils/getOptimizedImage.js';
import { isStrongEnoughPassword, isValidEmail } from '../dist-tests/shared/utils/authValidation.js';

describe('Shared frontend helpers', () => {
  it('joins only truthy class names', () => {
    assert.equal(cn('button', false, null, undefined, 'is-active'), 'button is-active');
  });

  it('normalizes API error messages with fallbacks', () => {
    assert.equal(getErrorMessage({ data: { message: 'Bad request' } }), 'Bad request');
    assert.equal(getErrorMessage({ message: 'Network failed' }), 'Network failed');
    assert.equal(getErrorMessage(null, 'Fallback'), 'Fallback');
  });

  it('adds imagekit transformations without changing external images', () => {
    const optimizedUrl = getOptimizedImage('https://ik.imagekit.io/demo/avatar.png', 'avatarSmall');
    assert.equal(new URL(optimizedUrl).searchParams.get('tr'), 'w-96,h-96,c-maintain_ratio,q-68');
    assert.equal(getOptimizedImage('https://example.com/image.png', 'avatar'), 'https://example.com/image.png');
    assert.equal(getOptimizedImage('not a url', 'post'), 'not a url');
  });

  it('validates auth form primitives', () => {
    assert.equal(isValidEmail(' user@example.com '), true);
    assert.equal(isValidEmail('bad-email'), false);
    assert.equal(isStrongEnoughPassword('12345678'), true);
    assert.equal(isStrongEnoughPassword('short'), false);
  });
});
