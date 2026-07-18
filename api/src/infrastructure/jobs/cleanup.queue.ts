import { createHash } from 'node:crypto';
import { Queue, type JobsOptions } from 'bullmq';

import redisCache from '../cache/redis.js';

const cleanupJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: true,
  removeOnFail: false,
};

type PostCleanupData = {
  postId: string;
  userId: string;
};

type UserCleanupData = {
  userId: string;
  email?: string;
  profilePicture?: {
    url?: string;
    fileId?: string;
  };
};

type ConversationCleanupData = {
  conversationId: string;
};

type MediaCleanupData = {
  fileIds: string[];
  reason?: string;
};

class CleanupQueue {
  private postQueue?: Queue;
  private userQueue?: Queue;
  private conversationQueue?: Queue;
  private mediaQueue?: Queue;

  private getPostQueue() {
    this.postQueue ??= new Queue('post-cleanup', { connection: redisCache.getConnectionOptions() as never });
    return this.postQueue;
  }

  private getUserQueue() {
    this.userQueue ??= new Queue('user-cleanup', { connection: redisCache.getConnectionOptions() as never });
    return this.userQueue;
  }

  private getConversationQueue() {
    this.conversationQueue ??= new Queue('conversation-cleanup', { connection: redisCache.getConnectionOptions() as never });
    return this.conversationQueue;
  }

  private getMediaQueue() {
    this.mediaQueue ??= new Queue('media-cleanup', { connection: redisCache.getConnectionOptions() as never });
    return this.mediaQueue;
  }

  private getMediaCleanupJobId(fileIds: string[]): string {
    const hash = createHash('sha1')
      .update([...fileIds].sort().join(':'))
      .digest('hex');

    return `media-cleanup-${hash}`;
  }

  private async addUnique(queue: Queue, name: string, jobId: string, data: unknown): Promise<boolean> {
    const existingJob = await queue.getJob(jobId);

    if (existingJob) {
      const state = await existingJob.getState();

      if (state === 'failed') {
        await existingJob.remove();
      } else {
        return false;
      }
    }

    await queue.add(name, data, { ...cleanupJobOptions, jobId });
    return true;
  }

  enqueuePostCleanup(data: PostCleanupData) {
    return this.addUnique(this.getPostQueue(), 'post-cleanup', `post-cleanup-${data.postId}`, data);
  }

  enqueueUserCleanup(data: UserCleanupData) {
    return this.addUnique(this.getUserQueue(), 'user-cleanup', `user-cleanup-${data.userId}`, data);
  }

  enqueueConversationCleanup(data: ConversationCleanupData) {
    return this.addUnique(
      this.getConversationQueue(),
      'conversation-cleanup',
      `conversation-cleanup-${data.conversationId}`,
      data,
    );
  }

  enqueueMediaCleanup(data: MediaCleanupData) {
    if (data.fileIds.length === 0) return Promise.resolve(false);

    return this.addUnique(
      this.getMediaQueue(),
      'media-cleanup',
      this.getMediaCleanupJobId(data.fileIds),
      data,
    );
  }
}

const cleanupQueue = new CleanupQueue();

export {
  CleanupQueue,
  type ConversationCleanupData,
  type MediaCleanupData,
  type PostCleanupData,
  type UserCleanupData,
};
export default cleanupQueue;
