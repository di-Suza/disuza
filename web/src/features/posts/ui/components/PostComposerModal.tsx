import {
  ArrowLeft,
  ArrowRight,
  Braces,
  ChevronDown,
  ChevronUp,
  Code2,
  GitFork,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Send,
  Settings,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { memo, useId, useState } from 'react';

import type { Post } from '@/features/posts/model/post.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';
import { type PostComposerMode, usePostComposer } from '../hooks/usePostComposer';
import '../posts.css';

type PostComposerModalProps = {
  isOpen: boolean;
  mode: PostComposerMode;
  onClose: () => void;
  post?: Post | null;
  isPostLoading?: boolean;
};

const PostComposerModal = ({ isOpen, isPostLoading = false, mode, onClose, post }: PostComposerModalProps) => {
  const fileInputId = useId();
  const projectToggleId = `${fileInputId}-project-toggle`;
  const liveDemoInputId = `${fileInputId}-project-live-demo`;
  const repositoryInputId = `${fileInputId}-project-repository`;
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const {
    addLink,
    canEditProjectLinks,
    caption,
    closeComposer,
    codeSnippet,
    handleFilesChange,
    handleSubmit,
    hasComposerContent,
    isEditMode,
    isEditingProjectPost,
    isProjectPost,
    isSubmitting,
    links,
    mediaItems,
    mediaSummary,
    moveMedia,
    projectLinks,
    removeLink,
    removeMedia,
    setCaption,
    setIsProjectPost,
    settings,
    updateCodeSnippet,
    updateLink,
    updateProjectLink,
    updateSetting,
  } = usePostComposer({ isOpen, mode, onClose, post });

  if (!isOpen) return null;

  const submitLabel = isSubmitting ? 'Saving...' : isEditMode ? 'Save changes' : 'Post';
  const projectLinksRequired = canEditProjectLinks && (isProjectPost || isEditingProjectPost);
  const isPostEnabled = !isSubmitting && (isEditMode || hasComposerContent);

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
                  <label htmlFor={`${fileInputId}-caption`}>What are you building?</label>
                  <span>{caption.length}/2200</span>
                </div>
                <textarea
                  id={`${fileInputId}-caption`}
                  className="post-composer-v1__caption"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={2200}
                  rows={4}
                  placeholder="Share text, code, links, media, or project updates..."
                />
              </section>

              {(!isEditMode || projectLinksRequired) && (
                <section className="post-composer-v1__project">
                  <label>
                    <span className="post-composer-v1__project-main">
                      <span><Code2 size={17} aria-hidden="true" /></span>
                      <span><strong>Is project post</strong><small>Requires live link and GitHub repo link before posting</small></span>
                    </span>
                    {!isEditMode && (
                      <span className={isProjectPost ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                        <input
                          id={projectToggleId}
                          type="checkbox"
                          checked={isProjectPost}
                          onChange={(event) => setIsProjectPost(event.target.checked)}
                          aria-label="Project post"
                        />
                        <i />
                      </span>
                    )}
                  </label>

                  {projectLinksRequired && (
                    <div className="post-composer-v1__links">
                      <label>
                        <span>Live Link *</span>
                        <span className="post-composer-v1__input-icon"><Link2 size={16} aria-hidden="true" /></span>
                        <Input
                          id={liveDemoInputId}
                          type="url"
                          value={projectLinks.liveDemoUrl}
                          onChange={updateProjectLink('liveDemoUrl')}
                          placeholder="https://your-demo.com"
                          required={projectLinksRequired}
                        />
                      </label>
                      <label>
                        <span>GitHub Repo Link *</span>
                        <span className="post-composer-v1__input-icon"><GitFork size={16} aria-hidden="true" /></span>
                        <Input
                          id={repositoryInputId}
                          type="url"
                          value={projectLinks.repositoryUrl}
                          onChange={updateProjectLink('repositoryUrl')}
                          placeholder="https://github.com/username/repo"
                          required={projectLinksRequired}
                        />
                      </label>
                    </div>
                  )}
                </section>
              )}

              <section>
                <div className="post-composer-v1__section-heading">
                  <label>Media</label>
                  <small>{mediaSummary} selected</small>
                </div>
                <label className={cn('post-composer-v1__upload-zone', mediaItems.length >= 10 && 'is-disabled')} htmlFor={fileInputId}>
                  <span><ImagePlus size={20} aria-hidden="true" /></span>
                  <strong>{mediaItems.length >= 10 ? 'Maximum media reached' : 'Upload image or video'}</strong>
                  <small>Optional. Up to 10 items, editable order.</small>
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

              <section className="post-composer-v1__rich-block">
                <div className="post-composer-v1__section-heading">
                  <label><Braces size={16} aria-hidden="true" /> Code</label>
                  <small>Optional snippet</small>
                </div>
                <div className="post-composer-v1__code-grid">
                  <Input
                    value={codeSnippet.language}
                    onChange={(event) => updateCodeSnippet('language', event.target.value)}
                    placeholder="Language, e.g. tsx"
                    aria-label="Code language"
                  />
                  <textarea
                    value={codeSnippet.code}
                    onChange={(event) => updateCodeSnippet('code', event.target.value)}
                    placeholder="Paste code here..."
                    aria-label="Code snippet"
                    rows={7}
                  />
                </div>
              </section>

              <section className="post-composer-v1__rich-block">
                <div className="post-composer-v1__section-heading">
                  <label><Link2 size={16} aria-hidden="true" /> Links</label>
                  <Button variant="ghost" className="post-composer-v1__mini-action" onClick={addLink}>
                    <Plus size={15} aria-hidden="true" />
                    Add link
                  </Button>
                </div>
                {links.length > 0 ? (
                  <div className="post-composer-v1__extra-links">
                    {links.map((link) => (
                      <div className="post-composer-v1__extra-link-row" key={link.id}>
                        <Input value={link.label} onChange={(event) => updateLink(link.id, 'label', event.target.value)} placeholder="Label" aria-label="Link label" />
                        <Input type="url" value={link.url} onChange={(event) => updateLink(link.id, 'url', event.target.value)} placeholder="https://example.com" aria-label="Link URL" />
                        <Button variant="ghost" className="button--icon" onClick={() => removeLink(link.id)} aria-label="Remove link">
                          <Trash2 size={15} aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="post-composer-v1__hint">Add a label and URL when you want to attach a resource.</p>
                )}
              </section>
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
