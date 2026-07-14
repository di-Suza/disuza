import { Code2, ImagePlus, Link2, Loader2, MoreHorizontal, Plus, Send, Trash2, UserRound, Video, X } from 'lucide-react';
import { memo, useId, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';
import { usePostComposer } from '../hooks/usePostComposer';

type ComposerPanel = 'code' | 'link' | 'more' | null;

const InlinePostComposer = () => {
  const fileInputId = useId();
  const user = useAppSelector((state) => state.auth.user);
  const avatarUrl = user?.profilePicture?.url;
  const [activePanel, setActivePanel] = useState<ComposerPanel>(null);
  const {
    addLink,
    caption,
    codeSnippet,
    handleFilesChange,
    handleSubmit,
    hasComposerContent,
    isProjectPost,
    isSubmitting,
    links,
    mediaItems,
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
  } = usePostComposer({ isOpen: true, mode: 'create', onClose: () => undefined });

  const openLinkPanel = () => {
    if (links.length === 0) addLink();
    setActivePanel((current) => (current === 'link' ? null : 'link'));
  };

  const closePanel = () => setActivePanel(null);
  const hasProjectLinks = isProjectPost && Boolean(projectLinks.liveDemoUrl.trim() || projectLinks.repositoryUrl.trim());
  const visibleLinks = links.filter((link) => link.label.trim() && link.url.trim());

  return (
    <form className="inline-post-composer" onSubmit={handleSubmit}>
      <div className="inline-post-composer__main">
        <span className="inline-post-composer__avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <UserRound size={22} aria-hidden="true" />}
        </span>
        <textarea
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="What are you building?"
          maxLength={2200}
          aria-label="Post text"
        />
      </div>

      {(visibleLinks.length > 0 || codeSnippet.code.trim() || hasProjectLinks) && (
        <div className="inline-post-composer__attachments">
          {visibleLinks.map((link) => (
            <button type="button" key={link.id} onClick={() => setActivePanel('link')}>
              <Link2 size={14} aria-hidden="true" />
              {link.label}
            </button>
          ))}
          {codeSnippet.code.trim() && (
            <button type="button" onClick={() => setActivePanel('code')}>
              <Code2 size={14} aria-hidden="true" />
              {codeSnippet.language.trim() || 'Code'}
            </button>
          )}
          {hasProjectLinks && (
            <button type="button" onClick={() => setActivePanel('more')}>
              <Link2 size={14} aria-hidden="true" />
              Project links
            </button>
          )}
        </div>
      )}

      {mediaItems.length > 0 && (
        <div className="inline-post-composer__media">
          {mediaItems.map((item, index) => (
            <article key={item.id}>
              {item.mediaType === 'video' ? <video src={item.previewUrl} muted preload="metadata" /> : <img src={item.previewUrl} alt={`Preview ${index + 1}`} />}
              <span>{index + 1}</span>
              <button type="button" onClick={() => removeMedia(item.id)} aria-label="Remove media">
                <X size={14} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      )}

      {activePanel && (
        <section className="inline-post-composer__tool-modal" aria-label="Post tool options">
          <button type="button" className="inline-post-composer__tool-close" onClick={closePanel} aria-label="Close tool options">
            <X size={16} aria-hidden="true" />
          </button>

          {activePanel === 'code' && (
            <>
              <header>
                <Code2 size={17} aria-hidden="true" />
                <span>Code snippet</span>
              </header>
              <Input
                value={codeSnippet.language}
                onChange={(event) => updateCodeSnippet('language', event.target.value)}
                placeholder="Language, e.g. tsx"
                aria-label="Code language"
              />
              <textarea
                className="inline-post-composer__code"
                value={codeSnippet.code}
                onChange={(event) => updateCodeSnippet('code', event.target.value)}
                placeholder="Paste code here..."
                rows={7}
                aria-label="Code snippet"
              />
            </>
          )}

          {activePanel === 'link' && (
            <>
              <header>
                <Link2 size={17} aria-hidden="true" />
                <span>Links</span>
                <Button variant="ghost" onClick={addLink}>
                  <Plus size={15} aria-hidden="true" />
                  Add
                </Button>
              </header>
              <div className="inline-post-composer__link-list">
                {links.map((link) => (
                  <div className="inline-post-composer__link-row" key={link.id}>
                    <Input value={link.label} onChange={(event) => updateLink(link.id, 'label', event.target.value)} placeholder="Label" aria-label="Link label" />
                    <Input type="url" value={link.url} onChange={(event) => updateLink(link.id, 'url', event.target.value)} placeholder="https://example.com" aria-label="Link URL" />
                    <Button variant="ghost" className="button--icon" onClick={() => removeLink(link.id)} aria-label="Remove link">
                      <Trash2 size={15} aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {activePanel === 'more' && (
            <>
              <header>
                <MoreHorizontal size={17} aria-hidden="true" />
                <span>More options</span>
              </header>
              <section className="inline-post-composer__project-block">
                <label className="inline-post-composer__toggle-row">
                  <span>
                    <strong>Project post</strong>
                    <small>Live demo and GitHub links required</small>
                  </span>
                  <span className={isProjectPost ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                    <input type="checkbox" checked={isProjectPost} onChange={(event) => setIsProjectPost(event.target.checked)} />
                    <i />
                  </span>
                </label>
                {isProjectPost && (
                  <div className="inline-post-composer__project-fields">
                    <Input type="url" value={projectLinks.liveDemoUrl} onChange={updateProjectLink('liveDemoUrl')} placeholder="Live demo URL" aria-label="Live demo URL" />
                    <Input type="url" value={projectLinks.repositoryUrl} onChange={updateProjectLink('repositoryUrl')} placeholder="GitHub repository URL" aria-label="GitHub repository URL" />
                  </div>
                )}
              </section>
              <label className="inline-post-composer__toggle-row">
                <span>
                  <strong>Hide like count</strong>
                  <small>Only you can see likes</small>
                </span>
                <span className={settings.hideLikesCount ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                  <input type="checkbox" checked={settings.hideLikesCount} onChange={updateSetting('hideLikesCount')} />
                  <i />
                </span>
              </label>
              <label className="inline-post-composer__toggle-row">
                <span>
                  <strong>Turn off comments</strong>
                  <small>Hide comment action on this post</small>
                </span>
                <span className={settings.commentsDisabled ? 'post-composer-v1__switch is-active' : 'post-composer-v1__switch'}>
                  <input type="checkbox" checked={settings.commentsDisabled} onChange={updateSetting('commentsDisabled')} />
                  <i />
                </span>
              </label>
            </>
          )}
        </section>
      )}

      <footer className="inline-post-composer__footer">
        <div className="inline-post-composer__tools">
          <label htmlFor={fileInputId} title="Add image or video" aria-label="Add image or video">
            <ImagePlus size={19} aria-hidden="true" />
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
          <button type="button" title="Add code" aria-label="Add code" className={cn(activePanel === 'code' && 'is-active')} onClick={() => setActivePanel((current) => (current === 'code' ? null : 'code'))}>
            <Code2 size={19} aria-hidden="true" />
          </button>
          <button type="button" title="Add link" aria-label="Add link" className={cn(activePanel === 'link' && 'is-active')} onClick={openLinkPanel}>
            <Link2 size={19} aria-hidden="true" />
          </button>
          <button type="button" title="More options" aria-label="More options" className={cn((activePanel === 'more' || isProjectPost || settings.hideLikesCount || settings.commentsDisabled) && 'is-active')} onClick={() => setActivePanel((current) => (current === 'more' ? null : 'more'))}>
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
          {mediaItems.some((item) => item.mediaType === 'video') && <span><Video size={16} aria-hidden="true" />Video ready</span>}
        </div>

        <Button type="submit" disabled={isSubmitting || !hasComposerContent}>
          {isSubmitting ? <Loader2 className="spin" size={17} aria-hidden="true" /> : <Send size={17} aria-hidden="true" />}
          Post
        </Button>
      </footer>
    </form>
  );
};

export default memo(InlinePostComposer);
