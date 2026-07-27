import { Loader2 } from 'lucide-react';
import { forwardRef, memo, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isLoading?: boolean;
  loadingLabel?: string;
  variant?: ButtonVariant;
};

const ButtonBase = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      'aria-label': ariaLabel,
      children,
      className,
      disabled,
      isLoading = false,
      loadingLabel = 'Loading',
      type = 'button',
      variant = 'primary',
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={cn('button', `button--${variant}`, isLoading && 'button--loading', className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      aria-label={isLoading ? loadingLabel : ariaLabel}
      {...props}
    >
      {isLoading ? <Loader2 className="button__spinner spin" size={17} aria-hidden="true" /> : children}
    </button>
  ),
);

ButtonBase.displayName = 'Button';

const Button = memo(ButtonBase);

export default Button;
