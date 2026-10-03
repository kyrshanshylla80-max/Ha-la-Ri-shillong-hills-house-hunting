import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Property, FilterState, Language, UserRole, PropertyType } from './types/property';
import { INITIAL_PROPERTIES, SHILLONG_LOCALITIES } from './data/initialProperties';
import { translations } from './i18n/khasi';
import { TopNav } from './components/TopNav';
import { BottomNav } from './components/BottomNav';
import { ShillongMap } from './components/ShillongMap';
import { PropertyCard } from './components/PropertyCard';
import { PropertyDetailModal } from './components/PropertyDetailModal';
import { PostPropertyModal } from './components/PostPropertyModal';
import { FiltersSheet } from './components/FiltersSheet';
import { SavedScreen } from './components/SavedScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { AuthModal } from './components/AuthModal';
import { FlutterCodeViewerModal } from './components/FlutterCodeViewerModal';
import { ChatModal } from './components/ChatModal';
import { Chat } from './services/chatService';
import { sharePropertyListing } from './utils/shareProperty';
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  testFirestoreConnection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  Plus,
  Compass,
  Sparkles,
  TreePine,
  CloudRain,
  Wifi,
  CheckCircle,
  FileCode,
} from 'lucide-react';

const STORAGE_KEY_PROPS = 'halari_real_properties_v2';
const STORAGE_KEY_SAVED = 'halari_real_saved_v2';
const STORAGE_KEY_ROLE = 'halari_user_role_v2';
const STORAGE_KEY_LANG = 'halari_lang_v1';

export interface UserProfileData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
}

