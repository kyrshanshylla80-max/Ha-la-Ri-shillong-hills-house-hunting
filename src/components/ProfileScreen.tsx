import React, { useState, useEffect } from 'react';
import { Property, UserRole, PropertyType } from '../types/property';
import { translations } from '../i18n/khasi';
import { Chat, ChatService } from '../services/chatService';
import {
  User,
  Home,
  PlusCircle,
  Eye,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Settings,
  Languages,
  Wifi,
  WifiOff,
  Calendar,
  Phone,
  Sparkles,
  LogOut,
  LogIn,
  FileCode,
  UserCheck,
  MessageCircle,
  Key,
  Building2,
  Tag,
  Check,
  ArrowRight,
  Sliders,
} from 'lucide-react';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

interface ProfileScreenProps {
  userRole: UserRole;
  onSwitchRole: (role: UserRole) => void;
  myListings: Property[];
  onOpenPostProperty: (defaultType?: PropertyType) => void;
  onSelectProperty: (property: Property) => void;
  lang: 'en' | 'kh';
  onToggleLang: () => void;
  savedCount: number;
  currentUser: UserProfileData | null;
  onOpenAuthModal: (mode?: 'login' | 'signup') => void;
  onSignOut: () => void;
  onOpenFlutterCode: () => void;
  onOpenChatConversation: (chat: Chat) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userRole,
  onSwitchRole,
  myListings,
  onOpenPostProperty,
  onSelectProperty,
  lang,
  onToggleLang,
  savedCount,
  currentUser,
  onOpenAuthModal,
  onSignOut,
  onOpenFlutterCode,
  onOpenChatConversation,
}) => {
  const t = translations[lang];
  const [userChats, setUserChats] = useState<Chat[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [listingFilter, setListingFilter] = useState<'all' | 'rent' | 'sale'>('all');

  // Subscribe to user's real-time chats from Firestore
  useEffect(() => {
    if (!currentUser) {
      setUserChats([]);
      return;
    }

    setLoadingChats(true);
    const unsub = ChatService.subscribeToUserChats(
      currentUser.uid,
      (chats) => {
        setUserChats(chats);
        setLoadingChats(false);
      },
      (err) => {
        console.warn('Profile screen chats listener note:', err);
        setLoadingChats(false);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // Breakdown of listings
  const rentListings = myListings.filter((p) => p.type === 'rent');
  const saleListings = myListings.filter((p) => p.type === 'sale');

  const displayedListings =
    listingFilter === 'rent'
      ? rentListings
      : listingFilter === 'sale'
      ? saleListings
      : myListings;

  // Calculated metrics for owner
  const totalViews = myListings.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const totalInquiries = myListings.reduce((sum, p) => sum + (p.inquiriesCount || 0), 0) + userChats.length;

  const isOwnerMode = userRole === 'rent_owner' || userRole === 'owner';

  const roleDisplayName =
    userRole === 'rent_owner'
      ? (lang === 'kh' ? 'Trai ïing Ai Wai (Rent Owner)' : 'Rent Owner (House Rent)')
      : userRole === 'owner'
      ? (lang === 'kh' ? 'Trai ïing Die (Property Owner)' : 'Property Owner (House Sale)')
      : (lang === 'kh' ? 'Nongwad ïing (Seeker / Tenant)' : 'Seeker / Tenant');

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-10">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-800 text-white flex items-center justify-center font-bold text-2xl shadow-inner shrink-0">
              {currentUser?.displayName ? (
                currentUser.displayName.charAt(0).toUpperCase()
              ) : userRole === 'rent_owner' ? (
                <Key className="w-7 h-7 text-emerald-200" />
              ) : userRole === 'owner' ? (
                <Home className="w-7 h-7 text-emerald-200" />
              ) : (
                <User className="w-7 h-7 text-emerald-200" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentUser?.displayName ||
                    (userRole === 'rent_owner'
                      ? 'Rent Owner (Guest)'
                      : userRole === 'owner'
                      ? 'Property Owner (Guest)'
                      : 'House Seeker (Guest)')}
                </h2>
                {currentUser ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Firebase Auth
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Guest
                  </span>
                )}
                {/* Active Role Badge */}
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                    userRole === 'rent_owner'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : userRole === 'owner'
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-sky-100 text-sky-900 border border-sky-300'
                  }`}
                >
                  {userRole === 'rent_owner' && <Key className="w-3 h-3 text-amber-700" />}
                  {userRole === 'owner' && <Building2 className="w-3 h-3 text-emerald-700" />}
                  {userRole === 'tenant' && <User className="w-3 h-3 text-sky-700" />}
                  <span>{roleDisplayName}</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentUser?.email ||
                  (currentUser
                    ? 'Verified account'
                    : 'Sign in to sync your profile and manage listings in Shillong across devices')}
              </p>
            </div>
          </div>

          {/* Auth Action */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {currentUser ? (
              <button
                type="button"
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 text-rose-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuthModal('login')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-900 shadow-xs transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Role Switcher Tab Bar */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-700" />
              <span>{t.roleSwitch} (Switch Account Mode)</span>
            </span>
            <span className="text-[11px] text-slate-500">Instant Switch</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-slate-100 rounded-2xl">
            {/* 1. Seeker / Tenant Button */}
            <button
              type="button"
              onClick={() => onSwitchRole('tenant')}
              className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                userRole === 'tenant'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  userRole === 'tenant' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate flex items-center gap-1">
                  <span>{t.roleTenant}</span>
                  {userRole === 'tenant' && <Check className="w-3 h-3 text-sky-600 shrink-0" />}
                </div>
                <div className="text-[10px] text-slate-500 truncate">Looking for a home</div>
              </div>
            </button>

            {/* 2. Rent Owner Button */}
            <button
              type="button"
              onClick={() => onSwitchRole('rent_owner')}
              className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                userRole === 'rent_owner'
                  ? 'bg-amber-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  userRole === 'rent_owner' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <Key className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate flex items-center gap-1">
                  <span>{t.roleRentOwner}</span>
                  {userRole === 'rent_owner' && <Check className="w-3 h-3 text-amber-200 shrink-0" />}
                </div>
                <div
                  className={`text-[10px] truncate ${
                    userRole === 'rent_owner' ? 'text-amber-100' : 'text-slate-500'
                  }`}
                >
                  Landlord for Rent
                </div>
              </div>
            </button>

            {/* 3. Property / Sale Owner Button */}
            <button
              type="button"
              onClick={() => onSwitchRole('owner')}
              className={`p-2.5 rounded-xl text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                userRole === 'owner'
                  ? 'bg-emerald-800 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  userRole === 'owner' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate flex items-center gap-1">
                  <span>{t.roleSaleOwner}</span>
                  {userRole === 'owner' && <Check className="w-3 h-3 text-emerald-200 shrink-0" />}
                </div>
                <div
                  className={`text-[10px] truncate ${
                    userRole === 'owner' ? 'text-emerald-100' : 'text-slate-500'
                  }`}
                >
                  House Sale & Land
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Guest Banner Prompt */}
      {!currentUser && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-[#1B3524] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <UserCheck className="w-4 h-4 text-emerald-300" />
              <span>Sign In with Firebase Auth</span>
            </div>
            <p className="text-xs text-emerald-100/80 mt-0.5">
              Create an account or log in to sync your owner listings, chat directly with tenants/buyers, and store data in Firestore.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenAuthModal('signup')}
              className="px-4 py-2 rounded-xl bg-emerald-400 text-emerald-950 font-bold text-xs hover:bg-emerald-300 transition-colors shadow-xs cursor-pointer"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => onOpenAuthModal('login')}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs transition-colors border border-white/15 cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      )}

      {/* ACCOUNT MODE SWITCHER DETAILED CARDS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-700" />
            <span>Switch Account Profile</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Current: <strong className="text-slate-800">{roleDisplayName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Card 1: Rent Owner */}
          <div
            onClick={() => onSwitchRole('rent_owner')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              userRole === 'rent_owner'
                ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                : 'border-slate-200 hover:border-amber-400 hover:bg-slate-50/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                {userRole === 'rent_owner' ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Click to switch</span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">Rent Owner Account</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {t.rentOwnerDesc}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-200/50 flex items-center justify-between text-[11px] font-semibold text-amber-900">
              <span>{userRole === 'rent_owner' ? '✓ Currently in use' : 'Switch to Rent Owner →'}</span>
            </div>
          </div>

          {/* Card 2: Property / Sale Owner */}
          <div
            onClick={() => onSwitchRole('owner')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              userRole === 'owner'
                ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-600/20'
                : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                {userRole === 'owner' ? (
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Click to switch</span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">Property Owner Account</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {t.saleOwnerDesc}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-emerald-200/50 flex items-center justify-between text-[11px] font-semibold text-emerald-900">
              <span>{userRole === 'owner' ? '✓ Currently in use' : 'Switch to Property Owner →'}</span>
            </div>
          </div>

          {/* Card 3: Seeker / Tenant */}
          <div
            onClick={() => onSwitchRole('tenant')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
              userRole === 'tenant'
                ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-600/20'
                : 'border-slate-200 hover:border-sky-400 hover:bg-slate-50/70'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                {userRole === 'tenant' ? (
                  <span className="text-[10px] font-bold text-sky-800 bg-sky-200/80 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">Click to switch</span>
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-900">Seeker / Tenant Account</h4>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                {t.tenantDesc}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-sky-200/50 flex items-center justify-between text-[11px] font-semibold text-sky-900">
              <span>{userRole === 'tenant' ? '✓ Currently in use' : 'Switch to Seeker →'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* REAL-TIME CONVERSATIONS / INBOX SECTION */}
      {currentUser && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Real-Time Property Messages ({userChats.length})
              </h3>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
              Live Firestore Sync
            </span>
          </div>

          {loadingChats ? (
            <div className="py-4 text-center text-xs text-slate-400">Loading messages...</div>
          ) : userChats.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p>No active chat conversations yet.</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Browse properties in Shillong and tap <strong>"Chat"</strong> to message landlords directly.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {userChats.map((c) => {
                const otherPartyName = currentUser.uid === c.ownerId ? c.tenantName : c.ownerName;
                const otherPartyRole = currentUser.uid === c.ownerId ? 'Tenant / Inquirer' : 'Landlord / Owner';
                const timeString = c.lastMessageAt
                  ? new Date(c.lastMessageAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={c.id}
                    onClick={() => onOpenChatConversation(c)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-emerald-600/50 hover:bg-emerald-50/40 cursor-pointer transition-all flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-emerald-800 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {otherPartyName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900 truncate">
                            {otherPartyName}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                            {otherPartyRole}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                          {c.propertyTitle}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate mt-0.5 italic">
                          "{c.lastMessage || 'New inquiry'}"
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400">{timeString}</div>
                      <span className="inline-block mt-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Open Chat →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OWNER MODE CONTENT (ACTIVE FOR BOTH RENT OWNER & PROPERTY OWNER) */}
      {isOwnerMode && (
        <div className="space-y-6">
          {/* Owner Analytics Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>{t.myListings}</span>
                <Home className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{myListings.length}</div>
              <div className="text-[10px] text-emerald-700 mt-1 font-medium">
                {rentListings.length} Rent · {saleListings.length} Sale
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>{t.totalViews}</span>
                <Eye className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{totalViews}</div>
              <div className="text-[10px] text-slate-500 mt-1 font-medium">Organic hill searches</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                <span>{t.inquiries}</span>
                <MessageSquare className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-slate-900">{totalInquiries}</div>
              <div className="text-[10px] text-emerald-700 mt-1 font-medium">Calls & Chats</div>
            </div>
          </div>

          {/* Listings Management Header with Context-Sensitive Add Buttons */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t.myListings}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {userRole === 'rent_owner'
                    ? 'Manage your rental houses, flats, and rooms in Shillong'
                    : 'Manage your sale properties, plots, and cottages in Shillong'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {userRole === 'rent_owner' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenPostProperty('rent')}
                      className="px-3.5 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t.postRentProperty || '+ Post House for Rent'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPostProperty('sale')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Post house for sale"
                    >
                      <span>+ For Sale</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenPostProperty('sale')}
                      className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{t.postSaleProperty || '+ Post Property for Sale'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenPostProperty('rent')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Post house for rent"
                    >
                      <span>+ For Rent</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Filter Chips for Owner Listings */}
            {myListings.length > 0 && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setListingFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    listingFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All ({myListings.length})
                </button>
                <button
                  type="button"
                  onClick={() => setListingFilter('rent')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    listingFilter === 'rent'
                      ? 'bg-amber-800 text-white'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100'
                  }`}
                >
                  <Key className="w-3 h-3" />
                  <span>Rent ({rentListings.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListingFilter('sale')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                    listingFilter === 'sale'
                      ? 'bg-emerald-800 text-white'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                  }`}
                >
                  <Building2 className="w-3 h-3" />
                  <span>Sale ({saleListings.length})</span>
                </button>
              </div>
            )}

            {/* List of Owner Properties */}
            {displayedListings.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-500">
                  {listingFilter === 'all'
                    ? t.noListingsYet
                    : `No ${listingFilter === 'rent' ? 'rental' : 'sale'} listings posted yet.`}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenPostProperty(userRole === 'rent_owner' ? 'rent' : 'sale')}
                  className="mt-3 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  + {userRole === 'rent_owner' ? 'Post House for Rent' : 'Post Property for Sale'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedListings.map((prop) => (
                  <div
                    key={prop.id}
                    onClick={() => onSelectProperty(prop)}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-600/40 flex items-center gap-3.5 cursor-pointer shadow-xs transition-all"
                  >
                    <img
                      src={prop.images[0]}
                      alt={prop.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-emerald-700 uppercase">
                            {prop.type === 'rent'
                              ? `₹${prop.price.toLocaleString()}/mo`
                              : `₹${(prop.price / 100000).toFixed(1)}L`}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                              prop.type === 'rent'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {prop.type === 'rent' ? 'For Rent' : 'For Sale'}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-900 truncate mt-0.5">
                        {prop.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {prop.locality} · {prop.bhk === 0 ? 'Studio' : `${prop.bhk} BHK`}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500 shrink-0">
                      <div className="flex items-center gap-1 font-medium">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>{prop.viewsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SEEKER / TENANT MODE CONTENT */}
      {userRole === 'tenant' && (
        <div className="space-y-6">
          {/* Seeker Quick Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-xs text-slate-500 mb-1">{t.savedTitle}</div>
              <div className="text-2xl font-bold text-slate-900">{savedCount}</div>
              <div className="text-[11px] text-slate-500 mt-1">Ready for offline review</div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
              <div className="text-xs text-slate-500 mb-1">Upcoming Visits</div>
              <div className="text-2xl font-bold text-slate-900">0</div>
              <div className="text-[11px] text-slate-400 mt-1 font-medium">No visits booked yet</div>
            </div>
          </div>

          {/* Search Preferences */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Preferred Shillong Neighborhoods
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {['Laitumkhrah', 'Polo', 'Nongrim Hills', 'Police Bazar', 'Upper Shillong'].map((loc) => (
                <span
                  key={loc}
                  className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 font-medium border border-emerald-100"
                >
                  {loc}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Flutter Screen & Dart Source Code Integration */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-emerald-700" />
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Flutter Property Detail & Chat Services
              </h4>
              <p className="text-[11px] text-slate-500">
                <code className="text-emerald-700 font-semibold">lib/services/chat_service.dart</code> &{' '}
                <code className="text-emerald-700 font-semibold">property_detail_screen.dart</code>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenFlutterCode}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>View Dart Code</span>
          </button>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          ChatService connects tenants and owners via Firestore collections, linking the property's{' '}
          <code className="text-emerald-700 font-mono">ownerId</code> directly to the user's{' '}
          <code className="text-emerald-700 font-mono">uid</code>.
        </p>
      </div>

      {/* App Settings & Khasi Language Section */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Preferences & Connectivity
        </h4>

        {/* Language Switch */}
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <Languages className="w-4 h-4 text-slate-600" />
            <div>
              <div className="text-xs font-semibold text-slate-900">Language / Ktien</div>
              <div className="text-[11px] text-slate-500">
                {lang === 'en' ? 'English (Switch to Khasi)' : 'Ka Ktien Khasi (Pynkylla sha English)'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleLang}
            className="px-3 py-1.5 rounded-xl border border-emerald-700 bg-emerald-50 text-emerald-900 text-xs font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
          >
            {lang === 'en' ? 'Ka Ktien Khasi' : 'English'}
          </button>
        </div>

        {/* Offline Cache Status */}
        <div className="flex items-center justify-between py-1 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <Wifi className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-xs font-semibold text-slate-900">Meghalaya Hill Offline Cache & Firestore</div>
              <div className="text-[11px] text-slate-500">
                Saved properties remain readable even in zero-reception hill passes
              </div>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Connected
          </span>
        </div>
      </div>
    </div>
  );
};
