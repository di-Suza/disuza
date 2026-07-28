import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { getPostMedia, isVideoMedia } from '@/features/posts/model/post.helpers';
import type { PostMedia } from '@/features/posts/model/post.types';
import { cn } from '@/shared/utils/cn';
import { getOptimizedImage } from '@/shared/utils/getOptimizedImage';

type PostMediaCarouselProps = {
  media?: PostMedia[];
  className?: string;
};

const PostMediaCarousel = ({ className, media }: PostMediaCarouselProps) => {
  const orderedMedia = useMemo(() => getPostMedia({ media }), [media]);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeMedia = orderedMedia[activeIndex];

  useEffect(() => {
    setActiveIndex(0);
  }, [orderedMedia.length]);

  const goToPrevious = useCallback(() => {
    setActiveIndex((currentIndex) => (currentIndex === 0 ? orderedMedia.length - 1 : currentIndex - 1));
  }, [orderedMedia.length]);

  const goToNext = useCallback(() => {
    setActiveIndex((currentIndex) => (currentIndex + 1) % orderedMedia.length);
  }, [orderedMedia.length]);

  if (!activeMedia) return null;

  const hasMultipleMedia = orderedMedia.length > 1;
  const imageUrl = !isVideoMedia(activeMedia) ? getOptimizedImage(activeMedia.url, 'post') || activeMedia.url : '';

  return (
    <div className={cn('post-media-carousel', className)}>
      <div className="post-media-carousel__stage">
        {isVideoMedia(activeMedia) ? (
          <video src={activeMedia.url} controls preload="metadata" />
        ) : (
          <img src={imageUrl} alt={activeMedia.name || 'Post media'} loading="lazy" />
        )}

        {isVideoMedia(activeMedia) && (
          <span className="post-media-carousel__type" aria-hidden="true">
            <Play size={14} />
          </span>
        )}

        {hasMultipleMedia && (
          <>
            <button type="button" className="post-media-carousel__nav post-media-carousel__nav--left" onClick={goToPrevious} aria-label="Previous media">
              <ChevronLeft size={20} />
            </button>
            <button type="button" className="post-media-carousel__nav post-media-carousel__nav--right" onClick={goToNext} aria-label="Next media">
              <ChevronRight size={20} />
            </button>
          </>
        )}
      </div>

      {hasMultipleMedia && (
        <div className="post-media-carousel__dots" aria-label="Media position">
          {orderedMedia.map((item, index) => (
            <button
              type="button"
              key={`${item.fileId}-${index}`}
              className={cn(index === activeIndex && 'is-active')}
              onClick={() => setActiveIndex(index)}
              aria-label={`Open media ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(PostMediaCarousel);
