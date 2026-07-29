import {
  BookOpen,
  Briefcase,
  Calendar,
  Code2,
  ExternalLink,
  GraduationCap,
  Heart,
  Languages,
  Link2,
  MapPin,
  MoreVertical,
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
import ProfilePostsSection from '@/features/posts/ui/components/ProfilePostsSection';
import type { PortfolioHandle, UserProfile } from '@/features/users/model/user.types';
import AvatarImage from '@/shared/components/Avatar/AvatarImage';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';
import ContributionHeatmap from './ContributionHeatmap';
import '@/features/profile/ui/pages/ProfilePage.css';

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

const toExternalHref = (link: string): string => {
  if (/^https?:\/\//i.test(link)) return link;
  return `https://${link.replace(/^[a-z][a-z\d+\-.]*:\/\//i, '')}`;
};

const listOfHandles = (value: unknown): PortfolioHandle[] => (
  Array.isArray(value)
    ? value
      .map((item) => (typeof item === 'object' && item !== null ? item as Partial<PortfolioHandle> : {}))
      .map((handle) => ({
        label: typeof handle.label === 'string' ? handle.label.trim() : '',
        link: typeof handle.link === 'string' ? toExternalHref(handle.link.trim()) : '',
      }))
      .filter((handle): handle is PortfolioHandle => Boolean(handle.label && handle.link))
    : []
);

const formatAddress = (address: UserProfile['address']): string => (
  [address?.city, address?.state, address?.country]
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean)
    .join(', ')
);

const PreviewSection = ({ children, icon: Icon, spacious = false, title }: PreviewSectionProps) => (
  <section className={spacious ? 'profile-preview-section is-spacious' : 'profile-preview-section'}>
    <header>
      <span><Icon size={20} aria-hidden="true" /></span>
      <h2>{title}</h2>
    </header>
    {children}
  </section>
);

const PreviewStat = ({ icon: Icon, label, value }: { icon?: LucideIcon; label: string; value: number }) => (
  <span className="profile-preview-stat">
    <span>{Icon && <Icon size={16} aria-hidden="true" />}<small>{label}</small></span>
    <strong>{value}</strong>
  </span>
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
  const handles = listOfHandles(user.handles);
  const interests = listOfStrings(user.interests);
  const languages = listOfStrings(user.languages);
  const experiences = Array.isArray(user.experiences) ? [...user.experiences].reverse() : [];
  const educations = Array.isArray(user.educations) ? [...user.educations].reverse() : [];
  const avatar = typeof user.profilePicture?.url === 'string' && user.profilePicture.url.trim() ? user.profilePicture.url : null;
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
            <LoadingSpinner className="portfolio-preview-v1__state" label="Loading preview" />
          ) : isError ? (
            <div className="portfolio-preview-v1__state">
              <p>Preview could not be loaded.</p>
              <button type="button" onClick={() => refetch()}><RefreshCw size={16} />Retry</button>
            </div>
          ) : (
            <div className="portfolio-preview-v1__content dashboard-panel dashboard-panel--wide profile-page-panel">
              <section className="profile-preview-header">
                <div className="profile-preview-header__top">
                  <span className="profile-preview-header__avatar-wrap">
                    <span className="profile-preview-header__avatar">
                      <AvatarImage
                        src={avatar}
                        imageType="avatar"
                        alt={user.userName}
                        fallback={<UserRound size={42} aria-hidden="true" />}
                      />
                    </span>
                  </span>
                  <div className="profile-preview-header__main">
                    <div className="profile-preview-header__title-row">
                      <div>
                        <h1>{user.userName}</h1>
                      </div>
                      <div className="profile-hero__menu" aria-hidden="true">
                        <span className="profile-hero__menu-button">
                          <MoreVertical size={18} aria-hidden="true" />
                        </span>
                      </div>
                    </div>
                    <div className="profile-preview-header__headline">{user.headline || 'Disuza developer'}</div>
                    {address && <div className="profile-preview-header__address"><MapPin size={14} aria-hidden="true" />{address}</div>}
                    <div className="profile-preview-header__stats">
                      <PreviewStat label="Posts" value={Number(user.postsCount || posts.length)} />
                      <PreviewStat icon={Users} label="Followers" value={Number(user.followersCount || 0)} />
                      <PreviewStat icon={UserCheck} label="Following" value={Number(user.followingCount || 0)} />
                      <PreviewStat icon={Star} label="Score" value={Number(user.profileContributions || 0)} />
                    </div>
                  </div>
                </div>
                <div className="profile-preview-header__actions">
                  <Button disabled><UserPlus size={16} aria-hidden="true" />Follow</Button>
                  <Button variant="secondary" disabled><SendHorizontal size={16} aria-hidden="true" />Send Feedback</Button>
                </div>
              </section>

              <div className="profile-preview-content">
                <section className="profile-preview-heatmap"><ContributionHeatmap heatmap={user.heatmap} /></section>

                {user.about && (
                  <PreviewSection icon={User} title="About"><p className="profile-copy">{user.about}</p></PreviewSection>
                )}

                {skills.length > 0 && (
                  <PreviewSection icon={Code2} title="Skills"><div className="chip-list">{skills.map((skill) => <span key={skill}>{skill}</span>)}</div></PreviewSection>
                )}

                {handles.length > 0 && (
                  <PreviewSection icon={Link2} title="Handles">
                    <div className="chip-list chip-list--links">
                      {handles.map((handle, index) => (
                        <a key={`${handle.label}-${index}`} href={handle.link} target="_blank" rel="noreferrer">
                          {handle.label}
                          <ExternalLink size={13} aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </PreviewSection>
                )}

                <ProfilePostsSection disableSeeAll normalPosts={normalPosts} projectPosts={projectPosts} profileUser={user} />

                {experiences.length > 0 && (
                  <PreviewSection icon={Briefcase} spacious title="Experience">
                    <div className="profile-timeline-list">
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
                    <div className="profile-timeline-list">
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
                  <PreviewSection icon={Languages} title="Languages"><div className="chip-list">{languages.map((language) => <span key={language}>{language}</span>)}</div></PreviewSection>
                )}

                {interests.length > 0 && (
                  <PreviewSection icon={Heart} title="Interests"><div className="chip-list">{interests.map((interest) => <span key={interest}>{interest}</span>)}</div></PreviewSection>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default DashboardPortfolioPreviewModal;
