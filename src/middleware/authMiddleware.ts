import jwt from "jsonwebtoken";
import User from "../models/User";

export const protect = async (req: any, res: any, next: any) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      // Extract token from "Bearer <token>"
      token = req.headers.authorization.split(" ")[1];

      // Use ONLY the secret from .env
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        console.error("FATAL: JWT_SECRET is not defined in .env file");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded: any = jwt.verify(token, secret);

      // Attach user to request and ensure we get the role and tenant_id
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      next();
    } catch (error: any) {
      console.error("JWT Verification Error:", error.message);
      // This will catch the "malformed" error if the token string is broken
      return res.status(401).json({ message: `Not authorized: ${error.message}` });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

/**
 * Combined Admin Check
 * Allows both 'super_admin' (Platform Owner) and 'admin' (Tenant Owner)
 */
export const adminOnly = (req: any, res: any, next: any) => {
  if (req.user && (req.user.role === "super_admin" || req.user.role === "admin")) {
    next();
  } else {
    res.status(403).json({ message: `Access denied: ${req.user?.role} is not an admin` });
  }
};