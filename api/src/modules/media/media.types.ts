type StoredMedia = {
  url: string;
  fileId: string;
  filePath?: string;
  name?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size?: number;
  mime?: string;
};

type UploadImageInput = {
  file: Express.Multer.File;
  folder: string;
  fileNamePrefix: string;
  tags?: string[];
};

type ClientUploadAuth = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
};

export type { ClientUploadAuth, StoredMedia, UploadImageInput };
