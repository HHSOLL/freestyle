import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AppPageFrame } from '@/features/renewal-app/components/AppPageFrame';

export default function NewLookPage() {
  return (
    <AppPageFrame
      eyebrow="Looks / New"
      title="Create a look in the workspace"
      description="The composer still runs on the proven Studio canvas, but it now sits inside the broader looks system: save, review, share, and return to your wardrobe loop."
    >
      <section className="border border-dashed border-black/20 px-5 py-8">
        <p className="max-w-2xl text-sm leading-7 text-black/56">
          Use the existing Studio to import pieces, arrange the canvas, and save a reusable look back into your wardrobe.
        </p>
        <Button asChild className="mt-6 rounded-full bg-black px-5 text-white hover:bg-black/90">
          <Link href="/studio">Open workspace</Link>
        </Button>
      </section>
    </AppPageFrame>
  );
}
