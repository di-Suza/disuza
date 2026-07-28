import { Shield, Trash2, X } from 'lucide-react';
import { memo, useCallback, useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

import { useAppSelector } from '@/app/store/hooks';
import {
  useDeleteAccountMutation,
  useSendDeleteAccountOtpMutation,
  useVerifyDeleteAccountOtpMutation,
  useVerifyDeleteAccountPasswordMutation,
} from '@/features/users/api/user.api';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type DashboardAccountModalMode = 'privacy' | 'delete';

type DashboardAccountModalProps = {
  isOpen: boolean;
  mode: DashboardAccountModalMode;
  onClose: () => void;
};

const DashboardAccountModal = ({ isOpen, mode, onClose }: DashboardAccountModalProps) => {
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const { showError, showSuccess } = useToast();
  const isGoogleUser = useAppSelector((state) => Boolean(state.auth.user?.isGoogleUser));

  const [verifyPassword, verifyPasswordState] = useVerifyDeleteAccountPasswordMutation();
  const [sendOtp, sendOtpState] = useSendDeleteAccountOtpMutation();
  const [verifyOtp, verifyOtpState] = useVerifyDeleteAccountOtpMutation();
  const [deleteAccount, deleteAccountState] = useDeleteAccountMutation();

  const isBusy = verifyPasswordState.isLoading || sendOtpState.isLoading || verifyOtpState.isLoading || deleteAccountState.isLoading;

  useLockBodyScroll(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setPassword('');
      setOtp('');
      setStep('password');
    }
  }, [isOpen]);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  }, []);

  const handleOtpChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setOtp(event.target.value);
  }, []);

  const handlePasswordSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      if (isGoogleUser) {
        const otpResult = await sendOtp().unwrap();
        showSuccess(otpResult.message);
        setStep('otp');
        return;
      }

      const passwordResult = await verifyPassword({ password }).unwrap();
      showSuccess(passwordResult.message);
      const deleteResult = await deleteAccount().unwrap();
      showSuccess(deleteResult.message);
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [deleteAccount, isGoogleUser, onClose, password, sendOtp, showError, showSuccess, verifyPassword]);

  const handleOtpSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      const otpResult = await verifyOtp({ otp }).unwrap();
      showSuccess(otpResult.message);
      const deleteResult = await deleteAccount().unwrap();
      showSuccess(deleteResult.message);
      onClose();
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [deleteAccount, onClose, otp, showError, showSuccess, verifyOtp]);

  if (!isOpen) return null;

  const isDeleteMode = mode === 'delete';
  const Icon = isDeleteMode ? Trash2 : Shield;

  return createPortal(
    <div className="modal-backdrop report-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <section className="modal-card dashboard-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-card__header report-modal__header">
          <span className="report-modal__icon">
            <Icon size={22} aria-hidden="true" />
          </span>
          <div>
            <p className="state-panel__eyebrow">Account</p>
            <h1>{isDeleteMode ? 'Delete Account' : 'Privacy Policy'}</h1>
          </div>
          <Button variant="ghost" className="button--icon" onClick={onClose} aria-label="Close account modal">
            <X size={18} aria-hidden="true" />
          </Button>
        </header>

        {isDeleteMode ? (
          step === 'password' ? (
            <form className="dashboard-modal__form" onSubmit={handlePasswordSubmit}>
              <p className="empty-copy">{isGoogleUser ? 'Send an OTP to confirm account deletion.' : 'Confirm your password before deleting your account.'}</p>
              {!isGoogleUser && (
                <label className="field">
                  <span>Password</span>
                  <Input type="password" value={password} onChange={handlePasswordChange} placeholder="Current password" minLength={8} required />
                </label>
              )}
              <footer className="report-modal__footer">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="danger" type="submit" disabled={!isGoogleUser && password.length < 8} isLoading={isBusy} loadingLabel={isGoogleUser ? 'Sending OTP' : 'Deleting account'}>
                  <Trash2 size={17} aria-hidden="true" />
                  {isGoogleUser ? 'Send OTP' : 'Delete account'}
                </Button>
              </footer>
            </form>
          ) : (
            <form className="dashboard-modal__form" onSubmit={handleOtpSubmit}>
              <p className="empty-copy">Enter the OTP sent to your account email.</p>
              <label className="field">
                <span>OTP</span>
                <Input value={otp} onChange={handleOtpChange} placeholder="6 digit OTP" inputMode="numeric" maxLength={6} required />
              </label>
              <footer className="report-modal__footer">
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="danger" type="submit" disabled={otp.trim().length < 4} isLoading={isBusy} loadingLabel="Deleting account">
                  <Trash2 size={17} aria-hidden="true" />
                  Delete account
                </Button>
              </footer>
            </form>
          )
        ) : (
          <>
            <div className="dashboard-modal__policy">
              <p>Disuza keeps authentication refresh tokens in secure cookies and keeps short-lived access tokens in app memory.</p>
              <p>Your profile, posts, saved collections, reports, and account actions are tied to your account so the app can keep ownership and moderation rules consistent.</p>
              <p>AI-generated room problems may be saved into the shared problem catalog after basic validation so other users can discover and add them later.</p>
              <p>Demo code execution and AI generation depend on external free-tier providers, so generated challenges and execution results may need review before production use.</p>
              <p>You can manage sessions, blocked users, reports, and saved collections from this dashboard.</p>
            </div>
            <footer className="report-modal__footer">
              <Button variant="secondary" onClick={onClose}>Close</Button>
            </footer>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
};

export default memo(DashboardAccountModal);
export type { DashboardAccountModalMode };
