import { Schema, model, Types } from "mongoose";

export type UserRole = "resident" | "traveller" | "operator" | "admin";

export interface UserDoc {
  _id: Types.ObjectId;
  email?: string;
  passwordHash?: string;
  deviceId: string;
  role: UserRole;
  operatorId?: Types.ObjectId;
  locale: "lo" | "en";
  points: number;
  createdAt: Date;
}

const userSchema = new Schema<UserDoc>({
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, select: false },
  deviceId: { type: String, required: true, unique: true, index: true },
  role: { type: String, enum: ["resident", "traveller", "operator", "admin"], default: "resident" },
  operatorId: { type: Schema.Types.ObjectId, ref: "Operator" },
  locale: { type: String, enum: ["lo", "en"], default: "lo" },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});

export const User = model<UserDoc>("User", userSchema);
