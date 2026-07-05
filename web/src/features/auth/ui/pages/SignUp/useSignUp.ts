import { useGoogleLogin } from '@react-oauth/google';
import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useGoogleLoginMutation, useSendOtpMutation } from '@/features/auth/api/auth.api';
import type { OtpResponse } from '@/features/auth/model/auth.types';
import env from '@/shared/config/env';
import { useToast } from '@/shared/hooks/useToast';
import { isStrongEnoughPassword, isValidEmail } from '@/shared/utils/authValidation';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const initialFormData = {
  userName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export const useSignUp = () => {
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [sendOtp, { isLoading: isSendOtpLoading }] = useSendOtpMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] = useGoogleLoginMutation();

  const [formData, setFormData] = useState(initialFormData);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showPasswordMismatch, setShowPasswordMismatch] = useState(false);
  const [otpResponse, setOtpResponse] = useState<OtpResponse | null>(null);
  const [isOtpVerificationModalOpen, setOtpVerificationModalOpen] = useState(false);

  const updateField = useCallback((field: keyof typeof initialFormData) => (event: ChangeEvent<HTMLInputElement>) => {
    setFormData((current) => ({ ...current, [field]: event.target.value }));
    if (field === 'confirmPassword') setShowPasswordMismatch(false);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = formData.email.trim();
      const userName = formData.userName.trim();

      if (!userName) {
        showError('Please enter your name before submitting!');
        return;
      }

      if (!isValidEmail(email)) {
        showError('Please enter a valid email!');
        return;
      }

      if (!isStrongEnoughPassword(formData.password)) {
        showError('Password must be at least 8 characters.');
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setShowPasswordMismatch(true);
        showError("Password didn't match!");
        return;
      }

      try {
        const result = await sendOtp({ email, password: formData.password, userName }).unwrap();
        showSuccess(result.message);
        setOtpResponse({ email: result.email, remainingAttempts: result.remainingAttempts, expiresIn: result.expiresIn });
        setOtpVerificationModalOpen(true);
      } catch (error) {
        showError(getErrorMessage(error));
      }
    },
    [formData, sendOtp, showError, showSuccess],
  );

  const handleOauthResponse = useCallback(
    async (code: string) => {
      try {
        const result = await googleLogin({ code }).unwrap();
        showSuccess(result.message);
        navigate('/dashboard', { replace: true });
      } catch (error) {
        showError(getErrorMessage(error, 'Something went wrong while creating account'));
      }
    },
    [googleLogin, navigate, showError, showSuccess],
  );

  const googleSignUp = useGoogleLogin({
    flow: 'auth-code',
    onSuccess: (tokenResponse) => {
      if (tokenResponse.code) {
        void handleOauthResponse(tokenResponse.code);
      }
    },
    onError: () => showError('Google login failed!'),
  });

  const handleOAuthSignUp = useCallback(() => {
    if (!env.googleClientId) {
      showError('Google login is not configured yet.');
      return;
    }

    googleSignUp();
  }, [googleSignUp, showError]);

  const closeOtpVerificationModal = useCallback(() => setOtpVerificationModalOpen(false), []);
  const resetForm = useCallback(() => setFormData(initialFormData), []);

  return useMemo(
    () => ({
      closeOtpVerificationModal,
      formData,
      handleConfirmPasswordChange: updateField('confirmPassword'),
      handleEmailChange: updateField('email'),
      handleOAuthSignUp,
      handlePasswordChange: updateField('password'),
      handleSubmit,
      handleUserNameChange: updateField('userName'),
      initialFormData,
      isBusy: isSendOtpLoading || isGoogleLoading,
      isGoogleLoading,
      isOtpVerificationModalOpen,
      isSendOtpLoading,
      otpResponse,
      resetForm,
      setOtpResponse,
      showConfirmPassword,
      showPassword,
      showPasswordMismatch,
      toggleConfirmPasswordVisibility: () => setShowConfirmPassword((current) => !current),
      togglePasswordVisibility: () => setShowPassword((current) => !current),
    }),
    [
      closeOtpVerificationModal,
      formData,
      handleOAuthSignUp,
      handleSubmit,
      isGoogleLoading,
      isOtpVerificationModalOpen,
      isSendOtpLoading,
      otpResponse,
      resetForm,
      showConfirmPassword,
      showPassword,
      showPasswordMismatch,
      updateField,
    ],
  );
};
