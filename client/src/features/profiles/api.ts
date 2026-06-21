import { api } from "@/lib/api";
import type { Candidate } from "@/lib/face";

export type Role = "player" | "dealer" | "host" | "admin";

export interface Profile {
  id: string;
  name: string;
  photoId: string | null;
  roles: string[];
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  photoId?: string | null;
  roles?: string[];
  faceDescriptor?: number[];
}

const q = (role?: Role) => (role ? `?role=${role}` : "");

export const listProfiles = (role?: Role) =>
  api.get<Profile[]>(`/people${q(role)}`);

export const createProfile = (body: ProfileInput) =>
  api.post<Profile>("/people", body);

export const updateProfile = (id: string, body: Partial<ProfileInput>) =>
  api.patch<Profile>(`/people/${id}`, body);

export const deleteProfile = (id: string) => api.del<void>(`/people/${id}`);

export const listDescriptors = (role?: Role) =>
  api.get<Candidate[]>(`/people/descriptors${q(role)}`);
