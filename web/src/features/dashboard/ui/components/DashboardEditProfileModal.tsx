import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { memo, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';
import type { useDashboardPage } from '../pages/useDashboardPage';

type DashboardPageState = ReturnType<typeof useDashboardPage>;

type DashboardEditProfileModalProps = Pick<
  DashboardPageState,
  | 'handleIdentitySubmit'
  | 'handlePasswordSubmit'
  | 'handleRemoveProfilePicture'
  | 'identityForm'
  | 'isBusy'
  | 'isPasswordUpdating'
  | 'passwordForm'
  | 'updateIdentityField'
  | 'updateIdentityFile'
  | 'updatePasswordField'
  | 'user'
> & {
  isOpen: boolean;
  onClose: () => void;
  onForgotPassword: () => void;
};

const DashboardEditProfileModal = ({
  handleIdentitySubmit,
  handlePasswordSubmit,
  handleRemoveProfilePicture,
  identityForm,
  isBusy,
  isOpen,
  isPasswordUpdating,
  onClose,
  onForgotPassword,
  passwordForm,
  updateIdentityField,
  updateIdentityFile,
  updatePasswordField,
  user,
}: DashboardEditProfileModalProps) => {
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [filePreview, setFilePreview] = useState('');

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!identityForm.profilePictureFile) {
      setFilePreview('');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(identityForm.profilePictureFile);
    setFilePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [identityForm.profilePictureFile]);

  useEffect(() => {
    if (isOpen) return;
    setShowPasswordSection(false);
    setConfirmPassword('');
    setShowPasswords({ current: false, next: false, confirm: false });
  }, [isOpen]);

  const avatarUrl = filePreview || (identityForm.profilePictureUrl
    ? getOptimizedImage(identityForm.profilePictureUrl, 'avatar') || identityForm.profilePictureUrl
    : '');
  const passwordsMatch = Boolean(passwordForm.newPassword) && passwordForm.newPassword === confirmPassword;
  const isGoogleUser = Boolean(user?.isGoogleUser);

  const submitPassword = useCallback((event: FormEvent<HTMLFormElement>) => {
    if (!passwordsMatch) {
      event.preventDefault();
      return;
    }

    void handlePasswordSubmit(event);
    setConfirmPassword('');
  }, [handlePasswordSubmit, passwordsMatch]);

  const togglePassword = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords((current) => ({ ...current, [field]: !current[field] }));
  }, []);

  const togglePasswordSection = useCallback(() => {
    setShowPasswordSection((current) => !current);
  }, []);

  const toggleCurrentPassword = useCallback(() => togglePassword('current'), [togglePassword]);
  const toggleNextPassword = useCallback(() => togglePassword('next'), [togglePassword]);
  const toggleConfirmPassword = useCallback(() => togglePassword('confirm'), [togglePassword]);

  const handleConfirmPasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(event.target.value);
  }, []);

  if (!isOpen) return null;

  return createPortal(
    <div className="dashboard-edit-v1-backdrop" role="dialog" aria-modal="true" aria-labelledby="dashboard-edit-title">
      <section className="dashboard-edit-v1">
        <button type="button" className="dashboard-edit-v1__close" onClick={onClose} aria-label="Close edit profile modal">
          <X size={20} aria-hidden="true" />
        </button>

        <header className="dashboard-edit-v1__header">
          <h2 id="dashboard-edit-title">Edit Profile</h2>
        </header>

        <div className="dashboard-edit-v1__scroll">
          <form id="dashboard-edit-identity-form" className="dashboard-edit-v1__identity" onSubmit={handleIdentitySubmit}>
            <div className="dashboard-edit-v1__avatar-wrap">
              <div className="dashboard-edit-v1__avatar">
                {avatarUrl ? <img src={avatarUrl} alt="Profile preview" /> : <UserRound size={42} aria-hidden="true" />}
                <label htmlFor="dashboard-profile-upload">
                  <Camera size={28} aria-hidden="true" />
                  <span>Change Photo</span>
                </label>
                <Input id="dashboard-profile-upload" type="file" accept="image/*" onChange={updateIdentityFile} />
                {avatarUrl && (
                  <button type="button" onClick={handleRemoveProfilePicture} aria-label="Delete profile picture">
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </div>
              <p>Click avatar to update photo</p>
            </div>

            <label className="dashboard-edit-v1__field">
              <span>Name</span>
              <Input
                value={identityForm.userName}
                onChange={updateIdentityField('userName')}
                placeholder="Enter your name"
                minLength={2}
                required
              />
            </label>

            <label className="dashboard-edit-v1__field">
              <span>Email</span>
              <div className="dashboard-edit-v1__readonly">
                <Input type="email" value={user?.email || ''} readOnly />
                <Lock size={16} aria-hidden="true" />
              </div>
            </label>
          </form>

          {!isGoogleUser && (
            <section className="dashboard-edit-v1__password">
              <span>Password</span>
              <button type="button" onClick={togglePasswordSection}>
                <strong>Update Password</strong>
                {showPasswordSection ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showPasswordSection && (
                <form onSubmit={submitPassword}>
                  <label>
                    <span>Current Password</span>
                    <div>
                      <Input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={updatePasswordField('currentPassword')}
                        placeholder="Enter current password"
                        minLength={8}
                        required
                      />
                      <button type="button" onClick={toggleCurrentPassword} aria-label="Toggle current password visibility">
                        {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span>New Password</span>
                    <div>
                      <Input
                        type={showPasswords.next ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={updatePasswordField('newPassword')}
                        placeholder="Enter new password"
                        minLength={8}
                        required
                      />
                      <button type="button" onClick={toggleNextPassword} aria-label="Toggle new password visibility">
                        {showPasswords.next ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </label>

                  <label>
                    <span>Confirm New Password</span>
                    <div>
                      <Input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={handleConfirmPasswordChange}
                        placeholder="Confirm new password"
                        minLength={8}
                        required
                      />
                      <button type="button" onClick={toggleConfirmPassword} aria-label="Toggle confirm password visibility">
                        {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword && <small className={passwordsMatch ? 'is-valid' : ''}>{passwordsMatch ? 'Passwords match' : "Passwords don't match"}</small>}
                  </label>

                  <button
                    type="button"
                    className="dashboard-edit-v1__forgot"
                    onClick={onForgotPassword}
                  >
                    Forgot Password?
                  </button>

                  <Button type="submit" disabled={!passwordsMatch} isLoading={isPasswordUpdating} loadingLabel="Updating password">
                    Update Password
                  </Button>
                </form>
              )}
            </section>
          )}
        </div>

        <footer className="dashboard-edit-v1__footer">
          <Button type="submit" form="dashboard-edit-identity-form" isLoading={isBusy} loadingLabel="Updating profile">Update</Button>
        </footer>
      </section>
    </div>,
    document.body,
  );
};

export default memo(DashboardEditProfileModal);
