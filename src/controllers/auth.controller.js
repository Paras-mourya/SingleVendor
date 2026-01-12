import AuthService from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { HTTP_STATUS, SUCCESS_MESSAGES, CONFIG } from '../constants.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  const user = await AuthService.register({ name, email, password });
  const { accessToken } = AuthService.generateTokens(user);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + CONFIG.SECURITY.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
  };

  res.status(HTTP_STATUS.CREATED)
    .cookie('token', accessToken, cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.CREATED, { user, token: accessToken }, SUCCESS_MESSAGES.REGISTER_SUCCESS));
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await AuthService.login(email, password);
  const { accessToken } = AuthService.generateTokens(user);

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + CONFIG.SECURITY.COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV === 'production',
  };

  res.status(HTTP_STATUS.OK)
    .cookie('token', accessToken, cookieOptions)
    .json(new ApiResponse(HTTP_STATUS.OK, { user, token: accessToken }, SUCCESS_MESSAGES.LOGIN_SUCCESS));
};
