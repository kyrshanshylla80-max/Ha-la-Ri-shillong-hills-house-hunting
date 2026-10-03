import React, { useState } from 'react';
import { Property } from '../types/property';
import { translations } from '../i18n/khasi';
import {
  X,
  Bookmark,
  BookmarkCheck,
  Phone,
  MessageCircle,
  MapPin,
  Droplets,
  Car,
  Compass,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Mountain,
  Share2,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { sharePropertyListing } from '../utils/shareProperty';
import { getBothCommutes } from '../utils/distance';
import { Footprints, Navigation } from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (id: string) => void;
  lang: 'en' | 'kh';
  onScheduleTour?: (propertyId: string, date: string, time: string) => void;
  onOpenChat?: (property: Property) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  onClose,
  isSaved,
  onToggleSave,
  lang,
  onScheduleTour,
  onOpenChat,
}) => {
  const t = translations[lang];
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [visitDate, setVisitDate] = useState('2026-09-28');
  const [visitTime, setVisitTime] = useState('14:00');
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const images = property.images && property.images.length > 0 ? property.images : ['/src/assets/images/cottage_laitumkhrah_1790429837396.jpg'];

  const handlePrevImg = () => {
    setActiveImgIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImg = () => {
    setActiveImgIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const formatPrice = (price: number, type: 'rent' | 'sale') => {
    if (type === 'rent') {
      return `₹${price.toLocaleString()} ${t.perMonth}`;
    }
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(2)} Crore`;
    }
    return `₹${(price / 100000).toFixed(1)} Lakhs`;
  };

  const whatsappMessage = encodeURIComponent(
    `Kublei! I am interested in your property "${property.title}" in ${property.locality} listed on Ha la Ri (₹${property.price.toLocaleString()}). Could you please share more details or when I can visit?`
  );

  const handleShare = async () => {
    const res = await sharePropertyListing(property);
    if (res.success) {
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 3000);
    } else if (res.method !== 'cancelled') {
      setShareFeedback(res.message);
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onScheduleTour) {
      onScheduleTour(property.id, visitDate, visitTime);
    }
    setScheduleSuccess(true);
    setTimeout(() => {
      setScheduleSuccess(false);
      setShowScheduleForm(false);
    }, 2000);
  };

  const propLat = typeof property.lat === 'number' && !isNaN(property.lat) ? property.lat : 25.574;
  const propLng = typeof property.lng === 'number' && !isNaN(property.lng) ? property.lng : 25.895;
  const commutes = getBothCommutes(propLat, propLng);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-2 truncate">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              {property.type === 'rent' ? t.forRent : t.forSale}
            </span>
            <span className="text-xs text-slate-500 truncate">
              {property.locality} {property.elevation ? `· ${property.elevation}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleShare}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                shareFeedback ? 'text-emerald-700 bg-emerald-50 scale-105' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              title="Share listing with friends & family"
              aria-label="Share property"
            >
              {shareFeedback ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onToggleSave(property.id)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                isSaved ? 'text-rose-500 bg-rose-50' : 'text-slate-600 hover:bg-slate-100'
              }`}
              title="Save"
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4 fill-rose-500" /> : <Bookmark className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {/* Main Photo Carousel */}
          <div className="space-y-2">
            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-900 group">
              <img
                src={images[activeImgIndex] || images[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-opacity duration-300"
              />

              {/* Prev / Next Carousel Buttons */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImg();
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-xs opacity-80 hover:opacity-100"
                    title="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImg();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-xs opacity-80 hover:opacity-100"
                    title="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Dot Indicators */}
              <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`h-1.5 rounded-full transition-all ${
                      activeImgIndex === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
                    }`}
                  />
                ))}
              </div>

              {/* Counter Badge */}
              <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-black/60 text-white text-xs backdrop-blur-md">
                {activeImgIndex + 1} / {images.length}
              </div>
            </div>

            {/* Thumbnail Row */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImgIndex(idx)}
                    className={`relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${
                      activeImgIndex === idx ? 'border-emerald-600 shadow-xs' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price & Title Block */}
          <div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatPrice(property.price, property.type)}
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mt-1">
              {lang === 'kh' && property.khasiTitle ? property.khasiTitle : property.title}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{property.address}</span>
            </div>
          </div>

          {/* Quick Metric Badges */}
          <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
            <div>
              <div className="text-[11px] text-slate-500 uppercase">{t.bhk}</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">
                {property.bhk === 0 ? t.studio : `${property.bhk} BHK`}
              </div>
            </div>
            <div className="border-x border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase">{t.baths}</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5">{property.bathrooms}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500 uppercase">{t.elevation}</div>
              <div className="font-bold text-slate-800 text-sm mt-0.5 font-mono">
                {property.elevation || '1,520 m'}
              </div>
            </div>
          </div>

          {/* Critical Hill Infrastructure Info (Water & Parking in Shillong) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-2.5">
            <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
              Hill Infrastructure & Access
            </h4>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">{t.water}: </span>
                <span>{property.waterSupply}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Car className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">{t.parking}: </span>
                <span>{property.parking}</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5 text-xs text-slate-700">
              <Mountain className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">{t.road}: </span>
                <span>{property.roadAccess}</span>
              </div>
            </div>
          </div>

          {/* Distance from City Centers (Commute Estimates) */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-700" />
                <span>Distance from City Centers (Shillong)</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-medium">Estimated hill commute</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Police Bazar */}
              <div className="p-3 rounded-xl bg-white border border-amber-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-950">Police Bazar (Khyndailad)</span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Main Market
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-slate-900">{commutes.pb.formattedDistance}</span>
                  <span className="text-xs font-bold text-emerald-700">{commutes.pb.formattedDrive} local taxi</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-slate-400" />
                  <span>~{commutes.pb.walkMinutes} min walk via hill footpath</span>
                </div>
              </div>

              {/* Laitumkhrah */}
              <div className="p-3 rounded-xl bg-white border border-emerald-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-950">Laitumkhrah</span>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    College / Cafes
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-lg font-extrabold text-slate-900">{commutes.laitumkhrah.formattedDistance}</span>
                  <span className="text-xs font-bold text-emerald-700">{commutes.laitumkhrah.formattedDrive} local taxi</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Footprints className="w-3 h-3 text-slate-400" />
                  <span>~{commutes.laitumkhrah.walkMinutes} min walk via hill footpath</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">
              Property Overview
            </h4>
            <p className="text-sm text-slate-600 leading-relaxed">{property.description}</p>
          </div>

          {/* Features Checklist */}
          {property.features && property.features.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Features & Hill Amenities
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {property.features.map((feat, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium"
                  >
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Owner Profile Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-sm">
                {property.ownerName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-slate-900">{property.ownerName}</span>
                  {property.isVerified && (
                    <span title="Verified Owner">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500">
                  {property.isVerified ? t.verifiedOwner : 'Property Owner'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenChat && (
                <button
                  type="button"
                  onClick={() => onOpenChat(property)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${property.lat},${property.lng}`}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1 text-xs text-emerald-700 font-medium hover:underline px-2 py-1"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Schedule Tour Form Drawer */}
          {showScheduleForm && (
            <form onSubmit={handleScheduleSubmit} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <h4 className="text-xs font-bold text-amber-900 uppercase">Schedule In-Person Visit</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Date</label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-600 block mb-1">Preferred Time</label>
                  <input
                    type="time"
                    value={visitTime}
                    onChange={(e) => setVisitTime(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800 transition-colors"
              >
                {scheduleSuccess ? 'Visit Request Sent to Owner!' : 'Confirm Visit Appointment'}
              </button>
            </form>
          )}

          {shareFeedback && (
            <div className="p-3 text-center text-xs bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-center gap-2 font-medium animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{shareFeedback}</span>
            </div>
          )}
        </div>

        {/* Sticky Action Footer */}
        <div className="sticky bottom-0 z-30 p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2">
          {/* Share Action Button */}
          <button
            type="button"
            onClick={handleShare}
            className="h-11 px-3 sm:px-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/70 text-slate-700 hover:text-emerald-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            title="Share property listing"
          >
            {shareFeedback ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="hidden sm:inline text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-emerald-700" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>

          {/* Real-time In-App Chat Action */}
          {onOpenChat && (
            <button
              type="button"
              onClick={() => onOpenChat(property)}
              className="flex-1 h-11 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Chat</span>
            </button>
          )}

          {/* Call Owner Direct Action */}
          <a
            href={`tel:${property.phone}`}
            className="flex-1 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <span>{t.callOwner}</span>
          </a>

          {/* WhatsApp Direct Action */}
          <a
            href={`https://wa.me/${property.whatsapp || property.phone.replace(/[^0-9]/g, '')}?text=${whatsappMessage}`}
            target="_blank"
            rel="noreferrer"
            className="h-11 px-3 sm:px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>

          {/* Schedule Visit Button */}
          <button
            type="button"
            onClick={() => setShowScheduleForm(!showScheduleForm)}
            className="h-11 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            title="Schedule visit"
          >
            <Calendar className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
