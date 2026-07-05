import { ArrowLeft, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { OtpResponse } from '@/features/auth/model/auth.types';
import Button from '@/shared/ui/Button';
import Input from '@/shared/ui/Input';
import { useOtpVerificationModal } from './useOtpVerificationModal';

type OtpVerificationModalProps = {
  email: string;
  initialFormDataReset: () => void;
  isOpen: boolean;
  onClose: () => void;
  otpResponse: OtpResponse | null;
  password: string;
  setOtpResponse: (otpResponse: OtpResponse | null) => void;
  userName: string;
};

const OtpVerificationModal = (props: OtpVerificationModalProps) => {
  const {
    canResend,
    handleChange,
    handleKeyDown,
    handlePaste,
    handleResend,
    handleVerify,
    inputRefs,
    isComplete,
    isSendOtpLoading,
    isVerifyLoading,
    otp,
    otpIncorrect,
    timer,
  } = useOtpVerificationModal(props);

  if (!props.isOpen || !props.otpResponse) return null;

  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="otp-modal-title">
      <section className="modal-card modal-card--otp">
        <div className="modal-card__header">
          <span className="modal-card__icon"><ShieldCheck size={30} aria-hidden="true" /></span>
          <h1 id="otp-modal-title">Verify OTP</h1>
          <p>We've sent a 6-digit code to {props.otpResponse.email}</p>
        </div>

        <div className="otp-grid" aria-label="One-time password input">
          {otp.map((digit, index) => (
            <Input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              className={otpIncorrect ? 'otp-input otp-input--error' : 'otp-input'}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              aria-label={`Digit ${index + 1} of OTP`}
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
            />
          ))}
        </div>

        <p className="otp-attempts">Remaining Attempts: {props.otpResponse.remainingAttempts}</p>

        {props.otpResponse.remainingAttempts > 0 && (
          <div className="modal-inline-zone">
            {canResend ? (
              <button type="button" className="auth-inline-action" onClick={handleResend} disabled={isSendOtpLoading}>
                <RotateCcw size={16} aria-hidden="true" />
                {isSendOtpLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            ) : (
              <p>Resend code in <strong>{timer}s</strong></p>
            )}
          </div>
        )}

        <Button onClick={handleVerify} disabled={!isComplete || isVerifyLoading}>
          {isVerifyLoading ? 'Verifying...' : 'Verify'}
          <ArrowRight size={18} aria-hidden="true" />
        </Button>

        <button type="button" className="modal-back-button" onClick={props.onClose}>
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
      </section>
    </div>,
    document.body,
  );
};

export default OtpVerificationModal;
