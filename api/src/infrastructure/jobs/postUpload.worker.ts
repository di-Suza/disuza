import logger from '../../config/logger.js';

type PostUploadJob = {
  id: string;
  run: () => Promise<void>;
};

class PostUploadWorker {
  private readonly concurrency = 2;
  private readonly queue: PostUploadJob[] = [];
  private activeJobs = 0;

  enqueue(job: PostUploadJob): void {
    this.queue.push(job);
    queueMicrotask(() => this.drain());
  }

  private drain(): void {
    while (this.activeJobs < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) return;

      this.activeJobs += 1;
      void job.run()
        .catch((error) => {
          logger.error({ error, jobId: job.id }, 'Post upload job failed');
        })
        .finally(() => {
          this.activeJobs = Math.max(0, this.activeJobs - 1);
          this.drain();
        });
    }
  }
}

const postUploadWorker = new PostUploadWorker();

export { PostUploadWorker, type PostUploadJob };
export default postUploadWorker;
