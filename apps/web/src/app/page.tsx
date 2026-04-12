import Image from "next/image";
import Link from "next/link";
import { wardrobeThemeStyle } from "@freestyle/design-tokens";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";

const entryCards = [
  {
    href: "/app/closet",
    title: "Closet",
    body: "Measure the body, tune the mannequin, and dress it in real time.",
  },
  {
    href: "/app/canvas",
    title: "Canvas",
    body: "Pull garments into a styling board and compose saved looks.",
  },
  {
    href: "/app/community",
    title: "Community",
    body: "Browse quiet styling boards and save the silhouettes worth keeping.",
  },
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen px-4 py-5 text-[var(--fs-text)] sm:px-6 lg:px-8"
      style={{
        ...wardrobeThemeStyle,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(255,255,255,0) 28%), linear-gradient(180deg, #e7ebf0 0%, #d9dde2 34%, #cfd5db 100%)",
      }}
    >
      <div className="mx-auto flex max-w-[1720px] flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <SurfacePanel className="rounded-full px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full border border-black/8 bg-white/80 text-[11px] font-semibold tracking-[0.22em]">
                FS
              </div>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--fs-text-faint)]">
                  FreeStyle
                </div>
                <div className="text-[13px] font-semibold">Mannequin wardrobe system</div>
              </div>
            </div>
          </SurfacePanel>
          <div className="flex items-center gap-2">
            <Link href="/app/community" className="rounded-full border border-black/6 bg-white/54 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] no-underline">
              Community
            </Link>
            <Link href="/app/closet" className="rounded-full border border-black/6 bg-[#c8def8] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] no-underline">
              Enter closet
            </Link>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.2fr_0.76fr]">
          <SurfacePanel className="flex min-h-[740px] flex-col justify-between rounded-[34px] px-6 py-6">
            <div>
              <Eyebrow>Home</Eyebrow>
              <h1 className="mt-4 max-w-[12ch] text-[42px] font-semibold leading-[0.96] text-[#151b24] sm:text-[56px]">
                Build looks on a real body first.
              </h1>
              <p className="mt-5 max-w-[28ch] text-[14px] leading-7 text-black/52">
                FreeStyle starts from body measurements, maps them into a rigged mannequin, then lets the user dress,
                pose, compare, and save looks inside one continuous wardrobe runtime.
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/app/closet"
                className="flex items-center justify-between rounded-[26px] border border-black/6 bg-white/68 px-5 py-4 no-underline"
              >
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/35">Start</div>
                  <div className="mt-1 text-[18px] font-semibold text-[#151b24]">Closet fitting workspace</div>
                </div>
                <div className="rounded-full border border-black/8 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/42">
                  Live
                </div>
              </Link>
              <div className="grid gap-3 sm:grid-cols-2">
                <SurfacePanel className="rounded-[26px] px-4 py-4">
                  <Eyebrow>Body profile</Eyebrow>
                  <div className="mt-2 text-[18px] font-semibold text-[#151b24]">Real measurements</div>
                  <p className="mt-2 text-[12px] leading-6 text-black/48">
                    Height, shoulder, chest, waist, hip, arm, and leg lengths feed the avatar mapping layer.
                  </p>
                </SurfacePanel>
                <SurfacePanel className="rounded-[26px] px-4 py-4">
                  <Eyebrow>Canvas</Eyebrow>
                  <div className="mt-2 text-[18px] font-semibold text-[#151b24]">Saved styling boards</div>
                  <p className="mt-2 text-[12px] leading-6 text-black/48">
                    Move garments into a styling surface without collapsing the fitting runtime.
                  </p>
                </SurfacePanel>
              </div>
            </div>
          </SurfacePanel>

          <SurfacePanel className="relative min-h-[740px] overflow-hidden rounded-[38px] px-6 py-6">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.6),transparent_30%)]" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between">
                <div>
                  <Eyebrow>Reference shell</Eyebrow>
                  <div className="mt-2 text-[24px] font-semibold text-[#151b24]">Closet is the product anchor.</div>
                </div>
                <div className="rounded-full border border-black/6 bg-white/76 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-black/38">
                  reference
                </div>
              </div>

              <div className="relative mt-5 flex-1 overflow-hidden rounded-[32px] border border-black/8 bg-white/38">
                <Image
                  src="/wardrobe-reference.jpg"
                  alt="Wardrobe reference UI"
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 1280px) 100vw, 50vw"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#d3d9df] via-[#d3d9df]/70 to-transparent px-6 pb-6 pt-14">
                  <div className="max-w-[520px] text-[13px] leading-6 text-black/54">
                    The main fitting surface keeps the same hierarchy as the reference: left body rail, centered stage,
                    right catalog rail, micro-toolbar above, and a quiet segmented control at the bottom.
                  </div>
                </div>
              </div>
            </div>
          </SurfacePanel>

          <div className="flex min-h-[740px] flex-col gap-4">
            {entryCards.map((entry) => (
              <Link key={entry.href} href={entry.href} className="no-underline">
                <SurfacePanel className="rounded-[30px] px-5 py-5">
                  <Eyebrow>{entry.title}</Eyebrow>
                  <div className="mt-3 text-[22px] font-semibold text-[#151b24]">{entry.title}</div>
                  <p className="mt-3 text-[13px] leading-6 text-black/48">{entry.body}</p>
                </SurfacePanel>
              </Link>
            ))}
            <SurfacePanel className="flex flex-1 flex-col justify-between rounded-[30px] px-5 py-5">
              <div>
                <Eyebrow>Product boundary</Eyebrow>
                <div className="mt-3 text-[18px] font-semibold text-[#151b24]">Legacy and lab stay out of the main loop.</div>
                <p className="mt-3 text-[13px] leading-6 text-black/48">
                  The primary flow is now body profile, fitting, canvas, community, and profile. Shopping-link import and
                  AI experiments stay quarantined.
                </p>
              </div>
              <Link
                href="/app/profile"
                className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white/72 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] no-underline"
              >
                Open profile
              </Link>
            </SurfacePanel>
          </div>
        </div>
      </div>
    </main>
  );
}
