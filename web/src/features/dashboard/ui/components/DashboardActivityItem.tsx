import { HeartOff, Loader2, MessageSquare, SendHorizontal, Trash2, UserMinus, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post } from '@/features/posts/model/post.types';

type DashboardActivityKind = 'likes' | 'comments' | 'follows' | 'feedbacks';
type ActivityRecord = Record<string, unknown>;

type DashboardActivityItemProps = {
  activity: unknown;
  isLoading: boolean;
  onAction: () => void;
  onNavigate: () => void;
  type: DashboardActivityKind;
};

const asRecord = (value: unknown): ActivityRecord | null => (
  typeof value === 'object' && value !== null ? value as ActivityRecord : null
);

const text = (value: unknown): string => (typeof value === 'string' ? value : '');

const PostPreview = ({ post, onNavigate }: { post: ActivityRecord | null; onNavigate: () => void }) => {
  const postId = text(post?._id);
  const caption = text(post?.caption) || 'Untitled post';
  const media = post ? getPostMedia(post as unknown as Post) : [];
  const firstMedia = media[0];

  const content = (
    <>
      <span className="activity-post-preview-v1__media">
        {firstMedia && isVideoMedia(firstMedia)
          ? <video src={firstMedia.url} muted preload="metadata" />
          : firstMedia ? <img src={firstMedia.url} alt="" /> : null}
      </span>
      <span>{caption}</span>
    </>
  );

  return postId ? (
    <Link to={`/post/${postId}`} onClick={onNavigate} className="activity-post-preview-v1">{content}</Link>
  ) : (
    <span className="activity-post-preview-v1">{content}</span>
  );
};

const ActionButton = ({ children, icon: Icon, isLoading, onClick }: {
  children?: string;
  icon: typeof Trash2;
  isLoading: boolean;
  onClick: () => void;
}) => (
  <button type="button" className={children ? 'activity-action-v1' : 'activity-action-v1 is-icon'} onClick={onClick} disabled={isLoading}>
    {isLoading ? <Loader2 className="spin" size={14} aria-hidden="true" /> : <Icon size={14} aria-hidden="true" />}
    {children}
  </button>
);

const DashboardActivityItem = ({ activity, isLoading, onAction, onNavigate, type }: DashboardActivityItemProps) => {
  const record = asRecord(activity);
  const post = asRecord(record?.post);

  if (type === 'likes') {
    return (
      <article className="activity-liked-v1">
        <PostPreview post={post} onNavigate={onNavigate} />
        <footer><ActionButton icon={HeartOff} isLoading={isLoading} onClick={onAction} /></footer>
      </article>
    );
  }

  if (type === 'comments') {
    const parent = asRecord(record?.parentComment);
    const parentUser = asRecord(parent?.user);
    return (
      <article className="activity-comment-v1">
        <PostPreview post={post} onNavigate={onNavigate} />
        <div>
          <p>{parent ? `Replied${text(parentUser?.userName) ? ` to @${text(parentUser?.userName)}` : ''}` : 'Comment'}</p>
          {text(parent?.comment) && <blockquote>{text(parent?.comment)}</blockquote>}
          <span>{text(record?.comment) || 'Comment activity'}</span>
          <footer><ActionButton icon={Trash2} isLoading={isLoading} onClick={onAction} /></footer>
        </div>
      </article>
    );
  }

  if (type === 'follows') {
    const following = asRecord(record?.following);
    const userId = text(following?._id);
    const avatar = text(asRecord(following?.profilePicture)?.url);
    const content = (
      <>
        <i>{avatar ? <img src={avatar} alt="" /> : <UserRound size={20} aria-hidden="true" />}</i>
        <span><strong>{text(following?.userName) || 'Developer'}</strong><small>{text(following?.headline) || 'DevLoopFeed member'}</small></span>
      </>
    );
    return (
      <article className="activity-follow-v1">
        {userId ? <Link to={`/profile/${userId}`} onClick={onNavigate}>{content}</Link> : <span>{content}</span>}
        <ActionButton icon={UserMinus} isLoading={isLoading} onClick={onAction}>Unfollow</ActionButton>
      </article>
    );
  }

  const feedbackOn = asRecord(record?.feedbackOn);
  const details = asRecord(record?.feedbackDetails);
  const targetType = text(feedbackOn?.type);
  const targetId = text(details?._id);
  const detailMedia = details ? getPostMedia(details as unknown as Post) : [];
  const image = detailMedia[0];
  const targetLink = targetId ? (targetType === 'User' ? `/profile/${targetId}` : `/post/${targetId}`) : '';

  return (
    <article className="activity-feedback-v1">
      <header>
        <p><SendHorizontal size={14} aria-hidden="true" />{targetType === 'User' ? 'Feedback on profile' : 'Feedback on post'}</p>
        <span>{text(record?.text) || 'No feedback text'}</span>
        <ActionButton icon={Trash2} isLoading={isLoading} onClick={onAction}>Delete Feedback</ActionButton>
      </header>
      {details && (
        targetLink ? (
          <Link to={targetLink} onClick={onNavigate} className="activity-feedback-v1__target">
            <i>
              {targetType === 'User'
                ? text(asRecord(details.profilePicture)?.url) ? <img src={text(asRecord(details.profilePicture)?.url)} alt="" /> : <UserRound size={20} />
                : image ? <img src={image.url} alt="" /> : <MessageSquare size={20} />}
            </i>
            <span><strong>{targetType === 'User' ? text(details.userName) || 'Profile' : text(details.caption) || 'Untitled post'}</strong><small>{targetType === 'User' ? 'Profile feedback' : 'Post feedback'}</small></span>
          </Link>
        ) : null
      )}
    </article>
  );
};

export default DashboardActivityItem;
export type { DashboardActivityKind };
