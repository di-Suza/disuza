import { forwardRef, memo, type ButtonHTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const ButtonBase = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn('button', `button--${variant}`, className)} {...props} />
  ),
);

ButtonBase.displayName = 'Button';

const Button = memo(ButtonBase);

export default Button;
