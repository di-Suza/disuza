import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MediaService } from '../src/modules/media/media.service.js';

describe('MediaService', () => {
  it('identifies managed file ids and ignores external placeholders during deletes', async () => {
    const media = new MediaService();

    assert.equal(media.isManagedFileId('0'), false);
    assert.equal(media.isManagedFileId('external'), false);
    assert.equal(media.isManagedFileId('file-id'), true);
    await media.deleteMany(['0', 'external']);
  });

  it('returns false instead of throwing when best-effort deletion fails', async () => {
    const media = new MediaService();
    Object.assign(media, {
      client: {
        files: {
          delete: async () => {
            throw new Error('storage down');
          },
        },
      },
    });

    assert.equal(await media.tryDeleteFile('managed-file'), false);
  });
});