export default function App() {
  // Persistent Properties State - Clean slate for real listings only
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      // Clear any previous mock listings from storage
      localStorage.removeItem('halari_properties_v1');
      localStorage.removeItem('halari_saved_v1');
      const saved = localStorage.getItem(STORAGE_KEY_PROPS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p) => !['prop-1', 'prop-2', 'prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7', 'prop-8'].includes(p.id)
          );
        }
      }
    } catch (e) {
      console.warn('Could not read properties from storage', e);
    }
    return [];
  });

  // Saved Bookmarks - Empty by default, no fake bookmarks
  const [savedIds, setSavedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SAVED);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (id) => !['prop-1', 'prop-2', 'prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7', 'prop-8'].includes(id)
          );
        }
      }
    } catch (e) {
      console.warn('Could not read saved from storage', e);
    }
    return [];
  });

  // User Role (Seeker / Rent Owner / Property Owner)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLE);
      if (saved === 'owner' || saved === 'rent_owner' || saved === 'tenant') return saved;
    } catch {}
    return 'tenant';
  });

  // Language (English / Khasi)
  const [lang, setLang] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === 'kh' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });

  const t = translations[lang];

  // Active navigation tab ('home' | 'saved' | 'profile')
  const [activeTab, setActiveTab] = useState<'home' | 'saved' | 'profile'>('home');

  // Firebase Auth & Firestore State
  const [currentUser, setCurrentUser] = useState<UserProfileData | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [isFlutterModalOpen, setIsFlutterModalOpen] = useState(false);

  // Map display state
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // Modals state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [postModalDefaultType, setPostModalDefaultType] = useState<PropertyType>('rent');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Real-Time Chat Modal state
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatProperty, setChatProperty] = useState<Property | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    type: 'rent',
    searchQuery: '',
    locality: '',
    minPrice: 0,
    maxPrice: 50000000,
    bhk: null,
    water247Only: false,
    carParkingOnly: false,
    verifiedOnly: false,
  });

  const mapSectionRef = useRef<HTMLDivElement>(null);

  // 1. Test Firestore Connection on Boot (per skill guideline)
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // 2. Firebase Auth Listener - Mounts once, cleanly syncing profile and role from Firestore
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch or initialize user document in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const storedRole: UserRole =
              data.role === 'rent_owner'
                ? 'rent_owner'
                : data.role === 'owner'
                ? 'owner'
                : 'tenant';

            const profile: UserProfileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: data.displayName || firebaseUser.displayName || firebaseUser.email?.split('@')[0],
              role: storedRole,
            };
            setCurrentUser(profile);
            setUserRole(storedRole);
            try {
              localStorage.setItem(STORAGE_KEY_ROLE, storedRole);
            } catch {}
          } else {
            const currentSavedRole = (() => {
              try {
                const s = localStorage.getItem(STORAGE_KEY_ROLE);
                if (s === 'rent_owner' || s === 'owner' || s === 'tenant') return s;
              } catch {}
              return 'tenant';
            })();

            const newProfile: UserProfileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              role: currentSavedRole,
            };
            setCurrentUser(newProfile);
            await setDoc(userDocRef, { ...newProfile, createdAt: new Date().toISOString() });
          }
        } catch (err) {
          console.warn('Could not read user profile from Firestore:', err);
          setCurrentUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
            role: userRole,
          });
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // 3. Sync Saved Properties from Firestore for authenticated users
  useEffect(() => {
    if (!currentUser) return;

    const savedColRef = collection(db, 'users', currentUser.uid, 'saved');
    const unsub = onSnapshot(
      savedColRef,
      (snapshot) => {
        const cloudSavedIds = snapshot.docs.map((d) => d.id);
        if (cloudSavedIds.length > 0) {
          setSavedIds((prev) => Array.from(new Set([...prev, ...cloudSavedIds])));
        }
      },
      (error) => {
        console.warn('Firestore saved properties sync warning:', error);
      }
    );

    return () => unsub();
  }, [currentUser]);

  // 4. Listen for Real-Time Public Properties from Firestore (Real listings only)
  useEffect(() => {
    const propsColRef = collection(db, 'properties');
    const unsub = onSnapshot(
      propsColRef,
      (snapshot) => {
        const cloudProps: Property[] = [];
        snapshot.forEach((doc) => {
          // Reject any legacy demo/mock IDs
          if (!['prop-1', 'prop-2', 'prop-3', 'prop-4', 'prop-5', 'prop-6', 'prop-7', 'prop-8'].includes(doc.id)) {
            cloudProps.push({ id: doc.id, ...(doc.data() as any) });
          }
        });
        setProperties(cloudProps);
      },
      (error) => {
        console.warn('Public properties snapshot notice:', error);
      }
    );

    return () => unsub();
  }, []);

  // 5. Deep-linking: Automatically open shared property from URL query parameter (?property=<id>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedPropId = params.get('property') || params.get('id');
    if (sharedPropId && properties.length > 0) {
      const target = properties.find((p) => p.id === sharedPropId);
      if (target) {
        setSelectedProperty(target);
      }
    }
  }, [properties]);

  // Keep browser address bar in sync when property detail modal opens or closes
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedProperty) {
      url.searchParams.set('property', selectedProperty.id);
    } else {
      url.searchParams.delete('property');
      url.searchParams.delete('id');
    }
    window.history.replaceState({}, '', url.toString());
  }, [selectedProperty]);

  // Persist properties locally as backup
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROPS, JSON.stringify(properties));
    } catch (e) {
      console.warn('Could not write properties to storage', e);
    }
  }, [properties]);

  // Persist saved IDs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SAVED, JSON.stringify(savedIds));
    } catch (e) {
      console.warn('Could not write saved to storage', e);
    }
  }, [savedIds]);

  // Persist role
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, userRole);
    } catch {}
  }, [userRole]);

  // Persist language
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANG, lang);
    } catch {}
  }, [lang]);

  // Toggle Bookmark (syncs with Firestore if signed in, plus local fallback)
  const handleToggleSave = async (id: string) => {
    const exists = savedIds.includes(id);
    const updated = exists ? savedIds.filter((item) => item !== id) : [...savedIds, id];
    setSavedIds(updated);
    showToast(exists ? 'Removed from saved' : 'Saved for offline browsing in Shillong');

    // Firestore Sync
    if (currentUser) {
      const path = `users/${currentUser.uid}/saved/${id}`;
      try {
        if (exists) {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'saved', id));
        } else {
          await setDoc(doc(db, 'users', currentUser.uid, 'saved', id), {
            propertyId: id,
            savedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  // Switch Account Role (Tenant / Rent Owner / Property Owner)
  // Persists to state, localStorage, and Firestore user profile doc
  const handleSwitchRole = async (newRole: UserRole) => {
    setUserRole(newRole);
    try {
      localStorage.setItem(STORAGE_KEY_ROLE, newRole);
    } catch {}

    if (currentUser) {
      setCurrentUser((prev) => (prev ? { ...prev, role: newRole } : null));
      try {
        const userDocRef = doc(db, 'users', currentUser.uid);
        await setDoc(userDocRef, { role: newRole, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (err) {
        console.warn('Could not update role in Firestore:', err);
      }
    }

    const roleName =
      newRole === 'rent_owner'
        ? (lang === 'kh' ? 'Trai ïing Ai Wai (Rent Owner)' : 'Rent Owner Account (House Rent)')
        : newRole === 'owner'
        ? (lang === 'kh' ? 'Trai ïing Die (Property Owner)' : 'Property Owner Account (House Sale)')
        : (lang === 'kh' ? 'Nongwad ïing (Seeker / Tenant)' : 'Seeker / Tenant Account');

    showToast(lang === 'kh' ? `La pynkylla sha ${roleName}` : `Switched to ${roleName}`);
  };

  // Add new property published by user (Stores in Firestore & local state)
  const handlePublishProperty = async (newProperty: Property) => {
    setProperties((prev) => [newProperty, ...prev]);
    setIsPostModalOpen(false);
    setSelectedProperty(newProperty);
    showToast(lang === 'kh' ? 'La buh ïa ka ïing jong phi!' : 'Your house has been listed on Ha la Ri!');

    // Persist to Firestore if user is authenticated
    if (currentUser) {
      try {
        await setDoc(doc(db, 'properties', newProperty.id), newProperty);
      } catch (err) {
        console.warn('Property saved locally; Firestore sync issue:', err);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      showToast('Signed out of Ha la Ri');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Scheduled Tour callback
  const handleScheduleTour = (propertyId: string, date: string, time: string) => {
    showToast(`Visit scheduled for ${date} at ${time}. Landlord notified.`);
  };

  // Open Chat from Property Details modal or card
  const handleOpenChat = (property: Property) => {
    if (!currentUser) {
      setAuthModalMode('login');
      setIsAuthModalOpen(true);
      showToast('Please sign in or register to message property owners directly.');
      return;
    }
    setChatProperty(property);
    setActiveChatId(undefined);
    setIsChatModalOpen(true);
  };

  // Open Chat directly from Profile conversations list
  const handleOpenChatConversation = (chat: Chat) => {
    const existing = properties.find((p) => p.id === chat.propertyId);
    const propToUse: Property = existing || {
      id: chat.propertyId,
      title: chat.propertyTitle,
      address: chat.propertyLocality,
      locality: chat.propertyLocality,
      elevation: '1,525 m',
      lat: 25.5788,
      lng: 91.8933,
      price: chat.propertyPrice,
      type: 'rent',
      bhk: 1,
      bathrooms: 1,
      sqft: 600,
      images: chat.propertyImage ? [chat.propertyImage] : ['/src/assets/images/cottage_laitumkhrah_1790429837396.jpg'],
      ownerId: chat.ownerId,
      ownerName: chat.ownerName,
      phone: '9863000000',
      isVerified: true,
      waterSupply: '24/7 Municipality supply',
      parking: 'Car parking available',
      roadAccess: 'Paved motorable road',
      furnishing: 'Semi-Furnished',
      features: ['24/7 Water', 'Car Parking', 'Hill View'],
      description: 'Shillong hill property listing inquiry',
      createdAt: chat.createdAt,
    };
    setChatProperty(propToUse);
    setActiveChatId(chat.id);
    setIsChatModalOpen(true);
  };

  // Share Property Listing using Web Share API with Toast notification
  const handleShareProperty = async (property: Property) => {
    const res = await sharePropertyListing(property);
    if (res.success) {
      if (res.method === 'clipboard') {
        showToast('Direct property link copied to clipboard!');
      } else {
        showToast('Property shared!');
      }
    } else if (res.method !== 'cancelled') {
      showToast(res.message);
    }
  };

  // Filtered properties list
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      // Type filter
      if (filters.type !== 'all' && p.type !== filters.type) return false;

      // Locality filter
      if (filters.locality && p.locality.toLowerCase() !== filters.locality.toLowerCase()) {
        return false;
      }

      // BHK filter
      if (filters.bhk !== null && p.bhk !== filters.bhk) return false;

      // Water supply filter
      if (filters.water247Only && !p.waterSupply?.toLowerCase().includes('24/7')) {
        return false;
      }

      // Parking filter
      if (filters.carParkingOnly && p.parking?.toLowerCase().includes('footpath only')) {
        return false;
      }

      // Verified filter
      if (filters.verifiedOnly && !p.isVerified) return false;

      // Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(query);
        const matchesKhasiTitle = p.khasiTitle?.toLowerCase().includes(query);
        const matchesLocality = p.locality?.toLowerCase().includes(query);
        const matchesAddress = p.address?.toLowerCase().includes(query);
        const matchesDesc = p.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesKhasiTitle && !matchesLocality && !matchesAddress && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [properties, filters]);

  // Saved properties items
  const savedPropertiesList = useMemo(() => {
    return properties.filter((p) => savedIds.includes(p.id));
  }, [properties, savedIds]);

  // Landlord owned properties
  const ownerListings = useMemo(() => {
    if (currentUser) {
      return properties.filter((p) => p.ownerId === currentUser.uid || p.ownerId.includes('custom') || p.ownerId === 'owner-kharlukhi');
    }
    return properties.filter((p) => p.ownerId.includes('custom') || p.ownerId === 'owner-kharlukhi');
  }, [properties, currentUser]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.locality) count++;
    if (filters.bhk !== null) count++;
    if (filters.water247Only) count++;
    if (filters.carParkingOnly) count++;
    if (filters.verifiedOnly) count++;
    return count;
  }, [filters]);

  const scrollToMap = () => {
    setActiveTab('home');
    setIsMapExpanded(true);
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 flex flex-col font-sans pb-20 md:pb-12">
      {/* Top Navigation Bar following Top Bar Contract */}
      <TopNav
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'kh' : 'en')}
        onOpenPostModal={() => setIsPostModalOpen(true)}
        onNavigateTab={setActiveTab}
        activeTab={activeTab}
        onScrollToMap={scrollToMap}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onOpenFlutterCode={() => setIsFlutterModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-6">
        {/* TAB 1: HOME PAGE */}
        {activeTab === 'home' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Hill Banner Notice */}
            <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#1B3524] via-[#244530] to-[#2D5A3C] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold tracking-wide">
                  <TreePine className="w-4 h-4" />
                  <span>{t.tagline}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight mt-0.5 font-display text-white">
                  {lang === 'kh' ? 'Ki ïing shisha bad ki cottage ha Shillong' : 'Find rental cottages & hill apartments'}
                </h1>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Verified listings in Laitumkhrah, Polo, Laban & Nongrim Hills. Firebase Auth & Firestore enabled.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsFlutterModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xs text-xs text-emerald-200 border border-white/15 transition-colors font-medium"
                >
                  <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                  <span>property_detail_screen.dart</span>
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4 text-emerald-800" />
              </div>
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters((f) => ({ ...f, searchQuery: e.target.value }))}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-24 py-3 sm:py-3.5 bg-emerald-50/70 hover:bg-emerald-50 focus:bg-white text-xs sm:text-sm rounded-2xl border border-emerald-100/90 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 outline-hidden transition-all placeholder:text-slate-500 shadow-2xs"
              />
              {filters.searchQuery && (
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, searchQuery: '' }))}
                  className="absolute inset-y-0 right-20 my-auto text-xs text-slate-400 hover:text-slate-700 px-2"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFiltersOpen(true)}
                className="absolute inset-y-1.5 right-1.5 px-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">{t.filters}</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Filter Chips Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* For Rent / For Sale Segmented Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start">
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, type: 'rent' }))}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filters.type === 'rent'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.forRent}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, type: 'sale' }))}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filters.type === 'sale'
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.forSale}
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, type: 'all' }))}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    filters.type === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.all}
                </button>
              </div>

              {/* Quick Locality Filter Scroller */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {['All Localities', 'Laitumkhrah', 'Polo', 'Police Bazar', 'Laban', 'Nongrim Hills', 'Upper Shillong'].map(
                  (loc) => {
                    const isSelected =
                      (loc === 'All Localities' && !filters.locality) ||
                      filters.locality.toLowerCase() === loc.toLowerCase();
                    return (
                      <button
                        key={loc}
                        type="button"
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            locality: loc === 'All Localities' ? '' : loc,
                          }))
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-all ${
                          isSelected
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-semibold'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {loc}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Interactive Shillong Map Strip */}
            <div ref={mapSectionRef} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Interactive Shillong Topography & Pins</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsMapExpanded(!isMapExpanded)}
                  className="text-emerald-800 font-semibold hover:underline"
                >
                  {isMapExpanded ? t.collapseMap : t.expandMap}
                </button>
              </div>

              <ShillongMap
                properties={filteredProperties}
                selectedProperty={selectedProperty}
                onSelectProperty={(p) => setSelectedProperty(p)}
                lang={lang}
                compactMode={!isMapExpanded}
                isExpanded={isMapExpanded}
                onToggleExpand={() => setIsMapExpanded(!isMapExpanded)}
              />
            </div>

            {/* Properties Feed Header */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  {filters.locality ? `${filters.locality} Properties` : 'Available Homes in Shillong'}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{filteredProperties.length} results</span>
                  <span>·</span>
                  <span>{filters.type === 'rent' ? 'Rental Homes' : filters.type === 'sale' ? 'For Sale' : 'All Listings'}</span>
                  {filters.locality && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-700 font-medium">{filters.locality}</span>
                    </>
                  )}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      type: 'rent',
                      searchQuery: '',
                      locality: '',
                      minPrice: 0,
                      maxPrice: 50000000,
                      bhk: null,
                      water247Only: false,
                      carParkingOnly: false,
                      verifiedOnly: false,
                    })
                  }
                  className="text-xs text-emerald-700 font-semibold hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Properties Grid */}
            {properties.length === 0 ? (
              <div className="p-10 sm:p-14 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center mx-auto border border-emerald-100">
                  <TreePine className="w-8 h-8 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    Welcome to Ha la Ri • Shillong
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                    Find and list verified homes, apartments, and land across Shillong. Be the first homeowner or landlord to list a property in the hills!
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPostModalOpen(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Post a Property</span>
                  </button>
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthModalMode('signup');
                        setIsAuthModalOpen(true);
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition-all"
                    >
                      <span>Create Profile</span>
                    </button>
                  )}
                </div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
                <Compass className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-800">No properties found matching these filters</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Try clearing the locality or BHK criteria to see more real homes in neighboring Shillong areas.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setFilters({
                      type: 'rent',
                      searchQuery: '',
                      locality: '',
                      minPrice: 0,
                      maxPrice: 50000000,
                      bhk: null,
                      water247Only: false,
                      carParkingOnly: false,
                      verifiedOnly: false,
                    })
                  }
                  className="mt-4 px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-semibold"
                >
                  Show All Listed Properties
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredProperties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    isSaved={savedIds.includes(property.id)}
                    onToggleSave={handleToggleSave}
                    onSelect={(p) => setSelectedProperty(p)}
                    onShare={handleShareProperty}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED SCREEN */}
        {activeTab === 'saved' && (
          <SavedScreen
            savedProperties={savedPropertiesList}
            onRemoveSaved={handleToggleSave}
            onSelectProperty={(p) => setSelectedProperty(p)}
            onGoHome={() => setActiveTab('home')}
            lang={lang}
          />
        )}

        {/* TAB 3: PROFILE SCREEN */}
        {activeTab === 'profile' && (
          <ProfileScreen
            userRole={userRole}
            onSwitchRole={handleSwitchRole}
            myListings={ownerListings}
            onOpenPostProperty={(type) => {
              setPostModalDefaultType(type || (userRole === 'owner' ? 'sale' : 'rent'));
              setIsPostModalOpen(true);
            }}
            onSelectProperty={(p) => setSelectedProperty(p)}
            lang={lang}
            onToggleLang={() => setLang(lang === 'en' ? 'kh' : 'en')}
            savedCount={savedIds.length}
            currentUser={currentUser}
            onOpenAuthModal={(m) => {
              setAuthModalMode(m || 'login');
              setIsAuthModalOpen(true);
            }}
            onSignOut={handleSignOut}
            onOpenFlutterCode={() => setIsFlutterModalOpen(true)}
            onOpenChatConversation={handleOpenChatConversation}
          />
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-18 md:bottom-6 right-4 sm:right-6 z-30">
        <button
          type="button"
          onClick={() => {
            setPostModalDefaultType(userRole === 'owner' ? 'sale' : 'rent');
            setIsPostModalOpen(true);
          }}
          className="px-4 py-3 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>
            {userRole === 'rent_owner'
              ? (t.postRentProperty || 'Post Rent House')
              : userRole === 'owner'
              ? (t.postSaleProperty || 'Post Sale House')
              : t.postProperty}
          </span>
        </button>
      </div>

      {/* Bottom Navigation for Mobile Devices */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedIds.length}
        onOpenPostModal={() => {
          setPostModalDefaultType(userRole === 'owner' ? 'sale' : 'rent');
          setIsPostModalOpen(true);
        }}
        lang={lang}
      />

      {/* Property Details Modal with Carousel & Call & Save Action & Chat */}
      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          isSaved={savedIds.includes(selectedProperty.id)}
          onToggleSave={handleToggleSave}
          lang={lang}
          onScheduleTour={handleScheduleTour}
          onOpenChat={handleOpenChat}
        />
      )}

      {/* Post Property Modal */}
      {isPostModalOpen && (
        <PostPropertyModal
          onClose={() => setIsPostModalOpen(false)}
          onPublish={handlePublishProperty}
          lang={lang}
          initialType={postModalDefaultType}
          currentUser={currentUser}
        />
      )}

      {/* Filter Bottom Sheet */}
      <FiltersSheet
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        properties={filteredProperties.length > 0 ? filteredProperties : properties}
        filters={filters}
        onUpdateFilters={(newF) => setFilters((f) => ({ ...f, ...newF }))}
        onResetFilters={() =>
          setFilters({
            type: 'all',
            searchQuery: '',
            locality: '',
            minPrice: 0,
            maxPrice: 50000000,
            bhk: null,
            water247Only: false,
            carParkingOnly: false,
            verifiedOnly: false,
          })
        }
        lang={lang}
      />

      {/* Firebase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        lang={lang}
        initialMode={authModalMode}
        defaultRole={userRole}
        onSuccess={(profile) => {
          setCurrentUser(profile);
          setUserRole(profile.role);
          try {
            localStorage.setItem(STORAGE_KEY_ROLE, profile.role);
          } catch {}
          showToast(`Welcome to Ha la Ri, ${profile.displayName || profile.email}!`);
        }}
      />

      {/* Flutter Code Viewer Modal for property_detail_screen.dart */}
      <FlutterCodeViewerModal
        isOpen={isFlutterModalOpen}
        onClose={() => setIsFlutterModalOpen(false)}
      />

      {/* Real-time In-App Chat Modal linking Property ownerId to User uid */}
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        property={chatProperty}
        initialChatId={activeChatId}
        currentUser={currentUser}
        onOpenAuth={() => {
          setIsChatModalOpen(false);
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        lang={lang}
      />

      {/* Floating Hill Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md text-white text-xs font-medium shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
