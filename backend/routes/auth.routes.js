import { Router } from "express";
import {
  sendRegisterOTP,
  verifyRegisterOTP,
  sendLoginOTP,
  verifyLoginOTP,
  logout,
  refreshAccessToken,
} from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/send-otp", sendRegisterOTP);
router.post("/verify-otp", verifyRegisterOTP);
router.post("/login/send-otp", sendLoginOTP);
router.post("/login/verify", verifyLoginOTP);
router.post("/logout", authenticate, logout);
router.post("/refresh-token", refreshAccessToken);

export default router;
