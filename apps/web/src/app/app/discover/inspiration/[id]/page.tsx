import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default async function InspirationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppPageFrame
      eyebrow="Discover / Inspiration"
      title={`Inspiration ${id}`}
      description="This detail page will show extracted garments, closet replacements, and the shortest path from reference to reusable look."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Scaffold placeholder for inspiration detail, extracted items, and match explanation.
      </section>
    </AppPageFrame>
  );
}
