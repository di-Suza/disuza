export { default as logger } from '../../config/logger.js';

type ObservabilityContext = Readonly<{
  requestId?: string;
  userId?: string;
  sessionId?: string;
  module?: string;
  resourceId?: string;
  jobId?: string;
}>;

const createObservabilityContext = (context: ObservabilityContext): ObservabilityContext => ({
  ...context,
});

export { createObservabilityContext };
export type { ObservabilityContext };
