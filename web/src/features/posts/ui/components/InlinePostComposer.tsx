import { Braces, Code2, GitFork, ImagePlus, Link2, Loader2, Plus, Send, Trash2, UserRound, Video, X } from 'lucide-react';
import { memo, useId, useState } from 'react';

import { useAppSelector } from '@/app/store/hooks';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { cn } from '@/shared/utils/cn';
import { usePostComposer } from '../hooks/usePostComposer';

type ComposerPanel = 'code' | 'link' | 'project' | null;

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
    updateCodeSnippet,
    updateLink,
    updateProjectLink,
  } = usePostComposer({ isOpen: true, mode: 'create', onClose: () => undefined });

  const openLinkPanel = () => {
    if (links.length === 0) addLink();
    setActivePanel((current) => (current === 'link' ? null : 'link'));
  };

  const openProjectPanel = () => {
    setIsProjectPost(!isProjectPost);
    setActivePanel((current) => (current === 'project' && isProjectPost ? null : 'project'));
  };

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
          rows={2}
          aria-label="Post text"
        />
      </div>

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

      {activePanel === 'code' && (
        <section className="inline-post-composer__panel">
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
            rows={6}
            aria-label="Code snippet"
          />
        </section>
      )}

      {activePanel === 'link' && (
        <section className="inline-post-composer__panel">
          <div className="inline-post-composer__panel-title">
            <span>Extra links</span>
            <Button variant="ghost" onClick={addLink}><Plus size={15} aria-hidden="true" />Add</Button>
          </div>
          {links.map((link) => (
            <div className="inline-post-composer__link-row" key={link.id}>
              <Input value={link.label} onChange={(event) => updateLink(link.id, 'label', event.target.value)} placeholder="Label" aria-label="Link label" />
              <Input type="url" value={link.url} onChange={(event) => updateLink(link.id, 'url', event.target.value)} placeholder="https://example.com" aria-label="Link URL" />
              <Button variant="ghost" className="button--icon" onClick={() => removeLink(link.id)} aria-label="Remove link">
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </section>
      )}

      {activePanel === 'project' && (
        <section className="inline-post-composer__panel">
          <div className="inline-post-composer__panel-title">
            <span>Project links</span>
            <small>Live demo and GitHub are required for project posts.</small>
          </div>
          <div className="inline-post-composer__link-row">
            <Input type="url" value={projectLinks.liveDemoUrl} onChange={updateProjectLink('liveDemoUrl')} placeholder="Live demo URL" aria-label="Live demo URL" />
            <Input type="url" value={projectLinks.repositoryUrl} onChange={updateProjectLink('repositoryUrl')} placeholder="GitHub repository URL" aria-label="GitHub repository URL" />
          </div>
        </section>
      )}

      <footer className="inline-post-composer__footer">
        <div className="inline-post-composer__tools">
          <label htmlFor={fileInputId}>
            <ImagePlus size={18} aria-hidden="true" />
            Image
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
          <button type="button" className={cn(activePanel === 'code' && 'is-active')} onClick={() => setActivePanel((current) => (current === 'code' ? null : 'code'))}>
            <Braces size={18} aria-hidden="true" />
            Code
          </button>
          <button type="button" className={cn(isProjectPost && 'is-active')} onClick={openProjectPanel}>
            <Code2 size={18} aria-hidden="true" />
            Project
          </button>
          <button type="button" className={cn(activePanel === 'link' && 'is-active')} onClick={openLinkPanel}>
            <Link2 size={18} aria-hidden="true" />
            Link
          </button>
          {mediaItems.some((item) => item.mediaType === 'video') && <span><Video size={16} aria-hidden="true" />Video ready</span>}
          {isProjectPost && <span><GitFork size={16} aria-hidden="true" />Project</span>}
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
