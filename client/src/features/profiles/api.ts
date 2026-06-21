import { api } from "@/lib/api";
import type { Candidate } from "@/lib/face";

/** URL segment for each profile kind. */
export type ProfileKind = "players" | "dealers";

export interface Profile {
  id: string;
  name: string;
  photoId: string | null;
  createdAt: string;
}

export interface ProfileInput {
  name: string;
  photoId?: string | null;
  faceDescriptor?: number[];
}

export const listProfiles = (kind: ProfileKind) =>
  api.get<Profile[]>(`/${kind}`);

export const createProfile = (kind: ProfileKind, body: ProfileInput) =>
  api.post<Profile>(`/${kind}`, body);

export const updateProfile = (
  kind: ProfileKind,
  id: string,
  body: Partial<ProfileInput>,
) => api.patch<Profile>(`/${kind}/${id}`, body);

export const deleteProfile = (kind: ProfileKind, id: string) =>
  api.del<void>(`/${kind}/${id}`);

export const listDescriptors = (kind: ProfileKind) =>
  api.get<Candidate[]>(`/${kind}/descriptors`);

export const singular = (kind: ProfileKind) =>
  kind === "players" ? "player" : "dealer";
