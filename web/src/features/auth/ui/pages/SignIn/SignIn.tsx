import { ArrowRight, Eye, EyeOff, Lock, Mail, MessageSquareText, ShieldCheck, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

import ForgotPasswordModal from '@/features/auth/ui/components/ForgotPasswordModal/ForgotPasswordModal';
import GoogleIcon from '@/features/auth/ui/components/GoogleIcon';
import ErrorBoundary from '@/shared/components/ErrorBoundary/ErrorBoundary';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { useSignIn } from './useSignIn';
import '../auth.css';

const signInFeatures = [
  {
    icon: MessageSquareText,
    title: 'Chat and collaborate',
    text: 'Move from feedback to room-based coding without losing context.',
  },
  {
    icon: ShieldCheck,
    title: 'Protected sessions',
    text: 'Refresh-token sessions, block guards, and reports are handled end to end.',
  },
  {
    icon: Sparkles,
    title: 'Portfolio-ready profile',
    text: 'Show posts, projects, contributions, and activity in one polished space.',
  },
];

const SignInPage = () => {
  const {
    closeForgotPasswordModal,
    formData,
    formError,
    handleEmailChange,
    handleOAuthSignIn,
    handlePasswordChange,
    handleSubmit,
    isBusy,
    isForgotPasswordModalOpen,
    isGoogleLoading,
    isLoginLoading,
    openForgotPasswordModal,
    showPassword,
    togglePasswordVisibility,
  } = useSignIn();

  return (
    <>
      <main className="auth-page">
        <div className="auth-grid-bg" />
        <div className="auth-layout auth-layout--signin">
          <ErrorBoundary variant="section" title="Sign in overview could not be rendered." showReload={false}>
            <section className="auth-story" aria-label="Disuza sign in overview">
            <Link to="/" className="auth-brand">
              <span className="auth-brand__mark">DLF</span>
              <span>Disuza</span>
            </Link>
            <h1>Pick up your dev loop exactly where you left it.</h1>
            <p>
              Feed, feedback, saved collections, real-time collaboration, and coding rooms stay ready inside one focused workspace.
            </p>
            <div className="auth-feature-list">
              {signInFeatures.map(({ icon: Icon, title, text }) => (
                <article className="auth-feature" key={title}>
                  <span className="auth-feature__icon"><Icon size={20} aria-hidden="true" /></span>
                  <div>
                    <h2>{title}</h2>
                    <p>{text}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
          </ErrorBoundary>

          <ErrorBoundary variant="section" title="Sign in form could not be rendered." showReload={false}>
            <section className="auth-card" aria-label="Sign in form">
            <div className="auth-card__header">
              <Link to="/" className="auth-logo">DLF</Link>
              <h2>Welcome back</h2>
              <p>
                New here? <Link to="/auth/signup">Create an account</Link>
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span>Email</span>
                <div className="field__control">
                  <Mail size={18} aria-hidden="true" />
                  <Input
                    autoComplete="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    required
                  />
                </div>
              </label>

              <label className="field">
                <span>Password</span>
                <div className="field__control">
                  <Lock size={18} aria-hidden="true" />
                  <Input
                    autoComplete="current-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    className="field__icon-button"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </div>
              </label>

              {formError && <p className="form-error">{formError}</p>}

              <button type="button" className="auth-inline-action" onClick={openForgotPasswordModal}>
                Forgot password?
              </button>

              <Button type="submit" disabled={isBusy}>
                {isLoginLoading ? 'Signing in...' : 'Sign in'}
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </form>

            <div className="auth-divider"><span>or</span></div>

            <Button variant="secondary" onClick={handleOAuthSignIn} disabled={isBusy}>
              <GoogleIcon />
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </Button>
          </section>
          </ErrorBoundary>
        </div>
      </main>

      <ErrorBoundary variant="inline" title="Forgot password modal could not be rendered." resetKeys={[isForgotPasswordModalOpen]} showReload={false}>
        <ForgotPasswordModal isOpen={isForgotPasswordModalOpen} onClose={closeForgotPasswordModal} />
      </ErrorBoundary>
    </>
  );
};

export default memo(SignInPage);
