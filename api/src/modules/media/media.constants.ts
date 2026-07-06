const IMAGE_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;

const VIDEO_MIME_EXTENSION_MAP = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
} as const;

const MEDIA_MIME_EXTENSION_MAP = {
  ...IMAGE_MIME_EXTENSION_MAP,
  ...VIDEO_MIME_EXTENSION_MAP,
} as const;

const ALLOWED_IMAGE_MIME_TYPES = Object.keys(IMAGE_MIME_EXTENSION_MAP);
const ALLOWED_VIDEO_MIME_TYPES = Object.keys(VIDEO_MIME_EXTENSION_MAP);
const ALLOWED_MEDIA_MIME_TYPES = Object.keys(MEDIA_MIME_EXTENSION_MAP);

const MEDIA_FOLDERS = {
  profilePictures: '/DevloopFeed/ProfilePictures',
  postImages: (userId: string, postId: string) => `/DevloopFeed/Posts/${userId}/${postId}`,
  postMedia: (userId: string, postId: string) => `/DevloopFeed/Posts/${userId}/${postId}`,
} as const;

const MEDIA_TAGS = {
  profilePicture: 'profile-picture',
  postImage: 'post-image',
  postVideo: 'post-video',
  postMedia: 'post-media',
} as const;

export {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  IMAGE_MIME_EXTENSION_MAP,
  MEDIA_FOLDERS,
  MEDIA_MIME_EXTENSION_MAP,
  MEDIA_TAGS,
  VIDEO_MIME_EXTENSION_MAP,
};
