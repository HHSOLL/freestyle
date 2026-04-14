import Image from "next/image";
import Link from "next/link";
import { wardrobeThemeStyle } from "@freestyle/design-tokens";
import { Eyebrow } from "@freestyle/ui";
import { AppTopBar } from "@/components/layout/AppTopBar";
import styles from "@/components/product/reference-shell.module.css";

export function HomeLandingExperience() {
  return (
    <div
      className="min-h-screen text-[var(--fs-text)]"
      style={{
        ...wardrobeThemeStyle,
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(255,255,255,0) 28%), linear-gradient(180deg, #e7ebf0 0%, #d9dde2 34%, #cfd5db 100%)",
      }}
    >
      <AppTopBar activeSurface={null} />

      <main className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1720px]">
          <section className={styles.landingShell}>
            <section className={styles.landingLeftPanel}>
              <div>
                <Eyebrow>Landing</Eyebrow>
                <h1 className="mt-6 max-w-[8ch] text-[48px] font-semibold leading-[0.96] text-[#151b24] sm:text-[64px]">
                  Start in the closet. Style everywhere else.
                </h1>
                <p className="mt-5 max-w-[26ch] text-[14px] leading-7 text-black/52">
                  FreeStyle begins from body measurements, fits garments on a live human mannequin, and moves finished looks
                  into canvas boards and a quieter social feed.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[28px] border border-black/8 bg-white/58 px-5 py-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/34">Core journey</div>
                  <div className="mt-3 space-y-3 text-[13px] leading-6 text-black/48">
                    <div>1. Build a measurement-based mannequin in Closet.</div>
                    <div>2. Fit garments in the same stage, not a separate page.</div>
                    <div>3. Move finished looks into Canvas and Community.</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/app/closet"
                    className="inline-flex items-center justify-center rounded-full border border-black/8 bg-[#c8def8] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] no-underline"
                  >
                    Open closet
                  </Link>
                  <Link
                    href="/app/community"
                    className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white/64 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] no-underline"
                  >
                    Browse community
                  </Link>
                </div>
              </div>
            </section>

            <section className={styles.landingCenter}>
              <Image
                src="/wardrobe-reference.jpg"
                alt="Wardrobe reference"
                fill
                className="object-cover object-center"
                sizes="(max-width: 1280px) 100vw, 50vw"
                priority
              />
              <div className={styles.landingCenterOverlay} />
              <div className="absolute left-7 top-7 rounded-full border border-black/6 bg-white/68 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
                Shared shell
              </div>
              <div className="absolute right-7 top-7 rounded-full border border-black/6 bg-white/68 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
                Home / Closet / Canvas / Community
              </div>
              <div className={styles.landingCenterFooter}>
                <div className="grid gap-3 md:grid-cols-3">
                  {[
                    { title: "Closet", body: "v18-derived wardrobe stage with mannequin fitting built in" },
                    { title: "Canvas", body: "The same shell language, but the center becomes a composition board" },
                    { title: "Community", body: "An image-first feed for saved looks and quieter styling references" },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/45 bg-white/40 px-4 py-4 backdrop-blur-[14px]">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-black/34">{item.title}</div>
                      <div className="mt-2 text-[13px] font-semibold text-[#151b24]">{item.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={styles.landingRightPanel}>
              <div>
                <Eyebrow>Product boundary</Eyebrow>
                <div className="mt-4 text-[30px] font-semibold leading-tight text-[#151b24]">
                  No split fitting page. No old shopping-first flow.
                </div>
                <p className="mt-4 text-[13px] leading-6 text-black/48">
                  The mannequin, garment fit, canvas composition, and community feed now read like one product instead of
                  separate experiments.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-[26px] border border-black/8 bg-white/58 px-5 py-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/34">Shared top bar</div>
                  <p className="mt-3 text-[13px] leading-6 text-black/48">
                    Home logo on the left, product navigation in the middle, login and account access on the right.
                  </p>
                </div>
                <div className="rounded-[26px] border border-black/8 bg-white/58 px-5 py-5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-black/34">Live wardrobe runtime</div>
                  <p className="mt-3 text-[13px] leading-6 text-black/48">
                    Closet still owns fitting. Canvas drops the mannequin and keeps the shell. Community shifts to a feed.
                  </p>
                </div>
                <Link
                  href="/app/profile"
                  className="inline-flex items-center justify-center rounded-full border border-black/8 bg-white/70 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] no-underline"
                >
                  Open profile
                </Link>
              </div>
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}
