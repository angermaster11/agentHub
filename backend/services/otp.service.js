import bcrypt from "bcrypt";

import Otp from "../models/Otp.js";
import generateOTP from "../utils/generateOTP.js";
import { sendOTPEmail } from "./email.service.js";

export const createAndSendOTP = async (
  username,
  email,
  purpose = "register"
) => {
  await Otp.deleteMany({ email, purpose });

  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 12);

  await Otp.create({
    username,
    email,
    otp: otpHash,
    purpose,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
  });

  await sendOTPEmail(email, otp, purpose);
};