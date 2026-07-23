import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import Otp from "../models/Otp.js";
import { createAndSendOTP } from "../services/otp.service.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateTokens.js";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MAX_OTP_ATTEMPTS = 5;
const REFRESH_TOKEN_SALT_ROUNDS = 12;

export const sendRegisterOTP = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: "Username and email are required",
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({
        success: false,
        message: "Username must be 3-30 characters (letters, numbers, underscores)",
      });
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const existingUsername = await User.findOne({ username: trimmedUsername });
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: "Username already taken",
      });
    }

    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    await createAndSendOTP(trimmedUsername, trimmedEmail, "register");

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (err) {
    console.error("[sendRegisterOTP]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

export const verifyRegisterOTP = async (req, res) => {
  try {
    const { username, email, otp } = req.body;

    if (!username || !email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and OTP are required",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    const otpRecord = await Otp.findOne({
      email: trimmedEmail,
      purpose: "register",
    }).select("+otp");

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Request a new one.",
      });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Request a new OTP.",
      });
    }

    const isValid = await bcrypt.compare(trimmedOtp, otpRecord.otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - otpRecord.attempts} attempts remaining.`,
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const user = await User.create({
      username: username.trim(),
      email: trimmedEmail,
      lastLogin: new Date(),
      lastLoginIP: req.ip,
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    user.refreshToken = hashedRefreshToken;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }
    console.error("[verifyRegisterOTP]", err);
    return res.status(500).json({
      success: false,
      message: "Verification failed. Please try again.",
    });
  }
};

export const sendLoginOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({ email: trimmedEmail, isDeleted: false });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact support.",
      });
    }

    await createAndSendOTP(user.username, trimmedEmail, "login");

    return res.status(200).json({
      success: true,
      message: "Login OTP sent to your email",
    });
  } catch (err) {
    console.error("[sendLoginOTP]", err);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
    });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedOtp = otp.trim();

    const user = await User.findOne({ email: trimmedEmail, isDeleted: false });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated. Contact support.",
      });
    }

    const otpRecord = await Otp.findOne({
      email: trimmedEmail,
      purpose: "login",
    }).select("+otp");

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or not found. Request a new one.",
      });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
      return res.status(429).json({
        success: false,
        message: "Too many failed attempts. Request a new OTP.",
      });
    }

    const isValid = await bcrypt.compare(trimmedOtp, otpRecord.otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - otpRecord.attempts} attempts remaining.`,
      });
    }

    await Otp.deleteOne({ _id: otpRecord._id });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    user.refreshToken = hashedRefreshToken;
    user.lastLogin = new Date();
    user.lastLoginIP = req.ip;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    console.error("[verifyLoginOTP]", err);
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
};

export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, { refreshToken: null });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("[logout]", err);
    return res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError" ? "Refresh token expired. Please login again." : "Invalid refresh token";
      return res.status(401).json({ success: false, message });
    }

    const user = await User.findById(decoded.id).select("+refreshToken");

    if (!user || !user.refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please login again.",
      });
    }

    if (!user.isActive || user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

    if (!isMatch) {
      user.refreshToken = null;
      await user.save();
      return res.status(401).json({
        success: false,
        message: "Token reuse detected. Please login again.",
      });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    const hashedNewRefresh = await bcrypt.hash(newRefreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    user.refreshToken = hashedNewRefresh;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Tokens refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    console.error("[refreshAccessToken]", err);
    return res.status(500).json({
      success: false,
      message: "Token refresh failed",
    });
  }
};
