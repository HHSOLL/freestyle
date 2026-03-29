import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default async function ClosetItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppPageFrame
      eyebrow="Closet / Item"
      title={`Item ${id}`}
      description="Each closet item detail will eventually show source metadata, looks it participates in, and why the system thinks it matters."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Scaffold placeholder for item detail, attribute editing, and related look surfaces.
      </section>
    </AppPageFrame>
  );
}
