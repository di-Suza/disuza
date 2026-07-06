import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Save, Trash2, Video, X } from 'lucide-react';
import { memo, useId } from 'react';

import type { Post } from '@/features/posts/model/post.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';
import { type PostComposerMode, usePostComposer } from '../hooks/usePostComposer';

type PostComposerModalProps = {
  isOpen: boolean;
  mode: PostComposerMode;
  onClose: () => void;
  post?: Post | null;
  isPostLoading?: boolean;
};

const PostComposerModal = ({ isOpen, isPostLoading = false, mode, onClose, post }: PostComposerModalProps) => {
  const fileInputId = useId();
  const {
    canEditProjectLinks,
    caption,
    closeComposer,
    handleFilesChange,
    handleSubmit,
    isEditMode,
    isEditingProjectPost,
    isProjectPost,
    isSubmitting,
    mediaItems,
    mediaSummary,
    moveMedia,
    projectLinks,
    removeMedia,
    setCaption,
    setIsProjectPost,
    settings,
    updateProjectLink,
    updateSetting,
  } = usePostComposer({ isOpen, mode, onClose, post });

  if (!isOpen) return null;

  const submitLabel = isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Create post';
  const showProjectLinks = canEditProjectLinks && (isProjectPost || isEditingProjectPost);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={isEditMode ? 'Edit post' : 'Create post'}>
      <section className="modal-card post-composer">
        <div className="modal-card__header post-composer__header">
          <div>
            <p className="state-panel__eyebrow">{isEditMode ? 'Edit' : 'Post'}</p>
            <h1>{isEditMode ? 'Edit post' : 'Create post'}</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={closeComposer} aria-label="Close composer">
            <X size={20} aria-hidden="true" />
          </Button>
        </div>

        {isPostLoading ? (
          <div className="post-composer__loading">
            <Loader2 className="spin" aria-hidden="true" />
            <p>Loading post...</p>
          </div>
        ) : (
          <form className="post-composer__form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Caption</span>
              <textarea
                className="input textarea post-composer__caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
                placeholder="Share what you built, learned, or shipped."
              />
            </label>

            <div className="post-composer__toolbar">
              <span>{mediaSummary} media</span>
              <label className="button button--secondary post-composer__upload" htmlFor={fileInputId}>
                <ImagePlus size={18} aria-hidden="true" />
                Add media
              </label>
              <input
                id={fileInputId}
                className="visually-hidden"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFilesChange}
              />
            </div>

            <div className={cn('post-composer__media-grid', mediaItems.length === 0 && 'post-composer__media-grid--empty')}>
              {mediaItems.length === 0 && <p className="empty-copy">No media selected.</p>}
              {mediaItems.map((item, index) => (
                <article className="post-composer__media-item" key={item.id}>
                  <span className="post-composer__media-order">{index + 1}</span>
                  {item.mediaType === 'video' ? (
                    <video src={item.previewUrl} muted preload="metadata" />
                  ) : (
                    <img src={item.previewUrl} alt="Selected media" />
                  )}
                  <span className="post-composer__media-type" aria-hidden="true">
                    {item.mediaType === 'video' ? <Video size={15} /> : <ImagePlus size={15} />}
                  </span>
                  <div className="post-composer__media-actions">
                    <Button variant="ghost" className="button--icon" onClick={() => moveMedia(item.id, -1)} disabled={index === 0} aria-label="Move media left">
                      <ArrowLeft size={16} aria-hidden="true" />
                    </Button>
                    <Button variant="ghost" className="button--icon" onClick={() => moveMedia(item.id, 1)} disabled={index === mediaItems.length - 1} aria-label="Move media right">
                      <ArrowRight size={16} aria-hidden="true" />
                    </Button>
                    <Button variant="danger" className="button--icon" onClick={() => removeMedia(item.id)} aria-label="Remove media">
                      <Trash2 size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>

            <div className="post-composer__settings">
              {!isEditMode && (
                <label className="toggle-row">
                  <input type="checkbox" checked={isProjectPost} onChange={(event) => setIsProjectPost(event.target.checked)} />
                  <span>Project post</span>
                </label>
              )}
              <label className="toggle-row">
                <input type="checkbox" checked={settings.hideLikesCount} onChange={updateSetting('hideLikesCount')} />
                <span>Hide likes count</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={settings.commentsDisabled} onChange={updateSetting('commentsDisabled')} />
                <span>Disable comments</span>
              </label>
            </div>

            {showProjectLinks && (
              <div className="post-composer__links">
                <label className="field">
                  <span>Live demo URL</span>
                  <Input value={projectLinks.liveDemoUrl} onChange={updateProjectLink('liveDemoUrl')} placeholder="https://..." />
                </label>
                <label className="field">
                  <span>Repository URL</span>
                  <Input value={projectLinks.repositoryUrl} onChange={updateProjectLink('repositoryUrl')} placeholder="https://github.com/..." />
                </label>
              </div>
            )}

            <div className="post-composer__footer">
              <Button variant="secondary" onClick={closeComposer}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save size={18} aria-hidden="true" />
                {submitLabel}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default memo(PostComposerModal);