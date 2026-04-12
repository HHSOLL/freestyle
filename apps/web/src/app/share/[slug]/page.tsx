import { notFound } from "next/navigation";
import Image from "next/image";
import { buildApiPath } from "@/lib/clientApi";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type SharedOutfitItem = {
  id?: string | number;
  name?: string;
  brand?: string;
  category?: string;
  imageSrc?: string;
};

const toSharedOutfitItem = (value: unknown): SharedOutfitItem | null => {
  if (!value || typeof value !== "object") return null;
  return value as SharedOutfitItem;
};

export default async function SharePage({ params }: PageProps) {
  const resolvedParams = await params;
  const response = await fetch(buildApiPath(`/v1/community/looks/${resolvedParams.slug}`), {
    cache: "no-store",
  });
  if (!response.ok) {
    notFound();
  }
  const payload = (await response.json()) as { look?: Record<string, unknown>; outfit?: Record<string, unknown> };
  const rawOutfit = payload?.look ?? payload?.outfit;
  const data =
    rawOutfit && typeof rawOutfit === "object"
      ? (rawOutfit as {
          title: string;
          description?: string | null;
          preview_image: string;
          data?: unknown;
        })
      : null;

  if (!data) {
    notFound();
  }

  const dataRecord =
    data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : null;
  const rawItems: unknown[] = Array.isArray(dataRecord?.items) ? dataRecord.items : [];
  const items = rawItems
    .map((item: unknown) => toSharedOutfitItem(item))
    .filter((item: SharedOutfitItem | null): item is SharedOutfitItem => Boolean(item));

  return (
    <main className="min-h-screen bg-[#F8F9FA] px-6 py-16">
      <div className="mx-auto max-w-5xl grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-black/30">공유된 코디</p>
            <h1 className="text-4xl font-serif">{data.title}</h1>
            {data.description && <p className="text-black/40">{data.description}</p>}
          </div>
          <div className="rounded-[32px] bg-white p-6 shadow-xl shadow-black/5">
            <Image
              src={data.preview_image}
              alt={data.title}
              width={1200}
              height={1500}
              className="w-full h-auto object-contain"
              unoptimized
            />
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[32px] bg-white p-6 shadow-xl shadow-black/5">
            <h2 className="text-xl font-serif mb-4">아이템 구성</h2>
            <div className="space-y-4">
              {items.length === 0 && (
                <p className="text-sm text-black/40">아이템 정보가 없습니다.</p>
              )}
              {items.map((item, index) => (
                <div key={`${String(item.id ?? "item")}-${index}`} className="flex items-center gap-4">
                  <div className="w-16 h-20 bg-[#F3F3F3] rounded-xl overflow-hidden relative shrink-0">
                    {item.imageSrc && (
                      <Image
                        src={item.imageSrc}
                        alt={item.name || "Outfit item"}
                        fill
                        className="absolute inset-0 w-full h-full object-cover"
                        sizes="64px"
                        unoptimized
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate">{item.name}</p>
                    <p className="text-[11px] text-black/40 font-medium">{item.brand || "Custom"}</p>
                    <p className="text-[10px] text-black/30 uppercase tracking-widest">
                      {item.category || "custom"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
