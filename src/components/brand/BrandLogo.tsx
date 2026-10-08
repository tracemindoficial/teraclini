import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/teraclini-logo-3d-480.webp.asset.json";
import logoLargeAsset from "@/assets/teraclini-logo-3d-960.webp.asset.json";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  to?: "/" | "/meu-dia" | "/admin";
};

export function BrandLogo({ compact = false, className, to = "/" }: BrandLogoProps) {
  return (
    <Link
      to={to}
      aria-label="TeraClini — início"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      {compact ? (
        <img src="/favicon.png" alt="" className="size-9 object-contain" />
      ) : (
        <img
          src={logoAsset.url}
          srcSet={`${logoAsset.url} 480w, ${logoLargeAsset.url} 960w`}
          sizes="(max-width: 640px) 144px, 192px"
          width={2005}
          height={784}
          decoding="async"
          alt="TeraClini — Sua prática clínica. Em um só lugar."
          className="h-auto w-full object-contain drop-shadow-sm"
        />
      )}
    </Link>
  );
}