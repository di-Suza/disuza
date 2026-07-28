import { Loader2 } from 'lucide-react';
import { memo } from 'react';

import { cn } from '@/shared/utils/cn';
import './Spinner.css';

type LoadingSpinnerProps = {
  className?: string;
  inline?: boolean;
  label?: string;
  size?: number;
};

const LoadingSpinner = ({ className, inline = false, label = 'Loading', size = 22 }: LoadingSpinnerProps) => (
  <div className={cn(inline ? 'app-spinner-inline' : 'app-spinner-state', className)} role="status" aria-live="polite" aria-label={label}>
    <Loader2 className="spin" size={size} aria-hidden="true" />
  </div>
);

export default memo(LoadingSpinner);
