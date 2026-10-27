import { useState } from "react";

type AppIconProps = {
  src?: string | null;
  name: string;
  className: string;
  imageClassName?: string;
  fallbackClassName?: string;
  decorative?: boolean;
  loading?: "eager" | "lazy";
};

export function AppIcon({
  src,
  name,
  className,
  imageClassName = "",
  fallbackClassName = "",
  decorative = false,
  loading = "lazy",
}: AppIconProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initial = name.trim().slice(0, 1).toUpperCase() || "?";

  if (!src || failedSrc === src) {
    return (
      <div
        aria-hidden={decorative || undefined}
        aria-label={decorative ? undefined : `${name} icon`}
        role={decorative ? undefined : "img"}
        className={`flex shrink-0 items-center justify-center font-display ${className} ${fallbackClassName}`}
      >
        {initial}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={decorative ? "" : name}
      onError={() => setFailedSrc(src)}
      className={`${className} ${imageClassName}`}
      loading={loading}
    />
  );
}
