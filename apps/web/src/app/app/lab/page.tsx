"use client";

import Link from "next/link";
import { Eyebrow, SurfacePanel } from "@freestyle/ui";
import { useLanguage } from "@/lib/LanguageContext";

const labSurfaces = [
  {
    id: "viewer-core-harness",
    title: "viewer-core harness",
    body: "A direct browser harness for the imperative viewer-core + viewer-react stack, isolated from the runtime-3d compatibility stage.",
    href: "/app/lab/viewer-platform",
  },
  {
    id: "material-system",
    title: "Material system",
    body: "An isolated Phase 4 harness for studio lighting and material-class preset readability.",
    href: "/app/lab/material-system",
  },
  {
    id: "legacy-import",
    title: "Import ingestion",
    body: "URL import, cart import, and upload-based extraction remain available only as a quarantined ingestion surface.",
  },
  {
    id: "legacy-ai-review",
    title: "AI review",
    body: "The old styling-evaluation job flow is no longer a main navigation surface and should be treated as an experimental assistant.",
  },
  {
    id: "legacy-tryon",
    title: "AI try-on",
    body: "Photo try-on generation is isolated from the mannequin fitting product and kept behind the lab boundary.",
  },
  {
    id: "legacy-widget",
    title: "External widget",
    body: "Widget contracts remain part of the platform, but not of the primary end-user fitting journey.",
  },
];

export default function LabPage() {
  const { language } = useLanguage();

  return (
    <div className="mx-auto flex min-h-[calc(100svh-88px)] w-full max-w-[1680px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <SurfacePanel className="space-y-3 px-5 py-5">
        <Eyebrow>Lab / legacy isolation</Eyebrow>
        <h1 className="text-[28px] font-semibold text-[#151b24]">
          {language === "ko" ? "메인 제품 바깥으로 격리된 기능" : "Capabilities isolated outside the main product"}
        </h1>
        <p className="max-w-3xl text-[13px] leading-6 text-black/52">
          {language === "ko"
            ? "이 페이지는 과거 프로젝트에서 남아 있는 실험/백오피스 성격의 경로를 분리한 영역입니다. 메인 IA와 main user journey에서는 제거되었습니다."
            : "This page isolates experimental and back-office capabilities from the old project. They are no longer part of the main IA or the primary user journey."}
        </p>
      </SurfacePanel>

      <div className="grid gap-4 md:grid-cols-2">
        {labSurfaces.map((surface) => (
          <SurfacePanel key={surface.id} className="space-y-3 px-5 py-5">
            <Eyebrow>{surface.id}</Eyebrow>
            <h2 className="text-[18px] font-semibold text-[#151b24]">{surface.title}</h2>
            <p className="text-[13px] leading-6 text-black/52">{surface.body}</p>
            {surface.href ? (
              <Link
                href={surface.href}
                className="inline-flex items-center rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[13px] font-medium text-[#151b24]"
              >
                Open harness
              </Link>
            ) : null}
          </SurfacePanel>
        ))}
      </div>
    </div>
  );
}
