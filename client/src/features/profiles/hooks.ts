import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProfile,
  deleteProfile,
  listDescriptors,
  listProfiles,
  updateProfile,
  type ProfileInput,
  type ProfileKind,
} from "./api";

export function useProfiles(kind: ProfileKind) {
  return useQuery({ queryKey: [kind], queryFn: () => listProfiles(kind) });
}

export function useProfileDescriptors(kind: ProfileKind, enabled = true) {
  return useQuery({
    queryKey: [kind, "descriptors"],
    queryFn: () => listDescriptors(kind),
    enabled,
  });
}

export function useCreateProfile(kind: ProfileKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProfileInput) => createProfile(kind, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
}

export function useUpdateProfile(kind: ProfileKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: Partial<ProfileInput> }) =>
      updateProfile(kind, args.id, args.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
}

export function useDeleteProfile(kind: ProfileKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(kind, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
}
