type InfoStripProps = {
  items: Array<{ label: string; value: string }>;
};

export function InfoStrip({ items }: InfoStripProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border border-black/8 bg-white px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-black/38">{item.label}</p>
          <p className="mt-2 font-serif text-3xl tracking-[-0.04em] text-black">{item.value}</p>
        </div>
      ))}
    </section>
  );
}
