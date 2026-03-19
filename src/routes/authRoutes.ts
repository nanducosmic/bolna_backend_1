import express from "express";
import { registerUser, loginUser } from "../controllers/authController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

router.post("/register", (req, res, next) => {
  // Optional protection: If a token is provided, we use 'protect' to identify the inviter
  if (req.headers.authorization) {
    return protect(req, res, next);
  }
  next();
}, registerUser);
router.post("/login", loginUser);

export default router;