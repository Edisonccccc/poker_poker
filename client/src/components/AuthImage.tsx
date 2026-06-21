import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Renders an authed photo by id (fetches the blob with the JWT, not a bare src). */
export function AuthImage({
  photoId,
  alt = "",
  className = "",
  fallback,
}: {
  photoId: string | null | undefined;
  alt?: string;
  className?: string;
  /** "avatar" shows a default person avatar when there's no photo. */
  fallback?: "avatar";
}) {
  const { data } = useQuery({
    queryKey: ["photo", photoId],
    queryFn: () => api.getBlob(`/photos/${photoId}`),
    enabled: !!photoId,
    staleTime: Infinity,
  });
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!data) return;
    const objectUrl = URL.createObjectURL(data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [data]);

  if (!photoId) {
    return fallback === "avatar" ? (
      <img src="/default-avatar.svg" alt={alt} className={className} />
    ) : (
      <div className={`bg-slate-200 ${className}`} aria-label={alt} />
    );
  }
  if (!url) return <div className={`bg-slate-200 ${className}`} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
}
