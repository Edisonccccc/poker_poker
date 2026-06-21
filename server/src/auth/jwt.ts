import jwt from "jsonwebtoken";
import { env } from "../env";

export type Role = "admin" | "host";
export interface JwtPayload {
  sub: string; // user id
  role: Role;
}

const EXPIRES_IN = "30d";

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_SECRET) as JwtPayload;
