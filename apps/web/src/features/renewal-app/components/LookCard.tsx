import Image from 'next/image';
import Link from 'next/link';
import { Link as LinkIcon, Trash2 } from 'lucide-react';
import type { WardrobeLook } from '@/features/renewal-app/data';

type LookCardProps = {
  look: WardrobeLook;
  onCopyShare?: (slug: string) => void;
  onDelete?: (id: string) => void;
};

export function LookCard({ look, onCopyShare, onDelete }: LookCardProps) {
  return (
    <article className="overflow-hidden border border-black/8 bg-white">
      <div className="relative aspect-[3/4] bg-black/5">
        <Image
          src={look.previewImage}
          alt={look.title}
          fill
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-contain"
          unoptimized
        />
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(look.id)}
            className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-black/40 transition hover:text-red-500"
            aria-label="Delete look"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/34">Look</p>
          <h3 className="font-serif text-2xl tracking-[-0.04em] text-black">{look.title}</h3>
          <p className="text-xs text-black/44">{new Date(look.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/share/${look.shareSlug}`}
            className="inline-flex items-center justify-center border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/58 transition hover:border-black/20 hover:text-black"
          >
            View share
          </Link>
          {onCopyShare ? (
            <button
              type="button"
              onClick={() => onCopyShare(look.shareSlug)}
              className="inline-flex items-center justify-center gap-2 border border-black/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-black/58 transition hover:border-black/20 hover:text-black"
            >
              <LinkIcon className="h-3.5 w-3.5" />
              Copy
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
