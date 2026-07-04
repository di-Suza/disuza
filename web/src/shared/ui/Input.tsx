import { forwardRef, memo, type InputHTMLAttributes } from 'react';

import { cn } from '@/shared/utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

const InputBase = forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('input', className)} {...props} />
));

InputBase.displayName = 'Input';

const Input = memo(InputBase);

export default Input;
