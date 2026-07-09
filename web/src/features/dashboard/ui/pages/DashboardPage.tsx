import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  BookOpen,
  Bookmark,
  BriefcaseBusiness,
  ChevronRight,
  Code2,
  FileText,
  Grid,
  Heart,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  Monitor,
  MonitorX,
  Moon,
  Plus,
  PlusSquare,
  Save,
  Settings,
  Shield,
  ShieldCheck,
  Sun,
  Trash2,
  UserPen,
  UserRound,
  UserStar,
  UserX,
  UsersRound,
  UserPlus,
} from 'lucide-react';

import ReportAProblemModal from '@/features/issues/ui/components/ReportAProblemModal';
import DashboardPostsPanel from '@/features/posts/ui/components/DashboardPostsPanel';
import PostComposerModal from '@/features/posts/ui/components/PostComposerModal';
import SavedCollectionsPanel from '@/features/saves/ui/components/SavedCollectionsPanel';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import DashboardAccountModal, { type DashboardAccountModalMode } from '../components/DashboardAccountModal';
import ContributionHeatmap from '../components/ContributionHeatmap';
import DashboardActivitiesModal, { type DashboardActivityType } from '../components/DashboardActivitiesModal';
import DashboardBlockedUsersModal from '../components/DashboardBlockedUsersModal';
import DashboardReportsModal from '../components/DashboardReportsModal';
import DashboardUserListModal, { type DashboardUserListType } from '../components/DashboardUserListModal';
import { useDashboardPage } from './useDashboardPage';

type DashboardTab = 'heatmap' | 'posts' | 'portfolio' | 'rooms' | 'more';
type MoreSection = 'display' | 'activities' | 'collections' | 'support' | 'privacy';

const dashboardTabs: Array<{ id: DashboardTab; label: string; icon: typeof Activity }> = [
  { id: 'heatmap', label: 'Activity', icon: Activity },
  { id: 'posts', label: 'Posts', icon: Grid },
  { id: 'portfolio', label: 'Portfolio', icon: UserPen },
  { id: 'rooms', label: 'Rooms', icon: Code2 },
  { id: 'more', label: 'More', icon: Settings },
];

const moreSections: Array<{ id: MoreSection; label: string; description: string; icon: typeof Monitor }> = [
  { id: 'display', label: 'Display', description: 'Theme preferences', icon: Monitor },
  { id: 'activities', label: 'Activities History', description: 'Your activity logs', icon: Activity },
  { id: 'collections', label: 'Collections', description: 'Saved posts', icon: Bookmark },
  { id: 'support', label: 'Support & Legal', description: 'Help and policies', icon: AlertCircle },
  { id: 'privacy', label: 'Privacy & Security', description: 'Account security', icon: Shield },
];

const getAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);

const SettingsRow = ({
  description,
  icon: Icon,
  onClick,
  title,
  tone = 'accent',
}: {
  description: string;
  icon: typeof Activity;
  onClick: () => void;
  title: string;
  tone?: 'accent' | 'danger';
}) => {
  const isDanger = tone === 'danger';

  return (
    <button type="button" onClick={onClick} className={isDanger ? 'settings-row settings-row--danger' : 'settings-row'}>
      <span className="settings-row__main">
        <span className="settings-row__icon"><Icon size={20} aria-hidden="true" /></span>
        <span>
          <strong>{title}</strong>
          <small>{description}</small>
        </span>
      </span>
      <ChevronRight size={20} aria-hidden="true" />
    </button>
  );
};

const ActivityCard = ({
  description,
  icon: Icon,
  onClick,
  title,
  tone = 'accent',
}: {
  description: string;
  icon: typeof Activity;
  onClick: () => void;
  title: string;
  tone?: 'accent' | 'danger';
}) => (
  <button type="button" onClick={onClick} className={tone === 'danger' ? 'activity-card activity-card--danger' : 'activity-card'}>
    <span className="activity-card__icon"><Icon size={20} aria-hidden="true" /></span>
    <strong>{title}</strong>
    <small>{description}</small>
  </button>
);

