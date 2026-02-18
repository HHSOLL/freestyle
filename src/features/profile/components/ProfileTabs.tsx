import type { ProfileTab, ProfileTranslator } from '../types';

type ProfileTabsProps = {
  t: ProfileTranslator;
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

export function ProfileTabs({ t, activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <div className="mt-12 flex items-center gap-6 border-b border-black/5">
      <button
        onClick={() => onTabChange('archive')}
        className={`pb-4 text-[11px] font-bold tracking-[0.3em] uppercase ${
          activeTab === 'archive' ? 'text-black border-b-2 border-black' : 'text-black/30'
        }`}
      >
        {t('profile.tabs.archived')}
      </button>
      <button
        onClick={() => onTabChange('assets')}
        className={`pb-4 text-[11px] font-bold tracking-[0.3em] uppercase ${
          activeTab === 'assets' ? 'text-black border-b-2 border-black' : 'text-black/30'
        }`}
      >
        {t('profile.tabs.saved')}
      </button>
    </div>
  );
}
