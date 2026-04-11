import { ProductAppShell } from "@/components/layout/ProductAppShell";

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <ProductAppShell>{children}</ProductAppShell>;
}
