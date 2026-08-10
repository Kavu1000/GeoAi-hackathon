import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../../models/User";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../services/jwt.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";

export const authRouter = Router();

const deviceSchema = z.object({
  deviceId: z.string().min(6),
  locale: z.enum(["lo", "en"]).default("lo"),
});

// Anonymous session for the mobile app: no password, just a stable device id.
authRouter.post(
  "/device",
  asyncHandler(async (req, res) => {
    const { deviceId, locale } = deviceSchema.parse(req.body);
    const user = await User.findOneAndUpdate(
      { deviceId },
      { $setOnInsert: { deviceId, locale, role: "resident" } },
      { upsert: true, new: true }
    );
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString() });
    res.json({ accessToken, refreshToken, user: { id: user._id, role: user.role } });
  })
);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["operator", "admin"]).default("operator"),
});

// Email/password accounts for dashboard users (operators, admins).
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password, role } = registerSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "email_taken");
    // Cost 10 (not 12) — Render's free-tier shared vCPU is throttled hard
    // enough that bcryptjs at 12 rounds can run past the platform's request
    // timeout and get the connection killed before it ever responds.
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, deviceId: `dash-${email}` });
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString() });
    res.status(201).json({ accessToken, refreshToken, user: { id: user._id, role: user.role } });
  })
);

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  locale: z.enum(["lo", "en"]).default("lo"),
  // Public self-signup is deliberately capped to resident/traveller — role
  // is never taken from client input beyond this choice, so there is no way
  // for a visitor to grant themselves operator/admin here.
  role: z.enum(["resident", "traveller"]).default("resident"),
});

// Public signup for the client web site (residents/travellers browsing the
// map). Kept separate from /register, which is for dashboard operator/admin
// accounts, so this endpoint can never be used to create a privileged user.
authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password, locale, role } = signupSchema.parse(req.body);
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, "email_taken");
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, role, locale, deviceId: `client-${email}` });
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ sub: user._id.toString() });
    res.status(201).json({ accessToken, refreshToken, user: { id: user._id, role: user.role, email: user.email } });
  })
);

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, "invalid_credentials");
    }
    const accessToken = signAccessToken({
      sub: user._id.toString(),
      role: user.role,
      operatorId: user.operatorId?.toString(),
    });
    const refreshToken = signRefreshToken({ sub: user._id.toString() });
    res.json({ accessToken, refreshToken, user: { id: user._id, role: user.role, email: user.email } });
  })
);

const refreshSchema = z.object({ refreshToken: z.string() });

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    let payload: { sub: string };
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new ApiError(401, "invalid_refresh_token");
    }
    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, "invalid_refresh_token");
    const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role });
    res.json({ accessToken });
  })
);
