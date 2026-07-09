import { useState } from 'react';
import {
  Activity,
  AlertCircle,
  Ban,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  FileText,
  Heart,
  KeyRound,
  LockOpen,
  LogOut,
  MessageCircle,
  MonitorX,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import ReportAProblemModal from '@/features/issues/ui/components/ReportAProblemModal';
import DashboardPostsPanel from '@/features/posts/ui/components/DashboardPostsPanel';
import SavedCollectionsPanel from '@/features/saves/ui/components/SavedCollectionsPanel';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import DashboardAccountModal, { type DashboardAccountModalMode } from '../components/DashboardAccountModal';
import DashboardActivitiesModal, { type DashboardActivityType } from '../components/DashboardActivitiesModal';
import DashboardBlockedUsersModal from '../components/DashboardBlockedUsersModal';
import DashboardReportsModal from '../components/DashboardReportsModal';
import DashboardUserListModal, { type DashboardUserListType } from '../components/DashboardUserListModal';
import { useDashboardPage } from './useDashboardPage';

const getAvatarUrl = (url: unknown): string | null => (typeof url === 'string' && url.trim() ? url : null);

const DashboardPage = () => {
  const {
    addEducation,
    addExperience,
    blockedUsers,
    generalForm,
    handleFollowRecommendation,
    handleGeneralSubmit,
    handleIdentitySubmit,
    handleLogout,
    handleLogoutAllDevices,
    handlePasswordSubmit,
    handleProfessionalSubmit,
    handleUnblockUser,
    identityForm,
    isBlockedUsersFetching,
    isBusy,
    isFollowing,
    isLogoutAllLoading,
    isLogoutLoading,
    isPasswordUpdating,
    isRecommendationsFetching,
    isUnblocking,
    passwordForm,
    professionalForm,
    recommendations,
    removeEducation,
    removeExperience,
    updateEducationField,
    updateExperienceField,
    updateGeneralField,
    updateIdentityField,
    updatePasswordField,
    updateProfessionalField,
    user,
  } = useDashboardPage();

  const [isProblemModalOpen, setProblemModalOpen] = useState(false);
  const [userListModal, setUserListModal] = useState<DashboardUserListType | null>(null);
  const [activityModal, setActivityModal] = useState<DashboardActivityType | null>(null);
  const [accountModal, setAccountModal] = useState<DashboardAccountModalMode | null>(null);
  const [isReportsModalOpen, setReportsModalOpen] = useState(false);
  const [isBlockedUsersModalOpen, setBlockedUsersModalOpen] = useState(false);
  const avatarUrl = getAvatarUrl(user?.profilePicture?.url);

  return (
    <main className="dashboard-shell dashboard-shell--wide">
      <section className="dashboard-panel dashboard-panel--wide">
        <div className="dashboard-profile dashboard-profile--stacked">
          <span className="dashboard-profile__avatar dashboard-profile__avatar--image">
            {avatarUrl ? <img src={avatarUrl} alt={user?.userName || 'Profile'} /> : <UserRound size={32} aria-hidden="true" />}
          </span>
          <div>
            <p className="state-panel__eyebrow">Dashboard</p>
            <h1>{user?.userName || 'DevLoopFeed user'}</h1>
            <p>{user?.email}</p>
          </div>
        </div>

        <div className="dashboard-actions dashboard-actions--top">
          <Link to="/home" className="button button--secondary">Feed</Link>
          <Link to="/search" className="button button--secondary"><Search size={18} aria-hidden="true" />Search</Link>
          <Link to="/notifications" className="button button--secondary"><Bell size={18} aria-hidden="true" />Notifications</Link>
        </div>

        <div className="profile-stats" aria-label="Your profile stats">
          <button type="button" onClick={() => setUserListModal('followers')}>
            <strong>{Number(user?.followersCount || 0)}</strong><span>Followers</span>
          </button>
          <button type="button" onClick={() => setUserListModal('following')}>
            <strong>{Number(user?.followingCount || 0)}</strong><span>Following</span>
          </button>
          <article><strong>{Number(user?.profileContributions || 0)}</strong><span>Contributions</span></article>
        </div>

        <DashboardPostsPanel user={user} />
        <SavedCollectionsPanel viewerId={user?._id} />

        <section className="profile-card dashboard-manager-card">
          <div className="profile-card__header">
            <h2>Activity and Settings</h2>
            <p>Recent account activity, reports, privacy, and safety controls.</p>
          </div>
          <div className="dashboard-settings-grid">
            <Button variant="secondary" onClick={() => setActivityModal('likes')}><Heart size={17} aria-hidden="true" />Likes</Button>
            <Button variant="secondary" onClick={() => setActivityModal('follows')}><UserPlus size={17} aria-hidden="true" />Follows</Button>
            <Button variant="secondary" onClick={() => setActivityModal('comments')}><MessageCircle size={17} aria-hidden="true" />Comments</Button>
            <Button variant="secondary" onClick={() => setActivityModal('feedbacks')}><Activity size={17} aria-hidden="true" />Feedback</Button>
            <Button variant="secondary" onClick={() => setReportsModalOpen(true)}><FileText size={17} aria-hidden="true" />Your reports</Button>
            <Button variant="secondary" onClick={() => setBlockedUsersModalOpen(true)}><Ban size={17} aria-hidden="true" />Blocked users</Button>
            <Button variant="secondary" onClick={() => setAccountModal('privacy')}><Shield size={17} aria-hidden="true" />Privacy</Button>
            <Button variant="danger" onClick={() => setAccountModal('delete')}><Trash2 size={17} aria-hidden="true" />Delete account</Button>
          </div>
        </section>

        <div className="dashboard-grid">
          <form className="profile-card" onSubmit={handleIdentitySubmit}>
            <div className="profile-card__header">
              <h2>Identity</h2>
              <p>Name and public profile image URL.</p>
            </div>
            <label className="field">
              <span>Name</span>
              <Input value={identityForm.userName} onChange={updateIdentityField('userName')} placeholder="Your display name" />
            </label>
            <label className="field">
              <span>Profile picture URL</span>
              <Input value={identityForm.profilePictureUrl} onChange={updateIdentityField('profilePictureUrl')} placeholder="https://..." />
            </label>
            <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save identity</Button>
          </form>

          <form className="profile-card" onSubmit={handleGeneralSubmit}>
            <div className="profile-card__header">
              <h2>General Info</h2>
              <p>Headline and about section for your profile.</p>
            </div>
            <label className="field">
              <span>Headline</span>
              <Input value={generalForm.headline} onChange={updateGeneralField('headline')} placeholder="Full-stack developer" />
            </label>
            <label className="field">
              <span>About</span>
              <textarea className="input textarea" value={generalForm.about} onChange={updateGeneralField('about')} placeholder="Tell people what you are building." />
            </label>
            <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save info</Button>
          </form>

          <form className="profile-card profile-card--wide" onSubmit={handleProfessionalSubmit}>
            <div className="profile-card__header">
              <h2>Portfolio</h2>
              <p>Skills, experience, education, interests, and languages.</p>
            </div>
            <label className="field">
              <span>Skills</span>
              <Input value={professionalForm.skills} onChange={updateProfessionalField('skills')} placeholder="React, Node.js, MongoDB" />
            </label>
            <div className="dashboard-array-editor">
              <div className="dashboard-array-editor__header">
                <span><BriefcaseBusiness size={17} aria-hidden="true" />Experience</span>
                <Button variant="secondary" onClick={addExperience}><Plus size={16} aria-hidden="true" />Add</Button>
              </div>
              {professionalForm.experiences.map((experience, index) => (
                <div className="dashboard-array-editor__row" key={`experience-${index}`}>
                  <Input value={experience.companyName} onChange={updateExperienceField(index, 'companyName')} placeholder="Company or role" />
                  <Input value={experience.timePeriod} onChange={updateExperienceField(index, 'timePeriod')} placeholder="Jan 2024 - Present" />
                  <Button variant="ghost" className="button--icon" onClick={() => removeExperience(index)} aria-label="Remove experience">
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="dashboard-array-editor">
              <div className="dashboard-array-editor__header">
                <span><BookOpen size={17} aria-hidden="true" />Education</span>
                <Button variant="secondary" onClick={addEducation}><Plus size={16} aria-hidden="true" />Add</Button>
              </div>
              {professionalForm.educations.map((education, index) => (
                <div className="dashboard-array-editor__row dashboard-array-editor__row--education" key={`education-${index}`}>
                  <Input value={education.collegeName} onChange={updateEducationField(index, 'collegeName')} placeholder="College" />
                  <Input value={education.course} onChange={updateEducationField(index, 'course')} placeholder="Course" />
                  <Input value={education.timePeriod} onChange={updateEducationField(index, 'timePeriod')} placeholder="2021 - 2025" />
                  <Button variant="ghost" className="button--icon" onClick={() => removeEducation(index)} aria-label="Remove education">
                    <Trash2 size={16} aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
            <label className="field">
              <span>Interests</span>
              <Input value={professionalForm.interests} onChange={updateProfessionalField('interests')} placeholder="Open source, system design" />
            </label>
            <label className="field">
              <span>Languages</span>
              <Input value={professionalForm.languages} onChange={updateProfessionalField('languages')} placeholder="JavaScript, TypeScript" />
            </label>
            <Button type="submit" disabled={isBusy}><Save size={18} aria-hidden="true" />Save portfolio</Button>
          </form>

          <form className="profile-card" onSubmit={handlePasswordSubmit}>
            <div className="profile-card__header">
              <h2>Password</h2>
              <p>Change password for non-Google accounts.</p>
            </div>
            <label className="field">
              <span>Current password</span>
              <Input type="password" value={passwordForm.currentPassword} onChange={updatePasswordField('currentPassword')} placeholder="Current password" minLength={8} />
            </label>
            <label className="field">
              <span>New password</span>
              <Input type="password" value={passwordForm.newPassword} onChange={updatePasswordField('newPassword')} placeholder="New password" minLength={8} />
            </label>
            <Button type="submit" disabled={isPasswordUpdating}><KeyRound size={18} aria-hidden="true" />Update password</Button>
          </form>
        </div>

        <div className="dashboard-grid dashboard-grid--secondary">
          <section className="profile-card">
            <div className="profile-card__header">
              <h2>Recommended Developers</h2>
              <p>{isRecommendationsFetching ? 'Refreshing recommendations...' : 'People you may want to follow.'}</p>
            </div>
            <div className="user-list">
              {recommendations.length === 0 && <p className="empty-copy">No recommendations yet.</p>}
              {recommendations.map((recommendedUser) => (
                <article className="user-row" key={recommendedUser._id}>
                  <Link to={`/profile/${recommendedUser._id}`} className="user-row__main">
                    <span className="user-row__avatar">{getAvatarUrl(recommendedUser.profilePicture?.url) ? <img src={recommendedUser.profilePicture?.url} alt="" /> : <UserRound size={18} />}</span>
                    <span><strong>{recommendedUser.userName}</strong><small>{recommendedUser.headline || 'DevLoopFeed member'}</small></span>
                  </Link>
                  <Button variant="secondary" onClick={() => handleFollowRecommendation(recommendedUser._id)} disabled={isFollowing}>
                    <UserPlus size={16} aria-hidden="true" />Follow
                  </Button>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card__header">
              <h2>Blocked Users</h2>
              <p>{isBlockedUsersFetching ? 'Loading blocked users...' : 'Manage blocked profiles.'}</p>
            </div>
            <div className="user-list">
              {blockedUsers.length === 0 && <p className="empty-copy">No blocked users.</p>}
              {blockedUsers.map((item) => item.blockedUser && (
                <article className="user-row" key={item._id}>
                  <Link to={`/profile/${item.blockedUser._id}`} className="user-row__main">
                    <span className="user-row__avatar">{getAvatarUrl(item.blockedUser.profilePicture?.url) ? <img src={item.blockedUser.profilePicture?.url} alt="" /> : <UserRound size={18} />}</span>
                    <span><strong>{item.blockedUser.userName}</strong><small>{item.blockedUser.headline || 'Blocked profile'}</small></span>
                  </Link>
                  <Button variant="secondary" onClick={() => handleUnblockUser(item.blockedUser!._id)} disabled={isUnblocking}>
                    <LockOpen size={16} aria-hidden="true" />Unblock
                  </Button>
                </article>
              ))}
            </div>
          </section>
        </div>

        <div className="dashboard-actions dashboard-actions--footer">
          <Button variant="secondary" onClick={() => setProblemModalOpen(true)}>
            <AlertCircle size={18} aria-hidden="true" />
            Report a problem
          </Button>
          <Button variant="secondary" onClick={handleLogout} disabled={isLogoutLoading || isLogoutAllLoading}>
            <LogOut size={18} aria-hidden="true" />
            {isLogoutLoading ? 'Logging out...' : 'Log out'}
          </Button>
          <Button variant="danger" onClick={handleLogoutAllDevices} disabled={isLogoutLoading || isLogoutAllLoading}>
            <MonitorX size={18} aria-hidden="true" />
            {isLogoutAllLoading ? 'Logging out...' : 'Log out all devices'}
          </Button>
        </div>
      </section>

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
