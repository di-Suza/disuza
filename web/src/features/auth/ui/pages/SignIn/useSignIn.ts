import { useGoogleLogin } from '@react-oauth/google';
import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGoogleLoginMutation, useLoginMutation } from '@/features/auth/api/auth.api';
import env from '@/shared/config/env';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';
import { isStrongEnoughPassword, isValidEmail } from '@/shared/utils/authValidation';

const initialData = {
  email: 'rajputsujal992@gmail.com',
  password: 'demotestpass',
};

export const useSignIn = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const [formData, setFormData] = useState(initialData);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [isForgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, email: event.target.value }));
    setFormError('');
  }, []);

  const handlePasswordChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, password: event.target.value }));
    setFormError('');
  }, []);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((current) => !current);
  }, []);

  const openForgotPasswordModal = useCallback(() => setForgotPasswordModalOpen(true), []);
  const closeForgotPasswordModal = useCallback(() => setForgotPasswordModalOpen(false), []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = formData.email.trim();

      if (!isValidEmail(email)) {
        showError('Please enter a valid email!');
        return;
      }

      if (!isStrongEnoughPassword(formData.password)) {
        showError('Password must be at least 8 characters.');
        return;
      }

      try {
        const result = await login({ email, password: formData.password }).unwrap();
        showSuccess(result.message);
        setFormData(initialData);
        navigate('/home', { replace: true });
      } catch (error) {
        const message = getErrorMessage(error);
        setFormError(message);
        showError(message);
      }
    },
    [formData.email, formData.password, login, navigate, showError, showSuccess],
  );

  const handleOauthResponse = useCallback(
    async (code: string) => {
      try {
        const result = await googleLogin({ code }).unwrap();
        showSuccess(result.message);
        navigate('/home', { replace: true });
      } catch (error) {
        showError(getErrorMessage(error));
      }
    },
    [googleLogin, navigate, showError, showSuccess],
  );

  const googleSignIn = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: (tokenResponse) => {
      if (tokenResponse.code) {
        void handleOauthResponse(tokenResponse.code);
      }
    },
    onError: () => showError('Google login failed!'),
  });

  const handleOAuthSignIn = useCallback(() => {
    if (!env.googleClientId) {
      showError('Google login is not configured yet.');
      return;
    }

    googleSignIn();
  }, [googleSignIn, showError]);

  const isBusy = isLoginLoading || isGoogleLoading;

  return useMemo(
    () => ({
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
    }),
    [
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
    ],
  );
};
