type ImageOptimizationType = 'avatar' | 'avatarSmall' | 'thumbnail' | 'card' | 'preview' | 'post' | 'hero';

const imageTransformations: Record<ImageOptimizationType, string> = {
  avatar: 'w-220,h-220,c-maintain_ratio,q-72',
  avatarSmall: 'w-96,h-96,c-maintain_ratio,q-68',
  thumbnail: 'w-220,h-220,c-maintain_ratio,q-68',
  card: 'w-520,c-maintain_ratio,q-72',
  preview: 'w-760,c-maintain_ratio,q-78',
  post: 'w-1100,c-maintain_ratio,q-82',
  hero: 'w-1600,c-maintain_ratio,q-88',
};

const getOptimizedImage = (url?: string, type: ImageOptimizationType = 'card') => {
  if (!url || typeof url !== 'string') return url;

  try {
    const imageUrl = new URL(url);
    if (!imageUrl.hostname.includes('imagekit.io')) return url;

    imageUrl.searchParams.set('tr', imageTransformations[type] || imageTransformations.card);
    return imageUrl.toString();
  } catch {
    return url;
  }
};

export { getOptimizedImage, type ImageOptimizationType };
