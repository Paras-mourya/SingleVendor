import UserRepository from '../repositories/user.repository.js';
import AppError from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants.js';
import { generateToken, generateRefreshToken } from '../utils/jwt.js';
import AuditLogger from '../utils/audit.js';
import TransactionManager from '../utils/transaction.js';

class AuthService {
  async register(userData) {
    const existingUser = await UserRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new AppError(ERROR_MESSAGES.DUPLICATE_RESOURCE, HTTP_STATUS.CONFLICT, 'RESOURCE_EXISTS');
    }

    const user = await TransactionManager.execute(async (session) => {
      const newUser = await UserRepository.create(userData, { session });
      AuditLogger.log('USER_REGISTERED', 'USER', { userId: newUser._id });
      return newUser;
    });

    return user;
  }

  async login(email, password) {
    const user = await UserRepository.findByEmail(email, true);
    if (!user) {
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_AUTH');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      AuditLogger.security('LOGIN_FAILED', { email });
      throw new AppError(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED, 'INVALID_AUTH');
    }

    AuditLogger.log('USER_LOGIN', 'USER', { userId: user._id });
    return user;
  }

  generateTokens(user) {
    return {
      accessToken: generateToken(user._id),
      refreshToken: generateRefreshToken(user._id),
    };
  }
}

export default new AuthService();
