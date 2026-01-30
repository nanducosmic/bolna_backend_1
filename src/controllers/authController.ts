import { Request, Response } from "express";
import User from "../models/User";
import Tenant from "../models/Tenant"; // Ensure you have this model
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Helper to create JWT - Now includes tenant_id
const generateToken = (id: string, role: string, tenant_id: string) => {
  return jwt.sign({ id, role, tenant_id }, process.env.JWT_SECRET || "secret_key", {
    expiresIn: "30d",
  });
};

// @desc    Register new user & Create Tenant
// @route   POST /api/auth/register
export const registerUser = async (req: Request, res: Response) => {
  const { name, email, password, role, tenant_name } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    // 1. Create a new Tenant for the Sub-user (Client)
    // Scope: "Sub users - Clients" need their own isolated space
    const newTenant = await Tenant.create({
      name: tenant_name || `${name}'s Org`,
      balance: 0 // Default credits
    });

    // 2. Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create User linked to the Tenant
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "admin", // Default to admin (client)
      tenant_id: newTenant._id,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      token: generateToken(user._id.toString(), user.role, user.tenant_id.toString()),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    
    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id, // Important for Frontend Context
        token: generateToken(
          user._id.toString(), 
          user.role, 
          user.tenant_id ? user.tenant_id.toString() : ""
        ),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};