import bcrypt from 'bcryptjs';

class PasswordService {
  private readonly saltRounds = 12;

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  compare(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

const passwordService = new PasswordService();

export { PasswordService };
export default passwordService;