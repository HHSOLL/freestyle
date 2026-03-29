import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default function ClosetImportPage() {
  return (
    <AppPageFrame
      eyebrow="Closet / Import"
      title="Import remains asynchronous, but the destination changes"
      description="The import flow is still powered by jobs, but the renewal re-anchors it around closet readiness and attribute quality."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Next step: replace this scaffold with a unified import sheet that combines product links, cart imports, uploads, and provenance review.
      </section>
    </AppPageFrame>
  );
}
