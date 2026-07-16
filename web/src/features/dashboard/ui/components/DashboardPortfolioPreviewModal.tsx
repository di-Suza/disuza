import {
  BookOpen,
  Briefcase,
  Calendar,
  Code2,
  Eye,
  GraduationCap,
  Grid2X2,
  Heart,
  Languages,
  Loader2,
  MapPin,
  MessageCircle,
  Play,
  RefreshCw,
  SendHorizontal,
  Star,
  User,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useGetAllPostsQuery } from '@/features/posts/api/post.api';
import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { Post } from '@/features/posts/model/post.types';
import type { UserProfile } from '@/features/users/model/user.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';
import ContributionHeatmap from './ContributionHeatmap';

type DashboardPortfolioPreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
};

type PreviewSectionProps = {
  children: ReactNode;
  icon: LucideIcon;
  spacious?: boolean;
  title: string;
};

const listOfStrings = (value: unknown): string[] => (
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())) : []
);

const formatAddress = (address: UserProfile['address']): string => (
  [address?.city, address?.state, address?.country]
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .join(', ')
);

const PreviewSection = ({ children, icon: Icon, spacious = false, title }: PreviewSectionProps) => (
  <section className={spacious ? 'portfolio-preview-profile-section is-spacious' : 'portfolio-preview-profile-section'}>
    <header>
      <span><Icon size={20} aria-hidden="true" /></span>
      <h2>{title}</h2>
    </header>
    {children}
  </section>
);

const PreviewStat = ({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: number }) => (
  <span className="portfolio-preview-profile-stat">
    <span>{Icon && <Icon size={16} aria-hidden="true" />}<small>{label}</small></span>
    <strong>{value}</strong>
  </span>
);

const PreviewPostCard = ({ post }: { post: Post }) => {
  const media = getPostMedia(post);
  const firstMedia = media[0];

  return (
    <article className="dashboard-post-preview-card portfolio-preview-post-v1">
      <span className="dashboard-post-preview-card__media">
        {firstMedia && isVideoMedia(firstMedia) ? (
          <><video src={firstMedia.url} preload="metadata" muted /><i><Play size={14} aria-hidden="true" /></i></>
        ) : firstMedia ? (
          <img src={firstMedia.url} alt="Post" loading="lazy" />
        ) : null}
        <em><Eye size={14} aria-hidden="true" /></em>
      </span>
      <span className="dashboard-post-preview-card__body">
        <strong>{post.caption || 'Untitled post'}</strong>
        <small>
          <span><Heart size={12} aria-hidden="true" />{Number(post.counts?.likes || 0)}</span>
          <span><MessageCircle size={12} aria-hidden="true" />{Number(post.counts?.comments || 0)}</span>
        </small>
      </span>
    </article>
  );
};

const PreviewPostSection = ({ icon, posts, title }: { icon: LucideIcon; posts: Post[]; title: string }) => (
  <PreviewSection icon={icon} spacious title={title}>
    <div className="portfolio-preview-profile-gallery">
      {posts.map((post) => <PreviewPostCard key={post._id} post={post} />)}
    </div>
  </PreviewSection>
);

