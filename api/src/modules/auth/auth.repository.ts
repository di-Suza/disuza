import otpRepository, { type OtpRepository } from './otp.repository.js';
import authSessionRepository, { type AuthSessionRepository } from './session/authSession.repository.js';
import userRepository, { type UserRepository } from '../users/user.repository.js';

class AuthRepository {
  constructor(
    readonly users: UserRepository = userRepository,
    readonly otps: OtpRepository = otpRepository,
    readonly sessions: AuthSessionRepository = authSessionRepository,
  ) {}
}

const authRepository = new AuthRepository();

export { AuthRepository };
export default authRepository;