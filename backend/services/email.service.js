import transporter from "../config/mail.js";

export const sendOTPEmail = async (email, otp, purpose = "register") => {
  const subject =
    purpose === "login"
      ? "Login OTP - RangamAI"
      : "Verify your email - RangamAI";

  const heading =
    purpose === "login"
      ? "Login to RangamAI"
      : "Welcome to RangamAI";

  const description =
    purpose === "login"
      ? "Use the OTP below to login to your account."
      : "Use the OTP below to verify your email.";

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    html: `
    <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;padding:30px;background:#ffffff;border:1px solid #e5e5e5;border-radius:10px">
        <h2 style="color:#111827;text-align:center">${heading}</h2>
        <p style="font-size:16px;color:#374151">${description}</p>
        <div style="margin:30px auto;text-align:center">
            <span style="font-size:34px;font-weight:bold;letter-spacing:8px;background:#2563eb;color:white;padding:15px 25px;border-radius:8px">
                ${otp}
            </span>
        </div>
        <p style="color:#6b7280">This OTP is valid for <strong>5 minutes</strong>.</p>
        <p style="color:#ef4444">Never share this OTP with anyone.</p>
        <hr>
        <p style="font-size:13px;color:#9ca3af">&copy; RangamAI</p>
    </div>
    `,
  });
};