const DashboardPortfolioPreviewModal = ({ isOpen, onClose, user }: DashboardPortfolioPreviewModalProps) => {
  const { data, isError, isLoading, refetch } = useGetAllPostsQuery(
    { page: 1, limit: 20 },
    { skip: !isOpen },
  );

  useLockBodyScroll(isOpen);

  if (!isOpen || !user) return null;

  const posts = data?.posts || [];
  const projectPosts = posts.filter((post) => post.isProjectPost === true);
  const normalPosts = posts.filter((post) => post.isProjectPost !== true);
  const skills = listOfStrings(user.skills);
  const interests = listOfStrings(user.interests);
  const languages = listOfStrings(user.languages);
  const experiences = Array.isArray(user.experiences) ? [...user.experiences].reverse() : [];
  const educations = Array.isArray(user.educations) ? [...user.educations].reverse() : [];
  const avatar = typeof user.profilePicture?.url === 'string' && user.profilePicture.url.trim()
    ? user.profilePicture.url
    : null;
  const address = formatAddress(user.address);

  return createPortal(
    <div className="portfolio-preview-v1-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <section className="portfolio-preview-v1" onMouseDown={(event) => event.stopPropagation()}>
        <header className="portfolio-preview-v1__bar">
          <div><p>Portfolio Preview</p><h2>How your profile appears to others</h2></div>
          <button type="button" onClick={onClose} aria-label="Close portfolio preview"><X size={20} aria-hidden="true" /></button>
        </header>

        <div className="portfolio-preview-v1__scroll">
          {isLoading ? (
            <div className="portfolio-preview-v1__state"><Loader2 className="spin" size={22} aria-hidden="true" /><span>Loading preview...</span></div>
          ) : isError ? (
            <div className="portfolio-preview-v1__state">
              <p>Preview could not be loaded.</p>
              <button type="button" onClick={() => refetch()}><RefreshCw size={16} />Retry</button>
            </div>
          ) : (
            <div className="portfolio-preview-v1__content">
              <section className="portfolio-preview-profile-header">
                <div className="portfolio-preview-profile-header__top">
                  <span className="portfolio-preview-profile-header__avatar-wrap">
                    <span className="portfolio-preview-profile-header__avatar">
                      {avatar ? <img src={avatar} alt={user.userName} /> : <UserRound size={42} aria-hidden="true" />}
                    </span>
                  </span>
                  <div className="portfolio-preview-profile-header__main">
                    <p>Developer Profile</p>
                    <h1>{user.userName}</h1>
                    {user.headline && <div className="portfolio-preview-profile-header__headline">{user.headline}</div>}
                    {address && <div className="portfolio-preview-profile-header__address"><MapPin size={14} aria-hidden="true" />{address}</div>}
                    <div className="portfolio-preview-profile-header__stats">
                      <PreviewStat label="Posts" value={Number(user.postsCount || posts.length)} />
                      <PreviewStat icon={Users} label="Followers" value={Number(user.followersCount || 0)} />
                      <PreviewStat icon={UserCheck} label="Following" value={Number(user.followingCount || 0)} />
                      <PreviewStat icon={Star} label="Score" value={Number(user.profileContributions || 0)} />
                    </div>
                  </div>
                </div>
                <div className="portfolio-preview-profile-header__actions">
                  <Button disabled><UserPlus size={16} aria-hidden="true" />Follow</Button>
                  <Button variant="secondary" disabled><SendHorizontal size={16} aria-hidden="true" />Send Feedback</Button>
                </div>
              </section>

              <section className="portfolio-preview-heatmap-v1"><ContributionHeatmap heatmap={user.heatmap} /></section>

              {user.about && (
                <PreviewSection icon={User} title="About"><p className="portfolio-preview-profile-copy">{user.about}</p></PreviewSection>
              )}

              {skills.length > 0 && (
                <PreviewSection icon={Code2} title="Skills"><div className="portfolio-preview-profile-chips">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></PreviewSection>
              )}

              {projectPosts.length > 0 && <PreviewPostSection icon={Briefcase} posts={projectPosts} title="Projects" />}
              {normalPosts.length > 0 && <PreviewPostSection icon={Grid2X2} posts={normalPosts} title="All Posts" />}

              {experiences.length > 0 && (
                <PreviewSection icon={Briefcase} spacious title="Experience">
                  <div className="portfolio-preview-profile-timeline">
                    {experiences.map((experience, index) => (
                      <article key={`${experience.companyName}-${index}`}>
                        <i><Briefcase size={16} aria-hidden="true" /></i>
                        <span>
                          <strong>{experience.companyName}</strong>
                          {experience.role && <small><Briefcase size={14} aria-hidden="true" />{experience.role}</small>}
                          <small className="is-pill"><Calendar size={14} aria-hidden="true" />{experience.timePeriod}</small>
                        </span>
                      </article>
                    ))}
                  </div>
                </PreviewSection>
              )}

              {educations.length > 0 && (
                <PreviewSection icon={GraduationCap} spacious title="Education">
                  <div className="portfolio-preview-profile-timeline">
                    {educations.map((education, index) => (
                      <article key={`${education.collegeName}-${index}`}>
                        <i><GraduationCap size={16} aria-hidden="true" /></i>
                        <span>
                          <strong>{education.collegeName}</strong>
                          <small><BookOpen size={14} aria-hidden="true" />{education.course}</small>
                          <small className="is-pill"><Calendar size={14} aria-hidden="true" />{education.timePeriod}</small>
                        </span>
                      </article>
                    ))}
                  </div>
                </PreviewSection>
              )}

              {languages.length > 0 && (
                <PreviewSection icon={Languages} title="Languages"><div className="portfolio-preview-profile-chips">{languages.map((language) => <span key={language}>{language}</span>)}</div></PreviewSection>
              )}

              {interests.length > 0 && (
                <PreviewSection icon={Heart} title="Interests"><div className="portfolio-preview-profile-chips">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div></PreviewSection>
              )}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardPortfolioPreviewModal;
