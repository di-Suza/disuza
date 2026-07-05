import { useCallback, useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSendOtpMutation, useVerifyAndRegisterMutation } from '@/features/auth/api/auth.api';
import type { OtpResponse } from '@/features/auth/model/auth.types';
import { useLockBodyScroll } from '@/shared/hooks/useLockBodyScroll';
import { useToast } from '@/shared/hooks/useToast';
import { getErrorMessage } from '@/shared/utils/getErrorMessage';

const OTP_LENGTH = 6;
const RESEND_TIMER_SECONDS = 30;

type UseOtpVerificationModalParams = {
  email: string;
  initialFormDataReset: () => void;
  isOpen: boolean;
  onClose: () => void;
  otpResponse: OtpResponse | null;
  password: string;
  setOtpResponse: (otpResponse: OtpResponse | null) => void;
  userName: string;
};

export const useOtpVerificationModal = ({
  email,
  initialFormDataReset,
  isOpen,
  onClose,
  otpResponse,
  password,
  setOtpResponse,
  userName,
}: UseOtpVerificationModalParams) => {
  useLockBodyScroll(isOpen);

  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  const [sendOtp, { isLoading: isSendOtpLoading }] = useSendOtpMutation();
  const [verifyAndRegister, { isLoading: isVerifyLoading }] = useVerifyAndRegisterMutation();

  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [timer, setTimer] = useState(RESEND_TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [otpIncorrect, setOtpIncorrect] = useState(false);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!isOpen) return;

    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setTimer(RESEND_TIMER_SECONDS);
    setCanResend(false);

    const focusTimer = window.setTimeout(() => inputRefs.current[0]?.focus(), 100);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || canResend) return;

    const intervalId = window.setInterval(() => {
      setTimer((currentTimer) => {
        if (currentTimer <= 1) {
          window.clearInterval(intervalId);
          setCanResend(true);
          return 0;
        }

        return currentTimer - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [canResend, isOpen]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      setOtp((currentOtp) => {
        const nextOtp = [...currentOtp];

        if (value.length > 1) {
          const pastedValue = value.slice(0, OTP_LENGTH - index);
          pastedValue.split('').forEach((digit, offset) => {
            nextOtp[index + offset] = digit;
          });
          const lastIndex = Math.min(index + pastedValue.length, OTP_LENGTH - 1);
          window.setTimeout(() => inputRefs.current[lastIndex]?.focus(), 0);
          return nextOtp;
        }

        nextOtp[index] = value;
        if (value && index < OTP_LENGTH - 1) {
          window.setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
        }
        return nextOtp;
      });
    },
    [],
  );

  const handleKeyDown = useCallback(
    (index: number, event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      if (event.key === 'ArrowLeft' && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }

      if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp],
  );

  const handlePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pastedData) return;

    const nextOtp = Array.from({ length: OTP_LENGTH }, (_, index) => pastedData[index] || '');
    setOtp(nextOtp);
    inputRefs.current[Math.min(pastedData.length - 1, OTP_LENGTH - 1)]?.focus();
  }, []);

  const handleResend = useCallback(async () => {
    if (!email || !password || !userName) {
      showError("There's an input error, please refill the form!");
      return;
    }

    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setTimer(RESEND_TIMER_SECONDS);
    setCanResend(false);
    inputRefs.current[0]?.focus();

    try {
      const result = await sendOtp({ email, password, userName }).unwrap();
      showSuccess(result.message);
      setOtpResponse({ email: result.email, remainingAttempts: result.remainingAttempts, expiresIn: result.expiresIn });
    } catch (error) {
      showError(getErrorMessage(error));
    }
  }, [email, password, sendOtp, setOtpResponse, showError, showSuccess, userName]);

  const handleVerify = useCallback(async () => {
    const otpValue = otp.join('');

    if (!otpResponse || otpValue.length !== OTP_LENGTH) return;

    if (password.length < 8 || !userName || !email) {
      showError("There's an input error, please refill the form!");
      return;
    }

    try {
      const result = await verifyAndRegister({ email: otpResponse.email, otp: otpValue, password, userName }).unwrap();
      showSuccess(result.message);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
      initialFormDataReset();
      setOtpResponse(null);
      onClose();
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setOtpIncorrect(true);
      window.setTimeout(() => setOtpIncorrect(false), 900);
      showError(getErrorMessage(error));
    }
  }, [email, initialFormDataReset, navigate, onClose, otp, otpResponse, password, setOtpResponse, showError, showSuccess, userName, verifyAndRegister]);

  return useMemo(
    () => ({
      canResend,
      handleChange,
      handleKeyDown,
      handlePaste,
      handleResend,
      handleVerify,
      inputRefs,
      isComplete: otp.every(Boolean),
      isSendOtpLoading,
      isVerifyLoading,
      otp,
      otpIncorrect,
      timer,
    }),
    [canResend, handleChange, handleKeyDown, handlePaste, handleResend, handleVerify, isSendOtpLoading, isVerifyLoading, otp, otpIncorrect, timer],
  );
};
