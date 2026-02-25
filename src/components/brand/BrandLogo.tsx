import Image from "next/image";

type BrandLogoProps = {
  variant?: "full" | "mark";
  className?: string;
  priority?: boolean;
};

export function BrandLogo({ variant = "full", className = "", priority = false }: BrandLogoProps) {
  const src = variant === "mark" ? "/branding/freestyle-mark.svg" : "/branding/freestyle-logo.svg";
  const width = variant === "mark" ? 40 : 156;
  const height = variant === "mark" ? 40 : 36;

  return (
    <span className={className}>
      <Image src={src} alt="FreeStyle" width={width} height={height} priority={priority} />
    </span>
  );
}
