import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProfile,
  deleteProfile,
  listDescriptors,
  listProfiles,
  updateProfile,
  type ProfileInput,
  type Role,
} from "./api";

export function useProfiles(role?: Role) {
  return useQuery({
    queryKey: ["people", role ?? "all"],
    queryFn: () => listProfiles(role),
  });
}

export function useProfileDescriptors(role?: Role, enabled = true) {
  return useQuery({
    queryKey: ["people", "descriptors", role ?? "all"],
    queryFn: () => listDescriptors(role),
    enabled,
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) => createProfile(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: Partial<ProfileInput> }) =>
      updateProfile(args.id, args.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}
