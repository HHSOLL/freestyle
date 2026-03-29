import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default async function LookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppPageFrame
      eyebrow="Looks / Detail"
      title={`Look ${id}`}
      description="The renewed look detail will connect saved composition, source provenance, sharing, and future wear/journal reuse."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Scaffold placeholder for look recipe detail, compare mode, and publishing state.
      </section>
    </AppPageFrame>
  );
}
