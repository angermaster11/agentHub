import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    otp: {
      type: String,
      required: true,
      select: false,
    },

    purpose: {
      type: String,
      enum: ["register", "login"],
      required: true,
    },

    attempts: {
      type: Number,
      default: 0,
    },

    expiresAt: {
      type: Date,
      required: true,
      expires: 0, // MongoDB TTL
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Otp", otpSchema);