const IMAGE_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;

const ALLOWED_IMAGE_MIME_TYPES = Object.keys(IMAGE_MIME_EXTENSION_MAP);

const MEDIA_FOLDERS = {
  profilePictures: '/DevloopFeed/ProfilePictures',
  postImages: (userId: string, postId: string) => `/DevloopFeed/Posts/${userId}/${postId}`,
} as const;

const MEDIA_TAGS = {
  profilePicture: 'profile-picture',
  postImage: 'post-image',
} as const;

export {
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_MIME_EXTENSION_MAP,
  MEDIA_FOLDERS,
  MEDIA_TAGS,
};
