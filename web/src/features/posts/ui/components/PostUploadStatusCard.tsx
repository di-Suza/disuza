import { Loader2, UploadCloud } from 'lucide-react';
import { memo } from 'react';

import type { Post } from '@/features/posts/model/post.types';
import type { PostUploadTask } from '@/features/posts/state/postUploadSlice';
import { cn } from '@/shared/utils/cn';
import '../posts.css';

type PostUploadStatusCardProps = {
  post?: Post;
  task?: PostUploadTask;
};

const getStatusText = (status?: string) => {
  if (status === 'failed') return 'Upload failed';
  return 'Uploading';
};

const PostUploadStatusCard = ({ post, task }: PostUploadStatusCardProps) => {
  const uploadState = post?.uploadState;
  const status = task?.status || uploadState?.status;
  const progress = Math.min(100, Math.max(0, Number(task?.progress ?? uploadState?.progress ?? 0)));
  const mediaCount = task?.mediaCount ?? uploadState?.mediaCount ?? 0;
  const caption = task?.caption || post?.caption || '';
  const error = task?.error || uploadState?.error;
  const isFailed = status === 'failed';

  return (
    <article className={cn('post-upload-status-card', isFailed && 'is-failed')} aria-live="polite">
      <div className="post-upload-status-card__icon">
        {isFailed ? <UploadCloud size={20} aria-hidden="true" /> : <Loader2 className="spin" size={20} aria-hidden="true" />}
      </div>
      <div className="post-upload-status-card__body">
        <div className="post-upload-status-card__meta">
          <strong>{getStatusText(status)}</strong>
          {mediaCount > 0 && <span>{mediaCount} media item{mediaCount === 1 ? '' : 's'}</span>}
        </div>
        {caption.trim() && <p>{caption.trim()}</p>}
        {isFailed && error && <small>{error}</small>}
        <div className="post-upload-status-card__track">
          <i style={progress > 0 ? { width: `${progress}%` } : undefined} />
        </div>
      </div>
    </article>
  );
};

export default memo(PostUploadStatusCard);
