import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type StudioDrawersProps = {
  isAssetLibraryOpen: boolean;
  onCloseAssetLibrary: () => void;
  assetLibrary: ReactNode;
  isSummaryOpen: boolean;
  onCloseSummary: () => void;
  summaryPanel: ReactNode;
};

export function StudioDrawers({
  isAssetLibraryOpen,
  onCloseAssetLibrary,
  assetLibrary,
  isSummaryOpen,
  onCloseSummary,
  summaryPanel,
}: StudioDrawersProps) {
  return (
    <>
      <AnimatePresence>
        {isAssetLibraryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseAssetLibrary}
              className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-[130] bg-white rounded-t-[40px] h-[85vh] lg:hidden flex flex-col overflow-hidden"
            >
              {assetLibrary}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSummaryOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseSummary}
              className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm xl:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 right-0 z-[130] bg-white w-[320px] shadow-2xl xl:hidden flex flex-col"
            >
              {summaryPanel}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
