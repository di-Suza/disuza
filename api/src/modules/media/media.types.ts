type MediaKind = 'image' | 'video' | 'audio' | 'file';

type StoredMedia = {
  url: string;
  fileId: string;
  mediaType: MediaKind;
  filePath?: string;
  name?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: number;
  mime?: string;
};

type UploadMediaInput = {
  file: Express.Multer.File;
  folder: string;
  fileNamePrefix: string;
  tags?: string[];
  expectedType?: MediaKind;
};

type UploadImageInput = Omit<UploadMediaInput, 'expectedType'>;

type ClientUploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
};

export type { ClientUploadAuth, MediaKind, StoredMedia, UploadImageInput, UploadMediaInput };
