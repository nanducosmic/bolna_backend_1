import jwt from "jsonwebtoken";
import User from "../models/User";
import { Request, Response, NextFunction } from "express";

// Extend Express Request type locally if needed
interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const secret = process.env.JWT_SECRET;
      
      if (!secret) {
        console.error("FATAL: JWT_SECRET is not defined in .env file");
        return res.status(500).json({ message: "Server configuration error" });
      }

      const decoded: any = jwt.verify(token, secret);

      // We ensure we get the role and tenant_id from the database
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User no longer exists" });
      }

      next();
    } catch (error: any) {
      console.error("JWT Verification Error:", error.message);
      return res.status(401).json({ message: `Not authorized: ${error.message}` });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

/**
 * SCOPE: Super Admin Only
 * Used for: Assigning credits, Managing Sub-users, Global Results
 */
export const superAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ 
      message: `Access denied: Role '${req.user?.role}' does not have Super Admin privileges.` 
    });
  }
};

/**
 * SCOPE: Sub-User (Client Admin) Only
 * Used for: Contact Base, Training AI, Running Campaigns
 */
export const clientAdminOnly = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ 
      message: "Access denied: This area is reserved for Client Administrators." 
    });
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        message: `Access denied: Role '${req.user?.role}' does not have required privileges.`
      });
    }
  };
};