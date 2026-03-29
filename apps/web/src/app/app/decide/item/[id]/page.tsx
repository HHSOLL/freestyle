import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default async function DecisionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppPageFrame
      eyebrow="Decide / Item"
      title={`Decision ${id}`}
      description="A future decision detail will explain what this item unlocks, what it duplicates, and what your closet would look like with or without it."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Scaffold placeholder for decision detail, evidence stack, and buy/wait/skip actions.
      </section>
    </AppPageFrame>
  );
}
