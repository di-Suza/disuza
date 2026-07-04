import { useCallback, useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  useSendOtpForForgotPasswordMutation,
  useUpdateNewPasswordForgotPasswordMutation,
  useVerifyOtpForForgotPasswordMutation,
} from '@/features/auth/api/auth.api';
import type { ForgotPasswordTokenResponse, OtpResponse } from '@/features/auth/model/auth.types';
import { useAppSelector } from '@/app/store/hooks';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { isStrongEnoughPassword, isValidEmail } from '@/shared/utils/authValidation';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

type ForgotPasswordStep = 'email' | 'otp' | 'reset';

type UseForgotPasswordModalParams = {
  isOpen: boolean;
  onClose: () => void;
};

const maskEmail = (email: string | undefined): string => {
  if (!email) return '';
  const [name, domain] = email.split('@');
  if (!domain || name.length <= 3) return email;

  const visibleCharacters = 2;
  return `${name.slice(0, visibleCharacters)}${'*'.repeat(Math.max(name.length - visibleCharacters * 2, 1))}${name.slice(-visibleCharacters)}@${domain}`;
};

export const useForgotPasswordModal = ({ isOpen, onClose }: UseForgotPasswordModalParams) => {
  useLockBodyScroll(isOpen);

  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const { userEmail, userId } = useAppSelector((state) => ({
    userEmail: state.auth.user?.email,
    userId: state.auth.user?._id,
  }));

  const [step, setStep] = useState<ForgotPasswordStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpResponse, setOtpResponse] = useState<OtpResponse | null>(null);
  const [verificationResponse, setVerificationResponse] = useState<ForgotPasswordTokenResponse | null>(null);
  const [error, setError] = useState('');
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ newPassword: false, confirmPassword: false });

  const [sendOtpForForgotPassword, { isLoading: isSendingOtp }] = useSendOtpForForgotPasswordMutation();
  const [verifyOtpForForgotPassword, { isLoading: isVerifyingOtp }] = useVerifyOtpForForgotPasswordMutation();
  const [updateNewPasswordForgotPassword, { isLoading: isUpdatingPassword }] = useUpdateNewPasswordForgotPasswordMutation();

  const isAuthorized = Boolean(userId && userEmail);
  const targetEmail = isAuthorized ? userEmail || '' : email.trim();
  const maskedUserEmail = maskEmail(userEmail);
  const isEmailStepActionEnabled = isAuthorized || isValidEmail(email);
  const isOtpReady = otp.length === 6;
  const doPasswordsMatch = passwords.newPassword === passwords.confirmPassword;
  const canUpdatePassword = isStrongEnoughPassword(passwords.newPassword) && doPasswordsMatch;

  const resetModalState = useCallback(() => {
    setStep('email');
    setEmail('');
    setOtp('');
    setOtpResponse(null);
    setVerificationResponse(null);
    setError('');
    setPasswords({ newPassword: '', confirmPassword: '' });
    setShowPasswords({ newPassword: false, confirmPassword: false });
  }, []);

  const handleClose = useCallback(() => {
    resetModalState();
    onClose();
  }, [onClose, resetModalState]);

  const handleEmailChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
    setError('');
  }, []);

  const handleOtpChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
    setError('');
  }, []);

  const handlePasswordChange = useCallback((field: keyof typeof passwords) => (event: ChangeEvent<HTMLInputElement>) => {
    setPasswords((current) => ({ ...current, [field]: event.target.value }));
  }, []);

  const togglePasswordVisibility = useCallback((field: keyof typeof showPasswords) => {
    setShowPasswords((current) => ({ ...current, [field]: !current[field] }));
  }, []);

  const handleSendOtp = useCallback(async () => {
    if (!targetEmail || !isValidEmail(targetEmail)) {
      showError('Email cannot be empty!');
      return;
    }

    try {
      const result = await sendOtpForForgotPassword(targetEmail).unwrap();
      setOtpResponse({ email: result.email, remainingAttempts: result.remainingAttempts, expiresIn: result.expiresIn });
      showSuccess(result.message);
      setStep('otp');
    } catch (apiError) {
      const message = getErrorMessage(apiError);
      setError(message);
      showError(message);
    }
  }, [sendOtpForForgotPassword, showError, showSuccess, targetEmail]);

  const handleVerifyOtp = useCallback(async () => {
    if (!otpResponse || otp.length !== 6) {
      showError('Please enter valid OTP!');
      return;
    }

    try {
      const result = await verifyOtpForForgotPassword({ email: otpResponse.email, otp }).unwrap();
      setVerificationResponse({ email: result.email, token: result.token });
      showSuccess(result.message);
      setStep('reset');
    } catch (apiError) {
      const message = getErrorMessage(apiError);
      setError(message);
      showError(message);
    }
  }, [otp, otpResponse, showError, showSuccess, verifyOtpForForgotPassword]);

  const handleResetPassword = useCallback(async () => {
    if (!verificationResponse) {
      showError('Something went wrong! Try again.');
      return;
    }

    if (!canUpdatePassword) {
      showError('Enter matching passwords with at least 8 characters.');
      return;
    }

    try {
      const result = await updateNewPasswordForgotPassword({
        token: verificationResponse.token,
        newPassword: passwords.newPassword,
      }).unwrap();
      showSuccess(result.message);
      handleClose();
      navigate('/auth/signin', { replace: true });
    } catch (apiError) {
      showError(getErrorMessage(apiError));
    }
  }, [canUpdatePassword, handleClose, navigate, passwords.newPassword, showError, showSuccess, updateNewPasswordForgotPassword, verificationResponse]);

  return useMemo(
    () => ({
      canUpdatePassword,
      doPasswordsMatch,
      email,
      error,
      handleClose,
      handleConfirmPasswordChange: handlePasswordChange('confirmPassword'),
      handleEmailChange,
      handleNewPasswordChange: handlePasswordChange('newPassword'),
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
      toggleConfirmPasswordVisibility: () => togglePasswordVisibility('confirmPassword'),
      toggleNewPasswordVisibility: () => togglePasswordVisibility('newPassword'),
    }),
    [
      canUpdatePassword,
      doPasswordsMatch,
      email,
      error,
      handleClose,
      handleEmailChange,
      handleOtpChange,
      handlePasswordChange,
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
      togglePasswordVisibility,
    ],
  );
};
