import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** Renders an authed photo by id (fetches the blob with the JWT, not a bare src). */
export function AuthImage({
  photoId,
  alt = "",
  className = "",
}: {
  photoId: string | null | undefined;
  alt?: string;
  className?: string;
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

  if (!photoId || !url) {
    return <div className={`bg-white/10 ${className}`} aria-label={alt} />;
  }
  return <img src={url} alt={alt} className={className} />;
}
