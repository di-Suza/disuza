import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { HealthService } from '../../src/modules/health/health.service.js';

describe('HealthService', () => {
  it('returns an operational health payload', () => {
    const health = new HealthService().getHealth();

    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'devloopfeed-api');
    assert.ok(Date.parse(health.timestamp) > 0);
  });
});
