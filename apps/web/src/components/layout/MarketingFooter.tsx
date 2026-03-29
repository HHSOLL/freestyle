import Link from 'next/link';
import { BrandLogo } from '@/components/brand/BrandLogo';

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/8 bg-[#f3ede1]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:grid-cols-[1.2fr_1fr_1fr] sm:px-8">
        <div className="space-y-4">
          <BrandLogo />
          <p className="max-w-sm text-sm leading-7 text-black/56">
            FreeStyle is being rebuilt as a wardrobe operating system: from inspiration capture to purchase judgment and
            wear memory.
          </p>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/35">Paths</p>
          <div className="space-y-2 text-sm text-black/62">
            <Link className="block hover:text-black" href="/app">
              App Preview
            </Link>
            <Link className="block hover:text-black" href="/how-it-works">
              How It Works
            </Link>
            <Link className="block hover:text-black" href="/examples">
              Examples
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-black/35">Legacy</p>
          <div className="space-y-2 text-sm text-black/62">
            <Link className="block hover:text-black" href="/studio">
              Studio
            </Link>
            <Link className="block hover:text-black" href="/trends">
              Trends
            </Link>
            <Link className="block hover:text-black" href="/app/profile">
              Account
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
