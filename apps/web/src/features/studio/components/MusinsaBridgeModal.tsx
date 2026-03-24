import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioCategoryOption, StudioTranslator } from "../types";
import type { MusinsaBridgePayload } from "../musinsaBridge";
import { formatSourceLink } from "../utils";

type MusinsaBridgeModalProps = {
  t: StudioTranslator;
  isOpen: boolean;
  payload: MusinsaBridgePayload | null;
  categories: StudioCategoryOption[];
  selectedCategory: string;
  onSelectedCategoryChange: (value: string) => void;
  isImporting: boolean;
  importStatus: string;
  onClose: () => void;
  onImport: () => void;
};

export function MusinsaBridgeModal({
  t,
  isOpen,
  payload,
  categories,
  selectedCategory,
  onSelectedCategoryChange,
  isImporting,
  importStatus,
  onClose,
  onImport,
}: MusinsaBridgeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && payload && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <motion.div
            key="musinsa-bridge-modal"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-full max-w-5xl rounded-[40px] bg-white p-8 md:p-10 shadow-2xl space-y-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-black/35 mb-3">
                  Musinsa bridge
                </p>
                <h2 className="text-2xl md:text-3xl font-serif mb-2">
                  {t("studio.bridge.title") || "Import from Musinsa page"}
                </h2>
                <p className="text-sm text-black/45 max-w-2xl">
                  {t("studio.bridge.desc") ||
                    "A browser helper captured product URLs from a Musinsa page. Review the list, then import them into Studio."}
                </p>
              </div>
              <Button variant="ghost" className="h-12 w-12 rounded-full" onClick={onClose} aria-label="Close bridge modal">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-[32px] border border-black/10 bg-black/[0.03] p-4 md:p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/35">
                      {t("studio.bridge.captured_from") || "Captured from"}
                    </p>
                    <a
                      href={payload.originUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-black hover:underline"
                    >
                      <span className="truncate">{formatSourceLink(payload.originUrl)}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 text-right shadow-sm border border-black/5">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-black/30">
                      {t("studio.bridge.count_label") || "Products"}
                    </p>
                    <p className="text-lg font-black">{payload.items.length}</p>
                  </div>
                </div>

                <div className="max-h-[48vh] overflow-y-auto pr-1 space-y-3">
                  {payload.items.map((item, index) => (
                    <div
                      key={`${item.url}-${index}`}
                      className="flex items-start justify-between gap-3 rounded-[24px] bg-white px-4 py-3 border border-black/5"
                    >
                      <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-black/30">
                          #{index + 1}
                        </p>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 block truncate text-sm font-semibold hover:underline"
                        >
                          {item.title || formatSourceLink(item.url)}
                        </a>
                        <p className="mt-1 truncate text-xs text-black/40">{item.url}</p>
                      </div>
                      <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-black/25" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-[32px] border border-black/10 bg-white p-5 md:p-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-black/35">
                    {t("studio.import.category_label")}
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(event) => onSelectedCategoryChange(event.target.value)}
                    className="w-full h-14 rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-sm font-semibold appearance-none"
                  >
                    {categories
                      .filter((category) => category.id !== "all")
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="rounded-[28px] bg-black/[0.03] p-4 space-y-2">
                  <p className="text-sm font-semibold">
                    {t("studio.bridge.helper_title") || "Use the Musinsa helper script"}
                  </p>
                  <p className="text-sm text-black/45">
                    {t("studio.bridge.helper_desc") ||
                      "The helper script opens this screen with the URLs captured from your Musinsa page."}
                  </p>
                </div>

                <div className="rounded-[28px] border border-dashed border-black/10 bg-black/[0.02] p-4 space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-black/30">
                    {t("studio.bridge.captured_at") || "Captured at"}
                  </p>
                  <p className="text-sm text-black/60">{payload.capturedAt}</p>
                  <p className="text-sm text-black/60">
                    {t("studio.bridge.total_hint") || "The import will reuse the existing async product pipeline."}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1 h-14 rounded-2xl" onClick={onClose} disabled={isImporting}>
                    {t("studio.import.cancel")}
                  </Button>
                  <Button
                    className="flex-1 h-14 rounded-2xl bg-black text-white"
                    onClick={onImport}
                    disabled={isImporting || payload.items.length === 0}
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        {importStatus || t("studio.bridge.loading") || "Importing..."}
                      </>
                    ) : (
                      t("studio.bridge.cta") || "Import selected products"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
