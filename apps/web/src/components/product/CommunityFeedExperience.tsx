"use client";

import Image from "next/image";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
import { communityLibrary } from "@/lib/community-data";
import { useLanguage } from "@/lib/LanguageContext";

const buildFeedEntries = () =>
  communityLibrary.flatMap((entry, index) => [
    {
      ...entry,
      id: entry.id,
      caption: entry.body,
    },
    {
      ...entry,
      id: `${entry.id}-remix`,
      stats: {
        saves: entry.stats.saves + 40 + index * 11,
        comments: entry.stats.comments + 6 + index * 3,
      },
      caption: {
        ko: `${entry.body.ko} 캔버스와 옷장에서 바로 가져온 remix version.`,
        en: `${entry.body.en} Remixed directly from the closet and canvas workflow.`,
      },
    },
  ]);

const creatorNotes = [
  { name: "Mina Lee", tag: "Quiet layers" },
  { name: "Ari Park", tag: "Grey tailoring" },
  { name: "Yuna Han", tag: "Daily uniform" },
] as const;
const feedEntries = buildFeedEntries();

export function CommunityFeedExperience() {
  const { language } = useLanguage();

  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1720px] gap-5 xl:grid-cols-[280px_minmax(0,760px)_320px]">
        <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
          <SurfacePanel className="rounded-[30px] px-5 py-5">
            <Eyebrow>{language === "ko" ? "Community" : "Community"}</Eyebrow>
            <h1 className="mt-4 text-[30px] font-semibold leading-tight text-[#151b24]">
              {language === "ko" ? "옷장 톤을 유지한 피드" : "A feed that keeps the wardrobe tone"}
            </h1>
            <p className="mt-4 text-[13px] leading-6 text-black/48">
              {language === "ko"
                ? "카드 대시보드 대신 이미지 중심의 세로 피드로 룩과 보드, 저장 반응을 훑습니다."
                : "Instead of a dashboard, Community becomes an image-first vertical feed for looks, boards, and saved reactions."}
            </p>
          </SurfacePanel>

          <SurfacePanel className="rounded-[28px] px-5 py-5">
            <Eyebrow>{language === "ko" ? "Trending tags" : "Trending tags"}</Eyebrow>
            <div className="mt-4 flex flex-wrap gap-2">
              {["#quiettone", "#layering", "#uniform", "#canvaslook", "#fittedsilhouette"].map((tag) => (
                <div
                  key={tag}
                  className="rounded-full border border-black/8 bg-white/64 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/48"
                >
                  {tag}
                </div>
              ))}
            </div>
          </SurfacePanel>
        </aside>

        <section className="space-y-5">
          {feedEntries.map((entry) => (
            <SurfacePanel key={entry.id} className="rounded-[34px] px-4 py-4 sm:px-5 sm:py-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full border border-black/8 bg-white/80 text-[12px] font-semibold text-[#151b24]">
                    {entry.author.en
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-[#151b24]">{entry.author[language]}</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-black/34">
                      {entry.tags.join(" · ")}
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-black/8 bg-white/72 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/38">
                  {entry.stats.saves} saves
                </div>
              </div>

              <div className="relative mt-4 overflow-hidden rounded-[28px] border border-black/8 bg-white/40">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={entry.image}
                    alt={entry.title.en}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1280px) 100vw, 760px"
                    unoptimized
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {["Save", "Comment", "Remix"].map((label) => (
                    <div
                      key={label}
                      className="rounded-full border border-black/8 bg-white/64 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-black/42"
                    >
                      {label}
                    </div>
                  ))}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-black/38">
                  {entry.stats.comments} comments
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-[16px] font-semibold text-[#151b24]">{entry.title[language]}</div>
                <p className="text-[13px] leading-6 text-black/48">{entry.caption[language]}</p>
              </div>
            </SurfacePanel>
          ))}
        </section>

        <aside className="space-y-4 xl:sticky xl:top-[112px] xl:self-start">
          <SurfacePanel className="rounded-[30px] px-5 py-5">
            <Eyebrow>{language === "ko" ? "Suggested creators" : "Suggested creators"}</Eyebrow>
            <div className="mt-4 space-y-3">
              {creatorNotes.map((creator) => (
                <div key={creator.name} className="rounded-[22px] border border-black/8 bg-white/58 px-4 py-4">
                  <div className="text-[14px] font-semibold text-[#151b24]">{creator.name}</div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-black/36">{creator.tag}</div>
                </div>
              ))}
            </div>
          </SurfacePanel>

          <SurfacePanel className="rounded-[30px] px-5 py-5">
            <Eyebrow>{language === "ko" ? "Feed rule" : "Feed rule"}</Eyebrow>
            <p className="mt-4 text-[13px] leading-6 text-black/48">
              {language === "ko"
                ? "톤은 옷장과 같게 유지하고, 구조만 이미지 중심 피드로 전환합니다."
                : "The tone stays aligned with Closet. Only the structure changes into an image-first feed."}
            </p>
          </SurfacePanel>
        </aside>
      </div>
    </div>
  );
}
