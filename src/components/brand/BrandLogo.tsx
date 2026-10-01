import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/teraclini-logo.png.asset.json";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  compact?: boolean;
  className?: string;
  to?: "/" | "/meu-dia";
};

export function BrandLogo({ compact = false, className, to = "/" }: BrandLogoProps) {
  return (
    <Link
      to={to}
      aria-label="TeraClini — início"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      {compact ? (
        <img src="/favicon.png" alt="" className="size-10 object-contain" />
      ) : (
        <img
          src={logoAsset.url}
          alt="TeraClini — Sua prática clínica. Em um só lugar."
          className="h-auto w-full object-contain"
        />
      )}
    </Link>
  );
}