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

const AUDIO_MIME_EXTENSION_MAP = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
} as const;

const MEDIA_MIME_EXTENSION_MAP = {
  ...IMAGE_MIME_EXTENSION_MAP,
  ...VIDEO_MIME_EXTENSION_MAP,
  ...AUDIO_MIME_EXTENSION_MAP,
} as const;

const CHAT_FILE_EXTENSION_FALLBACK = 'bin';
const CHAT_ATTACHMENT_MAX_SIZE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = Object.keys(IMAGE_MIME_EXTENSION_MAP);
const ALLOWED_VIDEO_MIME_TYPES = Object.keys(VIDEO_MIME_EXTENSION_MAP);
const ALLOWED_AUDIO_MIME_TYPES = Object.keys(AUDIO_MIME_EXTENSION_MAP);
const ALLOWED_MEDIA_MIME_TYPES = Object.keys(MEDIA_MIME_EXTENSION_MAP);

const MEDIA_FOLDERS = {
  profilePictures: '/Disuza/ProfilePictures',
  postImages: (userId: string, postId: string) => `/Disuza/Posts/${userId}/${postId}`,
  postMedia: (userId: string, postId: string) => `/Disuza/Posts/${userId}/${postId}`,
  chatAttachments: (conversationId: string) => `/Disuza/Chats/${conversationId}`,
} as const;

const MEDIA_TAGS = {
  profilePicture: 'profile-picture',
  postImage: 'post-image',
  postVideo: 'post-video',
  postMedia: 'post-media',
  chatAttachment: 'chat-attachment',
} as const;

export {
  ALLOWED_AUDIO_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  AUDIO_MIME_EXTENSION_MAP,
  CHAT_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_FILE_EXTENSION_FALLBACK,
  IMAGE_MIME_EXTENSION_MAP,
  MEDIA_FOLDERS,
  MEDIA_MIME_EXTENSION_MAP,
  MEDIA_TAGS,
  VIDEO_MIME_EXTENSION_MAP,
};
