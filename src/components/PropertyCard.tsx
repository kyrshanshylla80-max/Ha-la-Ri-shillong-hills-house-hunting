import React, { useState } from 'react';
import { Property } from '../types/property';
import { translations } from '../i18n/khasi';
import {
  Bookmark,
  BookmarkCheck,
  Droplets,
  Car,
  CheckCircle2,
  MapPin,
  Eye,
  Compass,
  Share2,
  Check,
} from 'lucide-react';
import { sharePropertyListing } from '../utils/shareProperty';
import { getPropertyCommuteToCenter } from '../utils/distance';

interface PropertyCardProps {
  property: Property;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  onSelect: (property: Property) => void;
  onShare?: (property: Property) => void;
  lang: 'en' | 'kh';
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  property,
  isSaved,
  onToggleSave,
  onSelect,
  onShare,
  lang,
}) => {
  const t = translations[lang];
  const [copied, setCopied] = useState(false);

  const propLat = typeof property.lat === 'number' && !isNaN(property.lat) ? property.lat : 25.574;
  const propLng = typeof property.lng === 'number' && !isNaN(property.lng) ? property.lng : 91.895;
  const pbCommute = getPropertyCommuteToCenter(propLat, propLng, 'pb');

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShare) {
      onShare(property);
      return;
    }
    const res = await sharePropertyListing(property);
    if (res.success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatPrice = (price: number, type: 'rent' | 'sale') => {
    if (type === 'rent') {
      return (
        <>
          <span className="text-lg font-bold text-slate-900 tracking-tight">₹{price.toLocaleString()}</span>
          <span className="text-xs font-normal text-slate-500 ml-0.5">{t.perMonth}</span>
        </>
      );
    }
    if (price >= 10000000) {
      return (
        <span className="text-lg font-bold text-slate-900 tracking-tight">
          ₹{(price / 10000000).toFixed(2)} Cr
        </span>
      );
    }
    return (
      <span className="text-lg font-bold text-slate-900 tracking-tight">
        ₹{(price / 100000).toFixed(1)} Lakhs
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect(property)}
      className="group relative bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-600/40 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* Property Image Banner */}
      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden">
        <img
          src={property.images[0]}
          alt={property.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          onError={(e) => {
            // Stylized CSS fallback
            const target = e.target as HTMLElement;
            target.style.display = 'none';
          }}
        />

        {/* Fallback pattern if image is missing */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-900 to-slate-900 flex items-center justify-center text-white/40">
          <Compass className="w-12 h-12" />
        </div>

        {/* Top Floating Controls */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {/* Unboxed subtle type label */}
          <div className="pointer-events-auto px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-md text-[11px] font-semibold text-white tracking-wide shadow-xs">
            {property.type === 'rent' ? t.forRent : t.forSale}
          </div>

          {/* Action buttons: Share & Bookmark */}
          <div className="flex items-center gap-1.5 pointer-events-auto">
            <button
              type="button"
              onClick={handleShareClick}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                copied
                  ? 'bg-emerald-600 text-white shadow-md scale-105'
                  : 'bg-white/85 text-slate-700 hover:bg-white hover:text-emerald-700 shadow-sm'
              }`}
              title={copied ? 'Direct link copied!' : 'Share listing'}
              aria-label="Share listing"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(property.id);
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                isSaved
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-white/85 text-slate-700 hover:bg-white hover:text-rose-500 shadow-sm'
              }`}
              title={isSaved ? 'Remove from saved' : 'Save property'}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 fill-white" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Elevation / Distance / Verified Scrim */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-2.5 flex items-end justify-between text-white text-xs">
          <div className="flex items-center gap-1.5 font-medium truncate pr-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{property.locality}</span>
            <span className="text-white/60">·</span>
            <span className="text-amber-300 text-[11px] font-semibold whitespace-nowrap">
              {pbCommute.formattedDistance} to PB
            </span>
          </div>
          {property.isVerified && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 font-medium bg-emerald-950/70 px-1.5 py-0.5 rounded shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{t.verified}</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Price & Configuration */}
          <div className="flex items-baseline justify-between gap-2">
            <div>{formatPrice(property.price, property.type)}</div>
            <div className="text-xs font-semibold text-slate-700">
              {property.bhk === 0 ? t.studio : `${property.bhk} ${t.bhk}`}
              {property.sqft && (
                <>
                  <span className="text-slate-400 font-normal"> · </span>
                  <span className="text-slate-500 font-normal">{property.sqft} {t.sqft}</span>
                </>
              )}
            </div>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-slate-900 text-sm mt-1 line-clamp-1 group-hover:text-emerald-800 transition-colors">
            {lang === 'kh' && property.khasiTitle ? property.khasiTitle : property.title}
          </h3>

          {/* Address Line & Quick Commute Tag */}
          <div className="flex items-center justify-between text-xs text-slate-500 mt-1 gap-2">
            <p className="truncate">{property.address}</p>
            <span className="shrink-0 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
              {pbCommute.formattedDrive} cab to PB
            </span>
          </div>
        </div>

        {/* Hill Essentials (Water + Parking + Road Access) */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-[11px] text-slate-600">
          <div className="flex items-center gap-1.5 truncate">
            <Droplets className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">{property.waterSupply}</span>
          </div>
          <div className="flex items-center justify-between text-slate-500 pt-0.5">
            <span className="flex items-center gap-1.5 truncate">
              <Car className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="truncate">{property.parking}</span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {property.viewsCount && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <Eye className="w-3 h-3" />
                  <span>{property.viewsCount}</span>
                </span>
              )}
              <button
                type="button"
                onClick={handleShareClick}
                className="flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors"
                title="Share property listing"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
