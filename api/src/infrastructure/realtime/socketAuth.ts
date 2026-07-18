import userRepository from '../../modules/users/user.repository.js';
import tokenService from '../../shared/utils/token.js';
import { type AuthenticatedSocket } from './realtime.types.js';

function getHandshakeToken(socket: AuthenticatedSocket): string | null {
  const authToken = socket.handshake.auth?.accessToken;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authorization = socket.handshake.headers.authorization;
  if (typeof authorization === 'string') {
    const [scheme, token] = authorization.split(' ');
    if (scheme === 'Bearer' && token) return token;
  }

  return null;
}

async function socketAuth(socket: AuthenticatedSocket, next: (error?: Error) => void) {
  try {
    const token = getHandshakeToken(socket);

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = tokenService.verifyAccessToken(token);
    const user = await userRepository.findPublicById(payload.id);

    if (!user || user.active === false) {
      return next(new Error('Account no longer exists'));
    }

    socket.user = {
      id: String(user._id),
      userName: user.userName,
      email: user.email,
      role: user.role,
      active: user.active,
      profilePicture: user.profilePicture,
    };

    return next();
  } catch {
    return next(new Error('Invalid or expired token'));
  }
}

export default socketAuth;
