import React from 'react';
import { translations } from '../i18n/khasi';
import { Plus, Languages, Compass, FileCode, User as UserIcon, LogIn, Search } from 'lucide-react';

interface TopNavProps {
  lang: 'en' | 'kh';
  onToggleLang: () => void;
  onOpenPostModal: () => void;
  onNavigateTab: (tab: 'home' | 'saved' | 'profile') => void;
  activeTab: 'home' | 'saved' | 'profile';
  onScrollToMap: () => void;
  currentUser: { email: string; displayName?: string; role?: string } | null;
  onOpenAuthModal: () => void;
  onOpenFlutterCode: () => void;
  onSearchClick?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  lang,
  onToggleLang,
  onOpenPostModal,
  onNavigateTab,
  activeTab,
  onScrollToMap,
  currentUser,
  onOpenAuthModal,
  onOpenFlutterCode,
  onSearchClick,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Single text element brand wordmark in display face */}
        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="text-left group cursor-pointer focus-visible:outline-hidden"
        >
          <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1B3524] group-hover:text-emerald-700 transition-colors font-display">
            Ha la Ri
          </span>
        </button>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onNavigateTab('home')}
            className={`transition-colors hover:text-slate-900 ${
              activeTab === 'home' ? 'text-emerald-800 font-semibold border-b-2 border-emerald-800 pb-0.5' : ''
            }`}
          >
            {t.tabHome}
          </button>
          <button
            type="button"
            onClick={onScrollToMap}
            className="transition-colors hover:text-slate-900"
          >
            {t.mapView}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('saved')}
            className={`transition-colors hover:text-slate-900 ${
              activeTab === 'saved' ? 'text-emerald-800 font-semibold border-b-2 border-emerald-800 pb-0.5' : ''
            }`}
          >
            {t.tabSaved}
          </button>
          <button
            type="button"
            onClick={() => onNavigateTab('profile')}
            className={`transition-colors hover:text-slate-900 ${
              activeTab === 'profile' ? 'text-emerald-800 font-semibold border-b-2 border-emerald-800 pb-0.5' : ''
            }`}
          >
            {t.tabProfile}
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Search Button */}
          {onSearchClick && (
            <button
              type="button"
              onClick={onSearchClick}
              className="p-2 rounded-lg border border-slate-200 hover:border-emerald-600 text-slate-700 hover:text-emerald-800 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
              title="Search properties in Shillong"
              aria-label="Search properties"
            >
              <Search className="w-3.5 h-3.5 text-emerald-800" />
            </button>
          )}

          {/* Flutter Screen Dart Code Button */}
          <button
            type="button"
            onClick={onOpenFlutterCode}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-600 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-colors"
            title="View property_detail_screen.dart"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-700" />
            <span>Flutter .dart</span>
          </button>

          {/* Language Toggle Button */}
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-600 text-xs font-semibold text-slate-700 hover:text-emerald-800 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">{lang === 'en' ? 'KH' : 'EN'}</span>
          </button>

          {/* Auth Button */}
          {currentUser ? (
            <button
              type="button"
              onClick={() => onNavigateTab('profile')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
              title={`${currentUser.email} (${currentUser.role === 'rent_owner' ? 'Rent Owner' : currentUser.role === 'owner' ? 'Property Owner' : 'Seeker'})`}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-800 text-white text-[10px] flex items-center justify-center font-bold">
                {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline max-w-[90px] truncate">
                {currentUser.displayName || currentUser.email.split('@')[0]}
              </span>
              {currentUser.role === 'rent_owner' && (
                <span className="hidden md:inline text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">
                  Rent
                </span>
              )}
              {currentUser.role === 'owner' && (
                <span className="hidden md:inline text-[9px] px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded font-bold">
                  Owner
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuthModal}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Log In</span>
            </button>
          )}

          {/* Post Property Primary Action */}
          <button
            type="button"
            onClick={onOpenPostModal}
            className="px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{t.postProperty}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
