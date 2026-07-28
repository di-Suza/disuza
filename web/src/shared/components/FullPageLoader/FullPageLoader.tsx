import { memo } from 'react';

import './FullPageLoader.css';
import LoadingSpinner from '@/shared/ui/LoadingSpinner';

type FullPageLoaderProps = {
  label?: string;
};

const FullPageLoader = ({ label = 'Syncing workspace' }: FullPageLoaderProps) => (
  <div className="full-page-loader" role="status" aria-live="polite" aria-label={label}>
    <LoadingSpinner label={label} />
  </div>
);

export default memo(FullPageLoader);
