import type { Role } from '../shared/constants/roles.js';

type AuthRequestUser = {
  id: string;
  userName: string;
  email: string;
  role: Role;
  active: boolean;
  profilePicture?: {
    url: string;
    fileId: string;
  };
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthRequestUser;
    }
  }
}

export {};