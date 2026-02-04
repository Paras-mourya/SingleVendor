import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const generateToken = (userId, version = 0) => {
  return jwt.sign({ id: userId, version }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });
};

export const generateRefreshToken = (userId, version = 0, expiresIn = env.JWT_REFRESH_EXPIRE) => {
  return jwt.sign({ id: userId, version }, env.JWT_REFRESH_SECRET, {
    expiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
};
