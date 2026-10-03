import React from 'react';
import { Home, Bookmark, User, Plus } from 'lucide-react';
import { translations } from '../i18n/khasi';

interface BottomNavProps {
  activeTab: 'home' | 'saved' | 'profile';
  onSelectTab: (tab: 'home' | 'saved' | 'profile') => void;
  savedCount: number;
  onOpenPostModal: () => void;
  lang: 'en' | 'kh';
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  savedCount,
  onOpenPostModal,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-lg px-3 py-1">
      <div className="grid grid-cols-4 items-center h-14 max-w-md mx-auto">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'home' ? 'text-emerald-800' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">{t.tabHome}</span>
        </button>

        {/* Tab 2: Saved */}
        <button
          type="button"
          onClick={() => onSelectTab('saved')}
          className={`relative flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'saved' ? 'text-emerald-800' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <div className="relative">
            <Bookmark className="w-5 h-5" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {savedCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">{t.tabSaved}</span>
        </button>

        {/* Tab 3: Post House */}
        <button
          type="button"
          onClick={onOpenPostModal}
          className="flex flex-col items-center justify-center h-full text-slate-500 hover:text-emerald-800 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center shadow-xs">
            <Plus className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">{t.postProperty}</span>
        </button>

        {/* Tab 4: Profile */}
        <button
          type="button"
          onClick={() => onSelectTab('profile')}
          className={`flex flex-col items-center justify-center h-full transition-colors ${
            activeTab === 'profile' ? 'text-emerald-800' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">{t.tabProfile}</span>
        </button>
      </div>
    </div>
  );
};
