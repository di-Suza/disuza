import { memo, type ImgHTMLAttributes } from 'react';

import { getOptimizedImage, type ImageOptimizationType } from '@/shared/utils/getOptimizedImage';

type ImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  type?: ImageOptimizationType;
};

const Image = ({ src, type = 'card', loading = 'lazy', decoding = 'async', ...props }: ImageProps) => (
  <img src={getOptimizedImage(src, type)} loading={loading} decoding={decoding} {...props} />
);

export default memo(Image);
