import { UserRound } from 'lucide-react';
import { memo, type ImgHTMLAttributes, type ReactNode, useEffect, useMemo, useState } from 'react';

import { getOptimizedImage, type ImageOptimizationType } from '@/shared/utils/getOptimizedImage';

type AvatarImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  imageType?: ImageOptimizationType;
  fallback?: ReactNode;
  fallbackSize?: number;
};

const AvatarImage = ({
  alt = '',
  decoding = 'async',
  fallback,
  fallbackSize = 18,
  imageType = 'avatarSmall',
  loading = 'lazy',
  onError,
  src,
  ...props
}: AvatarImageProps) => {
  const [hasError, setHasError] = useState(false);
  const optimizedSrc = useMemo(() => {
    if (!src || typeof src !== 'string' || !src.trim()) return '';
    return getOptimizedImage(src, imageType) || src;
  }, [imageType, src]);

  useEffect(() => {
    setHasError(false);
  }, [optimizedSrc]);

  if (!optimizedSrc || hasError) {
    return fallback ?? <UserRound size={fallbackSize} aria-hidden="true" />;
  }

  return (
    <img
      alt={alt}
      decoding={decoding}
      loading={loading}
      src={optimizedSrc}
      onError={(event) => {
        setHasError(true);
        onError?.(event);
      }}
      {...props}
    />
  );
};

export default memo(AvatarImage);
