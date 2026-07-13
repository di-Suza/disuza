import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, Code2, GitFork, ImagePlus, Link2, Loader2, Send, Settings, Trash2, Video, X } from 'lucide-react';
import { memo, useId, useState } from 'react';

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
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
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
  const isPostEnabled = !isSubmitting && (isEditMode || mediaItems.length > 0);

  return (
    <div className="modal-backdrop post-composer-v1-backdrop" role="dialog" aria-modal="true" aria-label={isEditMode ? 'Edit post' : 'Create post'}>
      <section className="post-composer-v1">
        {isPostLoading ? (
          <div className="post-composer__loading">
            <Loader2 className="spin" aria-hidden="true" />
            <p>Loading post...</p>
          </div>
        ) : (
          <form className="post-composer-v1__form" onSubmit={handleSubmit}>
            <Button variant="ghost" className="button--icon post-composer-v1__close" onClick={closeComposer} aria-label="Close composer">
              <X size={18} aria-hidden="true" />
            </Button>

            <header className="post-composer-v1__header">
              <span className="post-composer-v1__header-icon">
                <ImagePlus size={20} aria-hidden="true" />
              </span>
              <span>
                <p>{isEditMode ? 'Edit' : 'Create'}</p>
                <h3>{isEditMode ? 'Edit Post' : 'Add Post'}</h3>
              </span>
            </header>

            <div className="post-composer-v1__body">
              <section className="post-composer-v1__caption-card">
                <div>
                  <label htmlFor={`${fileInputId}-caption`}>Caption</label>
                  <span>{caption.length} chars</span>
                </div>
              <textarea
                  id={`${fileInputId}-caption`}
                  className="post-composer-v1__caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                maxLength={2200}
                  rows={4}
                  placeholder="Share what you built, learned, or shipped..."
              />
              </section>

              <section>
                <div className="post-composer-v1__section-heading">
                  <label>Media <span>*</span></label>
                  <small>{mediaSummary} selected</small>
                </div>
                <label className={cn('post-composer-v1__upload-zone', mediaItems.length >= 10 && 'is-disabled')} htmlFor={fileInputId}>
                  <span><ImagePlus size={20} aria-hidden="true" /></span>
                  <strong>{mediaItems.length >= 10 ? 'Maximum media reached' : 'Upload post media'}</strong>
                  <small>Images or videos. Up to 10 items.</small>
                </label>
              <input
                id={fileInputId}
                className="visually-hidden"
                type="file"
                accept="image/*,video/*"
                multiple
                  disabled={mediaItems.length >= 10}
                onChange={handleFilesChange}
              />

                {mediaItems.length > 0 && (
                  <div className="post-composer-v1__media-grid">
                    {mediaItems.map((item, index) => (
                      <article className="post-composer-v1__media-item" key={item.id}>
                        {item.mediaType === 'video' ? (
                          <video src={item.previewUrl} muted preload="metadata" />
                        ) : (
                          <img src={item.previewUrl} alt={`Preview ${index + 1}`} />
                        )}
                        <span className="post-composer-v1__media-order">{index + 1}</span>
                        <span className="post-composer-v1__media-type" aria-hidden="true">
                          {item.mediaType === 'video' ? <Video size={14} /> : <ImagePlus size={14} />}
                        </span>
                        <div className="post-composer-v1__media-actions">
                          <Button variant="ghost" className="button--icon" onClick={() => moveMedia(item.id, -1)} disabled={index === 0} aria-label="Move media left">
                            <ArrowLeft size={15} aria-hidden="true" />
                          </Button>
                          <Button variant="ghost" className="button--icon" onClick={() => moveMedia(item.id, 1)} disabled={index === mediaItems.length - 1} aria-label="Move media right">
                            <ArrowRight size={15} aria-hidden="true" />
                          </Button>
                          <Button variant="danger" className="button--icon" onClick={() => removeMedia(item.id)} aria-label="Remove media">
                            <Trash2 size={15} aria-hidden="true" />
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {(!isEditMode || showProjectLinks) && (
                <section className="post-composer-v1__project">
                  <label>
                    <span className="post-composer-v1__project-main">
                      <span><Code2 size={17} aria-hidden="true" /></span>
                      <span><strong>Project post</strong><small>Add repository and live demo links</small></span>
                    </span>
                    {!isEditMode && (
                      <span className={isProjectPost ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                        <input type="checkbox" checked={isProjectPost} onChange={(event) => setIsProjectPost(event.target.checked)} />
                        <i />
                      </span>
                    )}
                  </label>

            {showProjectLinks && (
                    <div className="post-composer-v1__links">
                      <label>
                        <span>Live Demo Link</span>
                        <span className="post-composer-v1__input-icon"><Link2 size={16} aria-hidden="true" /></span>
                        <Input type="url" value={projectLinks.liveDemoUrl} onChange={updateProjectLink('liveDemoUrl')} placeholder="https://your-demo.com" />
                      </label>
                      <label>
                        <span>GitHub Repository Link</span>
                        <span className="post-composer-v1__input-icon"><GitFork size={16} aria-hidden="true" /></span>
                        <Input type="url" value={projectLinks.repositoryUrl} onChange={updateProjectLink('repositoryUrl')} placeholder="https://github.com/username/repo" />
                      </label>
                    </div>
            )}
                </section>
            )}
            </div>

            <footer className="post-composer-v1__footer">
              <div className="post-composer-v1__advanced">
                <button type="button" onClick={() => setShowAdvancedSettings((value) => !value)}>
                  <Settings size={16} aria-hidden="true" />
                  Advanced
                  {showAdvancedSettings ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                </button>

                {showAdvancedSettings && (
                  <div className="post-composer-v1__advanced-menu">
                    <h3>Advanced Options</h3>
                    <label>
                      <span>Hide like count</span>
                      <span className={settings.hideLikesCount ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                        <input type="checkbox" checked={settings.hideLikesCount} onChange={updateSetting('hideLikesCount')} />
                        <i />
                      </span>
                    </label>
                    <label>
                      <span>Turn off commenting</span>
                      <span className={settings.commentsDisabled ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                        <input type="checkbox" checked={settings.commentsDisabled} onChange={updateSetting('commentsDisabled')} />
                        <i />
                      </span>
                    </label>
                  </div>
                )}
              </div>

              <Button type="submit" disabled={!isPostEnabled}>
                {isSubmitting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
                {submitLabel}
              </Button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
};

export default memo(PostComposerModal);
