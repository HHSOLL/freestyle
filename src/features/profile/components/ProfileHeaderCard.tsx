import type { ProfileTranslator } from '../types';

type ProfileHeaderCardProps = {
  t: ProfileTranslator;
  outfitCount: number;
  assetCount: number;
};

export function ProfileHeaderCard({ t, outfitCount, assetCount }: ProfileHeaderCardProps) {
  return (
    <div className="bg-white rounded-[32px] border border-black/5 p-10 md:p-14 shadow-xl shadow-black/[0.04]">
      <div className="flex flex-col md:flex-row md:items-center gap-8 md:gap-16">
        <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-black text-white flex items-center justify-center text-3xl font-serif">
          S
        </div>
        <div className="flex-1 space-y-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-black/30 font-bold">
              {t('profile.header.badge')}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif">{t('profile.header.title')}</h1>
            <p className="text-sm text-black/50 mt-2">{t('profile.header.subtitle')}</p>
          </div>
          <div className="flex gap-8">
            <div>
              <p className="text-2xl font-serif">{outfitCount}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 font-bold">
                {t('profile.stat.archive')}
              </p>
            </div>
            <div>
              <p className="text-2xl font-serif">{assetCount}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-black/30 font-bold">
                {t('profile.stat.assets')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
