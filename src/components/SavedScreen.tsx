import React, { useState } from 'react';
import { Property } from '../types/property';
import { translations } from '../i18n/khasi';
import {
  Bookmark,
  Trash2,
  Phone,
  MessageCircle,
  MapPin,
  Droplets,
  Car,
  Compass,
  ArrowRight,
  SplitSquareVertical,
  Share2,
  Check,
} from 'lucide-react';
import { sharePropertyListing } from '../utils/shareProperty';

interface SavedScreenProps {
  savedProperties: Property[];
  onRemoveSaved: (id: string) => void;
  onSelectProperty: (property: Property) => void;
  onGoHome: () => void;
  lang: 'en' | 'kh';
}

export const SavedScreen: React.FC<SavedScreenProps> = ({
  savedProperties,
  onRemoveSaved,
  onSelectProperty,
  onGoHome,
  lang,
}) => {
  const t = translations[lang];
  const [showComparison, setShowComparison] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleShare = async (e: React.MouseEvent, property: Property) => {
    e.stopPropagation();
    const res = await sharePropertyListing(property);
    if (res.success) {
      setCopiedId(property.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (savedProperties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4 border border-emerald-100">
          <Bookmark className="w-8 h-8 stroke-1.5" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">{t.noSaved}</h3>
        <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{t.noSavedDesc}</p>
        <button
          type="button"
          onClick={onGoHome}
          className="mt-6 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <span>{t.exploreHomes}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & Comparison Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t.savedTitle}</h2>
          <p className="text-xs text-slate-500">
            {savedProperties.length} {savedProperties.length === 1 ? 'house' : 'houses'} saved
          </p>
        </div>

        {savedProperties.length >= 2 && (
          <button
            type="button"
            onClick={() => setShowComparison(!showComparison)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <SplitSquareVertical className="w-3.5 h-3.5 text-emerald-600" />
            <span>{showComparison ? 'Hide Comparison' : t.compareSpecs}</span>
          </button>
        )}
      </div>

      {/* Side-by-Side Comparison Table */}
      {showComparison && savedProperties.length >= 2 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            Hill Property Side-by-Side Matrix
          </h4>
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400">
                <th className="pb-2 font-medium">Metric</th>
                {savedProperties.map((p) => (
                  <th key={p.id} className="pb-2 font-semibold text-slate-800 max-w-[150px] truncate">
                    {p.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              <tr>
                <td className="py-2.5 font-medium text-slate-900">Price</td>
                {savedProperties.map((p) => (
                  <td key={p.id} className="py-2.5 font-bold text-emerald-800">
                    {p.type === 'rent' ? `₹${p.price.toLocaleString()}/mo` : `₹${(p.price / 100000).toFixed(1)}L`}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-900">Locality</td>
                {savedProperties.map((p) => (
                  <td key={p.id} className="py-2.5">
                    {p.locality}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-900">BHK / Space</td>
                {savedProperties.map((p) => (
                  <td key={p.id} className="py-2.5">
                    {p.bhk === 0 ? 'Studio' : `${p.bhk} BHK`} · {p.sqft} sq.ft
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-900">Water Supply</td>
                {savedProperties.map((p) => (
                  <td key={p.id} className="py-2.5 text-[11px] text-sky-700">
                    {p.waterSupply}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-2.5 font-medium text-slate-900">Parking</td>
                {savedProperties.map((p) => (
                  <td key={p.id} className="py-2.5 text-[11px]">
                    {p.parking}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Saved Properties Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {savedProperties.map((property) => (
          <div
            key={property.id}
            onClick={() => onSelectProperty(property)}
            className="group relative bg-white rounded-2xl border border-slate-200 hover:border-emerald-600/40 p-3 flex gap-3.5 shadow-xs hover:shadow-md transition-all cursor-pointer overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="w-28 sm:w-36 h-28 sm:h-32 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative">
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-semibold">
                {property.type === 'rent' ? t.forRent : t.forSale}
              </span>
            </div>

            {/* Content Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
              <div>
                <div className="flex items-start justify-between gap-1">
                  <div className="text-base font-bold text-slate-900">
                    {property.type === 'rent'
                      ? `₹${property.price.toLocaleString()}/mo`
                      : `₹${(property.price / 100000).toFixed(1)}L`}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, property)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                        copiedId === property.id
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-400 hover:text-emerald-700 hover:bg-emerald-50'
                      }`}
                      title={copiedId === property.id ? 'Copied!' : 'Share listing'}
                    >
                      {copiedId === property.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSaved(property.id);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mt-0.5">
                  {property.title}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {property.locality} · {property.bhk === 0 ? 'Studio' : `${property.bhk} BHK`}
                </p>

                <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-2 truncate">
                  <span className="flex items-center gap-1 truncate text-sky-700">
                    <Droplets className="w-3 h-3 shrink-0" />
                    <span className="truncate">{property.waterSupply}</span>
                  </span>
                </div>
              </div>

              {/* Direct Quick Actions */}
              <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                <a
                  href={`tel:${property.phone}`}
                  className="flex-1 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-slate-800 transition-colors"
                >
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>Call</span>
                </a>
                <a
                  href={`https://wa.me/${property.whatsapp || property.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-colors"
                >
                  <MessageCircle className="w-3 h-3 fill-white" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