const DashboardPage = () => {
  const {
    addEducation,
    addExperience,
    generalForm,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleLogoutAllDevices,
    handleRemoveProfilePicture,
    handlePasswordSubmit,
    handleProfessionalSubmit,
    identityForm,
    isBusy,
    isLogoutAllLoading,
    isLogoutLoading,
    isPasswordUpdating,
    passwordForm,
    professionalForm,
    removeEducation,
    removeExperience,
    updateEducationField,
    updateExperienceField,
    updateGeneralField,
    updateIdentityField,
    updateIdentityFile,
    updatePasswordField,
    updateProfessionalField,
    user,
  } = useDashboardPage();

  const [activeTab, setActiveTab] = useState<DashboardTab>('heatmap');
  const [activeMoreSection, setActiveMoreSection] = useState<MoreSection>('display');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isComposerOpen, setComposerOpen] = useState(false);
  const [isProblemModalOpen, setProblemModalOpen] = useState(false);
  const [userListModal, setUserListModal] = useState<DashboardUserListType | null>(null);
  const [activityModal, setActivityModal] = useState<DashboardActivityType | null>(null);
  const [accountModal, setAccountModal] = useState<DashboardAccountModalMode | null>(null);
  const [isReportsModalOpen, setReportsModalOpen] = useState(false);
  const [isBlockedUsersModalOpen, setBlockedUsersModalOpen] = useState(false);
  const avatarUrl = getAvatarUrl(user?.profilePicture?.url);

  return (
    <main className="dashboard-v1-shell">
      <div className="dashboard-v1-container">
        <section className="dashboard-v1-header">
          <div className="dashboard-v1-header__top">
            <div className="dashboard-v1-user">
              <span className="dashboard-v1-avatar">
                {avatarUrl ? <img src={avatarUrl} alt={user?.userName || 'Profile'} /> : <UserRound size={34} aria-hidden="true" />}
              </span>
              <span className="dashboard-v1-user__copy">
                <small>Your Dashboard</small>
                <h1>{user?.userName || 'DevLoopFeed user'}</h1>
                <em><UserStar size={16} aria-hidden="true" />{Number(user?.profileContributions || 0)} contributions</em>
              </span>
            </div>

            <div className="dashboard-v1-stats" aria-label="Your profile stats">
              <button type="button" onClick={() => setUserListModal('followers')}><strong>{Number(user?.followersCount || 0)}</strong><span>Followers</span></button>
              <button type="button" onClick={() => setUserListModal('following')}><strong>{Number(user?.followingCount || 0)}</strong><span>Following</span></button>
              <button type="button" onClick={() => setActiveTab('heatmap')}><strong>{Number(user?.profileContributions || 0)}</strong><span>Contributions</span></button>
            </div>
          </div>

          <div className="dashboard-v1-header__actions">
            <Button variant="secondary" onClick={() => setActiveTab('portfolio')}><UserPen size={17} aria-hidden="true" />Edit Profile</Button>
            <Button onClick={() => setComposerOpen(true)}><PlusSquare size={17} aria-hidden="true" />Add Post</Button>
          </div>
        </section>

        <section className="dashboard-v1-tabs" aria-label="Dashboard sections">
          {dashboardTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={isActive ? 'dashboard-v1-tab is-active' : 'dashboard-v1-tab'}>
                <Icon size={17} aria-hidden="true" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </section>

        <section className="dashboard-v1-content">
          {activeTab === 'heatmap' && <ContributionHeatmap heatmap={user?.heatmap} />}

          {activeTab === 'posts' && <DashboardPostsPanel user={user} />}

          {activeTab === 'rooms' && (
            <div className="dashboard-v1-placeholder">
              <Code2 size={34} aria-hidden="true" />
              <h2>Your Rooms</h2>
              <p>Collaboration rooms will be restored with the collab module.</p>
            </div>
          )}

          {activeTab === 'portfolio' && (
            <div className="portfolio-v1-shell">
              <div className="portfolio-v1-info-card">
                <p className="state-panel__eyebrow">Portfolio</p>
                <h2>Build your public developer profile</h2>
                <p>Update profile identity, about, skills, experience, education, interests, and languages from focused sections.</p>
              </div>

              <div className="portfolio-v1-grid">
                <form className="profile-card" onSubmit={handleIdentitySubmit}>
                  <div className="profile-card__header"><h2>Identity</h2><p>Name and public profile image.</p></div>
                  <label className="field"><span>Name</span><Input value={identityForm.userName} onChange={updateIdentityField('userName')} placeholder="Your display name" /></label>
                  <label className="field"><span>Profile picture URL</span><Input value={identityForm.profilePictureUrl} onChange={updateIdentityField('profilePictureUrl')} placeholder="https://..." disabled={Boolean(identityForm.profilePictureFile)} /></label>
                  <label className="field"><span>Profile picture file</span><Input type="file" accept="image/*" onChange={updateIdentityFile} /></label>
                  {identityForm.profilePictureFile && <p className="empty-copy">Selected: {identityForm.profilePictureFile.name}</p>}
                  <div className="dashboard-actions dashboard-actions--compact">
                    <Button type="button" variant="secondary" onClick={handleRemoveProfilePicture}>Remove picture</Button>
                    <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save identity</Button>
                  </div>
                </form>

                <form className="profile-card" onSubmit={handleGeneralSubmit}>
                  <div className="profile-card__header"><h2>General Info</h2><p>Headline and about section.</p></div>
                  <label className="field"><span>Headline</span><Input value={generalForm.headline} onChange={updateGeneralField('headline')} placeholder="Full-stack developer" /></label>
                  <label className="field"><span>About</span><textarea className="input textarea" value={generalForm.about} onChange={updateGeneralField('about')} placeholder="Tell people what you are building." /></label>
                  <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save info</Button>
                </form>

                <form className="profile-card profile-card--wide" onSubmit={handleProfessionalSubmit}>
                  <div className="profile-card__header"><h2>Portfolio Details</h2><p>Skills, experience, education, interests, and languages.</p></div>
                  <label className="field"><span>Skills</span><Input value={professionalForm.skills} onChange={updateProfessionalField('skills')} placeholder="React, Node.js, MongoDB" /></label>
                  <div className="dashboard-array-editor">
                    <div className="dashboard-array-editor__header"><span><BriefcaseBusiness size={17} aria-hidden="true" />Experience</span><Button variant="secondary" onClick={addExperience}><Plus size={16} aria-hidden="true" />Add</Button></div>
                    {professionalForm.experiences.map((experience, index) => (
                      <div className="dashboard-array-editor__row" key={`experience-${index}`}>
                        <Input value={experience.companyName} onChange={updateExperienceField(index, 'companyName')} placeholder="Company or role" />
                        <Input value={experience.timePeriod} onChange={updateExperienceField(index, 'timePeriod')} placeholder="Jan 2024 - Present" />
                        <Button variant="ghost" className="button--icon" onClick={() => removeExperience(index)} aria-label="Remove experience"><Trash2 size={16} aria-hidden="true" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="dashboard-array-editor">
                    <div className="dashboard-array-editor__header"><span><BookOpen size={17} aria-hidden="true" />Education</span><Button variant="secondary" onClick={addEducation}><Plus size={16} aria-hidden="true" />Add</Button></div>
                    {professionalForm.educations.map((education, index) => (
                      <div className="dashboard-array-editor__row dashboard-array-editor__row--education" key={`education-${index}`}>
                        <Input value={education.collegeName} onChange={updateEducationField(index, 'collegeName')} placeholder="College" />
                        <Input value={education.course} onChange={updateEducationField(index, 'course')} placeholder="Course" />
                        <Input value={education.timePeriod} onChange={updateEducationField(index, 'timePeriod')} placeholder="2021 - 2025" />
                        <Button variant="ghost" className="button--icon" onClick={() => removeEducation(index)} aria-label="Remove education"><Trash2 size={16} aria-hidden="true" /></Button>
                      </div>
                    ))}
                  </div>
                  <label className="field"><span>Interests</span><Input value={professionalForm.interests} onChange={updateProfessionalField('interests')} placeholder="Open source, system design" /></label>
                  <label className="field"><span>Languages</span><Input value={professionalForm.languages} onChange={updateProfessionalField('languages')} placeholder="JavaScript, TypeScript" /></label>
                  <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save portfolio</Button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'more' && (
            <div className="more-v1-shell">
              <aside className="more-v1-menu">
                {moreSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeMoreSection === section.id;
                  return (
                    <button key={section.id} type="button" onClick={() => setActiveMoreSection(section.id)} className={isActive ? 'more-v1-menu__item is-active' : 'more-v1-menu__item'}>
                      <Icon size={20} aria-hidden="true" />
                      <span><strong>{section.label}</strong><small>{section.description}</small></span>
                    </button>
                  );
                })}
              </aside>

              <section className="more-v1-panel">
                {activeMoreSection === 'display' && (
                  <div className="more-v1-section">
                    <div><h2>Display</h2><p>Customize how DevLoop looks on your device.</p></div>
                    <button type="button" onClick={() => setIsDarkMode((current) => !current)} className="settings-row">
                      <span className="settings-row__main"><span className="settings-row__icon">{isDarkMode ? <Moon size={20} /> : <Sun size={20} />}</span><span><strong>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</strong><small>{isDarkMode ? 'Easy on the eyes in low light' : 'Bright and clear interface'}</small></span></span>
                      <span className={isDarkMode ? 'settings-toggle is-active' : 'settings-toggle'}><i /></span>
                    </button>
                  </div>
                )}

                {activeMoreSection === 'activities' && (
                  <div className="more-v1-section">
                    <div><h2>Activities History</h2><p>View your activity on DevLoop.</p></div>
                    <div className="activity-card-grid">
                      <ActivityCard icon={Heart} title="Likes" description="Posts you've liked" onClick={() => setActivityModal('likes')} tone="danger" />
                      <ActivityCard icon={MessageCircle} title="Comments" description="Your comment history" onClick={() => setActivityModal('comments')} />
                      <ActivityCard icon={UserPlus} title="Follows" description="People you follow" onClick={() => setActivityModal('follows')} />
                      <ActivityCard icon={MessageSquare} title="Feedbacks" description="Feedback you've sent" onClick={() => setActivityModal('feedbacks')} />
                    </div>
                  </div>
                )}

                {activeMoreSection === 'collections' && <SavedCollectionsPanel viewerId={user?._id} />}

                {activeMoreSection === 'support' && (
                  <div className="more-v1-section">
                    <div><h2>Support & Legal</h2><p>Get help and review policies.</p></div>
                    <SettingsRow icon={AlertCircle} title="Report a Bug" description="Let us know if something is not working" onClick={() => setProblemModalOpen(true)} />
                    <SettingsRow icon={ShieldCheck} title="Your Reports" description="Track reports you submitted" onClick={() => setReportsModalOpen(true)} />
                    <SettingsRow icon={FileText} title="Privacy Policy & Terms" description="Review policies and terms" onClick={() => setAccountModal('privacy')} />
                  </div>
                )}

                {activeMoreSection === 'privacy' && (
                  <div className="more-v1-section">
                    <div><h2>Privacy & Security</h2><p>Manage account security and privacy.</p></div>
                    <form className="settings-inline-form" onSubmit={handlePasswordSubmit}>
                      <div className="settings-inline-form__title"><KeyRound size={18} aria-hidden="true" /><strong>Change Password</strong></div>
                      <label className="field"><span>Current password</span><Input type="password" value={passwordForm.currentPassword} onChange={updatePasswordField('currentPassword')} placeholder="Current password" minLength={8} /></label>
                      <label className="field"><span>New password</span><Input type="password" value={passwordForm.newPassword} onChange={updatePasswordField('newPassword')} placeholder="New password" minLength={8} /></label>
                      <Button type="submit" disabled={isPasswordUpdating}><KeyRound size={18} aria-hidden="true" />Update password</Button>
                    </form>
                    <SettingsRow icon={UserX} title="Blocked Users" description="Manage blocked accounts" onClick={() => setBlockedUsersModalOpen(true)} tone="danger" />
                    <SettingsRow icon={LogOut} title={isLogoutLoading ? 'Logging Out...' : 'Log Out'} description="Sign out from this device" onClick={handleLogout} tone="danger" />
                    <SettingsRow icon={LogOut} title={isLogoutAllLoading ? 'Logging Out Everywhere...' : 'Log Out From All Devices'} description="End active sessions on every device" onClick={handleLogoutAllDevices} tone="danger" />
                    <SettingsRow icon={Trash2} title="Delete Account" description="Permanently delete your account and data" onClick={() => setAccountModal('delete')} tone="danger" />
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>

      <PostComposerModal isOpen={isComposerOpen} mode="create" onClose={() => setComposerOpen(false)} />
      <ReportAProblemModal isOpen={isProblemModalOpen} onClose={() => setProblemModalOpen(false)} />
      <DashboardUserListModal isOpen={Boolean(userListModal)} type={userListModal || 'followers'} userId={user?._id} onClose={() => setUserListModal(null)} />
      <DashboardActivitiesModal isOpen={Boolean(activityModal)} type={activityModal || 'likes'} onClose={() => setActivityModal(null)} />
      <DashboardReportsModal isOpen={isReportsModalOpen} onClose={() => setReportsModalOpen(false)} />
      <DashboardBlockedUsersModal isOpen={isBlockedUsersModalOpen} onClose={() => setBlockedUsersModalOpen(false)} />
      <DashboardAccountModal isOpen={Boolean(accountModal)} mode={accountModal || 'privacy'} onClose={() => setAccountModal(null)} />
    </main>
  );
};

export default DashboardPage;