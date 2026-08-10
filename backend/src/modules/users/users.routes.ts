import { Router } from "express";
import { z } from "zod";
import { User, UserRole } from "../../models/User";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../middleware/error";
import { requireAuth, requireRole } from "../../middleware/auth";

export const usersRouter = Router();

const ROLES: UserRole[] = ["resident", "traveller", "operator", "admin"];

// Everything here is admin-only — user management is not exposed to
// operators, let alone the public client site.
usersRouter.use(requireAuth, requireRole("admin"));

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  role: z.enum(ROLES as [UserRole, ...UserRole[]]).optional(),
  q: z.string().trim().min(1).optional(),
});

usersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, role, q } = listQuerySchema.parse(req.query);
    const filter: Record<string, unknown> = {};
    if (role) filter.role = role;
    if (q) filter.email = { $regex: q, $options: "i" };

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-passwordHash"),
      User.countDocuments(filter),
    ]);

    res.json({ items, total, page, limit });
  })
);

const updateRoleSchema = z.object({
  role: z.enum(ROLES as [UserRole, ...UserRole[]]),
});

usersRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const { role } = updateRoleSchema.parse(req.body);
    const authedReq = req as typeof req & { user?: { id: string } };
    if (authedReq.user?.id === req.params.id && role !== "admin") {
      // Don't let an admin accidentally demote themselves out of the only
      // account that can undo it.
      throw new ApiError(400, "cannot_change_own_role");
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-passwordHash");
    if (!user) throw new ApiError(404, "user_not_found");
    res.json(user);
  })
);

usersRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const authedReq = req as typeof req & { user?: { id: string } };
    if (authedReq.user?.id === req.params.id) {
      throw new ApiError(400, "cannot_delete_self");
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, "user_not_found");
    res.json({ ok: true });
  })
);
