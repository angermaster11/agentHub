import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email"],
    },

    plan: {
      type: String,
      enum: ["free", "starter", "premium", "enterprise"],
      default: "free",
      index: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    isEmailVerified: {
      type: Boolean,
      default: true, // OTP verify hone ke baad hi user create hoga
    },

    refreshToken: {
      type: String,
      default: null,
      select: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    lastLoginIP: {
      type: String,
      default: null,
    },

    avatar: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("User", userSchema);