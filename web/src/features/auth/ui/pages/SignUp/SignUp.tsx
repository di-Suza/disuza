import { ArrowRight, Eye, EyeOff, GitBranch, Lock, Mail, MessageSquareCode, User } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import GoogleIcon from '@/features/auth/ui/components/GoogleIcon';
import OtpVerificationModal from '@/features/auth/ui/components/OtpVerificationModal/OtpVerificationModal';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { useSignUp } from './useSignUp';
import '../auth.css';

const signUpFeatures = [
  { icon: MessageSquareCode, title: 'Feedback-first posts' },
  { icon: GitBranch, title: 'Collab coding rooms' },
  { icon: User, title: 'Portfolio preview' },
  { icon: Lock, title: 'Block and report controls' },
];

const SignUpPage = () => {
  const {
    closeOtpVerificationModal,
    formData,
    handleConfirmPasswordChange,
    handleEmailChange,
    handleOAuthSignUp,
    handlePasswordChange,
    handleSubmit,
    handleUserNameChange,
    isBusy,
    isGoogleLoading,
    isOtpVerificationModalOpen,
    isSendOtpLoading,
    otpResponse,
    resetForm,
    setOtpResponse,
    showConfirmPassword,
    showPassword,
    showPasswordMismatch,
    toggleConfirmPasswordVisibility,
    togglePasswordVisibility,
  } = useSignUp();

  return (
    <>
      <main className="auth-page">
        <div className="auth-grid-bg" />
        <div className="auth-layout auth-layout--signup">
          <section className="auth-card" aria-label="Create account form">
            <div className="auth-card__header">
              <Link to="/" className="auth-logo">DLF</Link>
              <h2>Create account</h2>
              <p>
                Already registered? <Link to="/auth/signin">Sign in</Link>
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span>Name</span>
                <div className="field__control">
                  <User size={18} aria-hidden="true" />
                  <Input type="text" placeholder="Your display name" value={formData.userName} onChange={handleUserNameChange} required />
                </div>
              </label>

              <label className="field">
                <span>Email</span>
                <div className="field__control">
                  <Mail size={18} aria-hidden="true" />
                  <Input autoComplete="email" type="email" placeholder="you@example.com" value={formData.email} onChange={handleEmailChange} required />
                </div>
              </label>

              <label className="field">
                <span>Password</span>
                <div className="field__control">
                  <Lock size={18} aria-hidden="true" />
                  <Input
                    autoComplete="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    minLength={8}
                    required
                  />
                  <button type="button" className="field__icon-button" onClick={togglePasswordVisibility} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              <label className="field">
                <span>Confirm password</span>
                <div className="field__control">
                  <Lock size={18} aria-hidden="true" />
                  <Input
                    autoComplete="new-password"
                    className={showPasswordMismatch ? 'input--error' : undefined}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    minLength={8}
                    required
                  />
                  <button type="button" className="field__icon-button" onClick={toggleConfirmPasswordVisibility} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    {showConfirmPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
                {showPasswordMismatch && <p className="form-error">Passwords did not match.</p>}
              </label>

              <Button type="submit" disabled={isBusy}>
                {isSendOtpLoading ? 'Sending OTP...' : 'Create account'}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <Button variant="secondary" onClick={handleOAuthSignUp} disabled={isBusy}>
              <GoogleIcon />
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
          </section>

          <section className="auth-story" aria-label="DevLoopFeed sign up overview">
            <Link to="/" className="auth-brand">
              <span className="auth-brand__mark">DLF</span>
              <span>DevLoopFeed</span>
            </Link>
            <h1>Build a developer identity around real work.</h1>
            <p>
              Share posts, collect feedback, track contributions, and open collaborative rooms from the conversations that matter.
            </p>
            <div className="auth-feature-grid">
              {signUpFeatures.map(({ icon: Icon, title }) => (
                <article className="auth-feature auth-feature--compact" key={title}>
                  <span className="auth-feature__icon"><Icon size={20} aria-hidden="true" /></span>
                  <h2>{title}</h2>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>

      <OtpVerificationModal
        email={formData.email.trim()}
        initialFormDataReset={resetForm}
        isOpen={isOtpVerificationModalOpen}
        onClose={closeOtpVerificationModal}
        otpResponse={otpResponse}
        password={formData.password}
        setOtpResponse={setOtpResponse}
        userName={formData.userName.trim()}
      />
    </>
  );
};

export default memo(SignUpPage);
