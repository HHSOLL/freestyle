import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default async function JournalEntryPage({ params }: { params: Promise<{ entryId: string }> }) {
  const { entryId } = await params;

  return (
    <AppPageFrame
      eyebrow="Journal / Entry"
      title={`Entry ${entryId}`}
      description="The detailed journal entry will show the worn look, context, notes, satisfaction, and future repeat suggestions."
    >
      <section className="border border-dashed border-black/20 px-5 py-8 text-sm leading-7 text-black/56">
        Scaffold placeholder for detailed wear log review.
      </section>
    </AppPageFrame>
  );
}
