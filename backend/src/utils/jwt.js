// backend/src/utils/jwt.js
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateTokens = (userId, email) => {
  const payload = {
    userId: userId,
    email: email,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Re-throw the original error, so that specific JWT errors (like TokenExpiredError) can be caught
    throw error;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};

export const generateAccessTokenFromRefresh = (refreshToken) => {
  try {
    const decoded = verifyRefreshToken(refreshToken);
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
  } catch (error) {
    throw new Error("Invalid refresh token");
  }
};
