import jwt from "jsonwebtoken";

export const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token";

    return res.status(401).json({ success: false, message });
  }
};
