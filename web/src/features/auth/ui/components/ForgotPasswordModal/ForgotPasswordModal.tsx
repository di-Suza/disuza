import { ArrowRight, Check, Eye, EyeOff, Loader2, Mail, X } from 'lucide-react';
import { createPortal } from 'react-dom';

import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { useForgotPasswordModal } from './useForgotPasswordModal';

type ForgotPasswordModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const ForgotPasswordModal = ({ isOpen, onClose }: ForgotPasswordModalProps) => {
  const {
    canUpdatePassword,
    doPasswordsMatch,
    email,
    error,
    handleClose,
    handleConfirmPasswordChange,
    handleEmailChange,
    handleNewPasswordChange,
    handleOtpChange,
    handleResetPassword,
    handleSendOtp,
    handleVerifyOtp,
    isAuthorized,
    isEmailStepActionEnabled,
    isOtpReady,
    isSendingOtp,
    isUpdatingPassword,
    isVerifyingOtp,
    maskedUserEmail,
    otp,
    otpResponse,
    passwords,
    showPasswords,
    step,
    toggleConfirmPasswordVisibility,
    toggleNewPasswordVisibility,
  } = useForgotPasswordModal({ isOpen, onClose });

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
      <section className="modal-card">
        <button type="button" className="modal-close" onClick={handleClose} aria-label="Close modal">
          <X size={18} aria-hidden="true" />
        </button>

        <div className="modal-card__header">
          <span className="modal-card__icon"><Mail size={30} aria-hidden="true" /></span>
          <h1 id="forgot-password-title">Forgot Password?</h1>
          <p>
            {step === 'email' && "We'll send you a verification code"}
            {step === 'otp' && 'Enter the code sent to your email'}
            {step === 'reset' && 'Create a new password'}
          </p>
        </div>

        {step === 'email' && (
          <div className="modal-step">
            <label className="field">
              <span>Email</span>
              {isAuthorized ? (
                <div className="readonly-field">
                  <Mail size={18} aria-hidden="true" />
                  <span>{maskedUserEmail}</span>
                  <Check size={18} aria-hidden="true" />
                </div>
              ) : (
                <div className="field__control">
                  <Mail size={18} aria-hidden="true" />
                  <Input type="email" placeholder="Enter your email" value={email} onChange={handleEmailChange} />
                </div>
              )}
            </label>
            {error && <p className="form-error">{error}</p>}
            <Button onClick={handleSendOtp} disabled={!isEmailStepActionEnabled} isLoading={isSendingOtp} loadingLabel="Sending OTP">
              Send OTP
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        )}

        {step === 'otp' && (
          <div className="modal-step">
            <label className="field">
              <span>Verification Code</span>
              <Input className="otp-line-input" type="text" inputMode="numeric" placeholder="Enter 6-digit code" maxLength={6} value={otp} onChange={handleOtpChange} />
            </label>
            {otpResponse && <p className="otp-attempts">Remaining Attempts: {otpResponse.remainingAttempts}</p>}
            {error && <p className="form-error">{error}</p>}
            <button type="button" className="auth-inline-action" onClick={handleSendOtp} disabled={isSendingOtp}>
              {isSendingOtp ? <Loader2 className="spin" size={16} aria-hidden="true" /> : 'Resend Code'}
            </button>
            <Button onClick={handleVerifyOtp} disabled={!isOtpReady} isLoading={isVerifyingOtp} loadingLabel="Verifying OTP">
              Verify Code
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </div>
        )}

        {step === 'reset' && (
          <div className="modal-step">
            <label className="field">
              <span>New Password</span>
              <div className="field__control field__control--no-left-icon">
                <Input type={showPasswords.newPassword ? 'text' : 'password'} placeholder="Enter new password" value={passwords.newPassword} onChange={handleNewPasswordChange} />
                <button type="button" className="field__icon-button" onClick={toggleNewPasswordVisibility} aria-label={showPasswords.newPassword ? 'Hide password' : 'Show password'}>
                  {showPasswords.newPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </label>
            <label className="field">
              <span>Confirm New Password</span>
              <div className="field__control field__control--no-left-icon">
                <Input type={showPasswords.confirmPassword ? 'text' : 'password'} placeholder="Confirm new password" value={passwords.confirmPassword} onChange={handleConfirmPasswordChange} />
                <button type="button" className="field__icon-button" onClick={toggleConfirmPasswordVisibility} aria-label={showPasswords.confirmPassword ? 'Hide password' : 'Show password'}>
                  {showPasswords.confirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </label>
            {passwords.newPassword && passwords.confirmPassword && (
              <p className={doPasswordsMatch ? 'password-match password-match--ok' : 'password-match'}>
                {doPasswordsMatch ? 'Passwords match' : "Passwords don't match"}
              </p>
            )}
            <Button onClick={handleResetPassword} disabled={!canUpdatePassword} isLoading={isUpdatingPassword} loadingLabel="Updating password">
              Update Password
              <Check size={18} aria-hidden="true" />
            </Button>
          </div>
        )}

        <button type="button" className="modal-back-button" onClick={handleClose}>
          {isAuthorized ? 'Back' : 'Back to Login'}
        </button>
      </section>
    </div>,
    document.body,
  );
};

export default ForgotPasswordModal;
