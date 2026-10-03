import React, { useState } from 'react';
import { Property, PropertyType, UserRole } from '../types/property';
import { SHILLONG_LOCALITIES } from '../data/initialProperties';
import { translations } from '../i18n/khasi';
import { ShillongMap } from './ShillongMap';
import {
  X,
  Plus,
  Upload,
  MapPin,
  CheckCircle2,
  Droplets,
  Car,
  Phone,
  Home,
  IndianRupee,
  Layers,
} from 'lucide-react';

interface PostPropertyModalProps {
  onClose: () => void;
  onPublish: (property: Property) => void;
  lang: 'en' | 'kh';
  initialType?: PropertyType;
  currentUser?: { uid: string; email: string; displayName?: string; role: UserRole } | null;
}

const PRESET_IMAGES = [
  { label: 'Stone Cottage', url: '/src/assets/images/cottage_laitumkhrah_1790429837396.jpg' },
  { label: 'Duplex Flat', url: '/src/assets/images/apartment_nongrim_1790429853847.jpg' },
  { label: 'Heritage Villa', url: '/src/assets/images/villa_uppershillong_1790429868562.jpg' },
  { label: 'Cozy Interior', url: '/src/assets/images/studio_polohills_1790429887763.jpg' },
];

export const PostPropertyModal: React.FC<PostPropertyModalProps> = ({
  onClose,
  onPublish,
  lang,
  initialType = 'rent',
  currentUser,
}) => {
  const t = translations[lang];

  const [type, setType] = useState<PropertyType>(initialType);
  const [title, setTitle] = useState('');
  const [locality, setLocality] = useState('Laitumkhrah');
  const [address, setAddress] = useState('');
  const [price, setPrice] = useState('');
  const [bhk, setBhk] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [ownerName, setOwnerName] = useState(currentUser?.displayName || '');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [waterSupply, setWaterSupply] = useState('24/7 Municipal PHE + Overhead Tank');
  const [parking, setParking] = useState('Hillside Car Parking (1 vehicle)');
  const [roadAccess, setRoadAccess] = useState('Direct motorable road to entrance');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([
    PRESET_IMAGES[0].url,
  ]);
  const [lat, setLat] = useState(25.5714);
  const [lng, setLng] = useState(91.8986);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          setSelectedImages((prev) => [...prev, uploadEvent.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCoordinatePicked = (pickedLat: number, pickedLng: number) => {
    setLat(pickedLat);
    setLng(pickedLng);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please enter a property title');
      return;
    }
    if (!price || Number(price) <= 0) {
      setErrorMsg('Please enter a valid price');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter a contact phone number');
      return;
    }

    const newProperty: Property = {
      id: `prop-${Date.now()}`,
      title: title.trim(),
      khasiTitle: title.trim(),
      address: address.trim() || `${locality}, Shillong`,
      locality,
      lat,
      lng,
      elevation: '1,530 m',
      price: Number(price),
      type,
      bhk,
      bathrooms,
      sqft: bhk * 450 + 200,
      images: selectedImages.length > 0 ? selectedImages : [PRESET_IMAGES[0].url],
      ownerId: currentUser?.uid || `owner-custom-${Date.now()}`,
      ownerName: ownerName.trim() || currentUser?.displayName || 'Local Property Owner',
      phone: phone.trim(),
      whatsapp: whatsapp.trim() || phone.trim(),
      isVerified: true,
      waterSupply,
      parking,
      roadAccess,
      furnishing: 'Semi-Furnished',
      features: ['24/7 Water', 'Pine Hill Breezes', 'Verified Ownership'],
      description: description.trim() || `Beautiful ${bhk} BHK property in ${locality}, Shillong. Direct contact with owner.`,
      createdAt: new Date().toISOString(),
      viewsCount: 1,
      inquiriesCount: 0,
    };

    onPublish(newProperty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-100">
          <div>
            <h3 className="font-bold text-base text-slate-900">{t.postHouseTitle}</h3>
            <p className="text-xs text-slate-500">{t.postHouseSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              {errorMsg}
            </div>
          )}

          {/* Type Selector (Rent vs Sale) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">{t.typeLabel}</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setType('rent')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'rent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.rentType}
              </button>
              <button
                type="button"
                onClick={() => setType('sale')}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  type === 'sale' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.saleType}
              </button>
            </div>
          </div>

          {/* Title Input */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{t.titleLabel} *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunny 2BHK Cottage near Don Bosco, Laitumkhrah"
              className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
            />
          </div>

          {/* Price & BHK Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.priceLabel} *</label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 text-xs">₹</span>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={type === 'rent' ? '22000' : '8500000'}
                  className="w-full text-xs sm:text-sm p-3 pl-7 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.bhkLabel}</label>
              <select
                value={bhk}
                onChange={(e) => setBhk(Number(e.target.value))}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden bg-white"
              >
                <option value={0}>Studio Flat</option>
                <option value={1}>1 BHK</option>
                <option value={2}>2 BHK</option>
                <option value={3}>3 BHK</option>
                <option value={4}>4+ BHK / Independent Bungalow</option>
              </select>
            </div>
          </div>

          {/* Locality & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.localityLabel}</label>
              <select
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden bg-white"
              >
                {SHILLONG_LOCALITIES.filter((l) => l !== 'All Localities').map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.addressLabel}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Arbuthnot Road, near St. Anthony's"
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
          </div>

          {/* Hill Infrastructure (Water & Parking in Shillong) */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
            <div>
              <label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5 mb-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                {t.waterLabel}
              </label>
              <select
                value={waterSupply}
                onChange={(e) => setWaterSupply(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-emerald-200 bg-white"
              >
                <option value="24/7 Municipal PHE + 2,000L Overhead Tank">
                  24/7 Municipal PHE + Overhead Reserve Tank
                </option>
                <option value="24/7 Natural Perennial Hill Spring">24/7 Natural Perennial Hill Spring</option>
                <option value="24/7 Deep Borewell & Gravity System">24/7 Deep Borewell & Gravity System</option>
                <option value="Alternate Days Municipal Supply + 1,500L Storage">
                  Alternate Days Municipal Supply + Storage
                </option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5 mb-1">
                <Car className="w-3.5 h-3.5 text-emerald-700" />
                {t.parkingLabel}
              </label>
              <select
                value={parking}
                onChange={(e) => setParking(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-emerald-200 bg-white"
              >
                <option value="Dedicated Hillside Car Parking (1 vehicle)">
                  Dedicated Hillside Car Parking (1 vehicle)
                </option>
                <option value="Covered Garage for SUV + 2-Wheeler">Covered Garage for SUV + 2-Wheeler</option>
                <option value="Driveway with capacity for 2-3 cars">Driveway with capacity for 2-3 cars</option>
                <option value="Dedicated Two-Wheeler / Scooter Parking">
                  Dedicated Two-Wheeler / Scooter Parking
                </option>
                <option value="Footpath access only (Street parking 200m away)">
                  Footpath access only (No car to doorstep)
                </option>
              </select>
            </div>
          </div>

          {/* Interactive GPS Coordinate Pin Drop on Shillong Map */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                Pin Location on Shillong Map ({lat.toFixed(3)}, {lng.toFixed(3)})
              </label>
              <button
                type="button"
                onClick={() => setShowMapPicker(!showMapPicker)}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                {showMapPicker ? 'Hide Map' : 'Adjust Pin on Map'}
              </button>
            </div>

            {showMapPicker && (
              <div className="rounded-xl overflow-hidden border border-slate-200 mb-2">
                <ShillongMap
                  properties={[]}
                  selectedProperty={null}
                  onSelectProperty={() => {}}
                  lang={lang}
                  pickerMode={true}
                  onCoordinatePicked={handleCoordinatePicked}
                />
              </div>
            )}
          </div>

          {/* Image Selection & Upload */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">{t.imagesLabel}</label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_IMAGES.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (selectedImages.includes(preset.url)) {
                      setSelectedImages(selectedImages.filter((img) => img !== preset.url));
                    } else {
                      setSelectedImages([...selectedImages, preset.url]);
                    }
                  }}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImages.includes(preset.url)
                      ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                      : 'border-slate-200 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 inset-x-1 text-[9px] bg-black/70 text-white font-medium px-1 rounded truncate">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>

            <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors text-xs text-slate-600 font-medium">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>Upload photos from device / camera</span>
              <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Owner Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.ownerNameLabel} *</label>
              <input
                type="text"
                required
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Your Full Name"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.phoneLabel} *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98630..."
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">{t.whatsappLabel}</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp number"
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">{t.descriptionLabel}</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide directions, rules (e.g. family preferred), sunlight orientation, garden access, etc."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-hidden"
            />
          </div>
        </form>

        {/* Sticky Submit Button */}
        <div className="p-4 bg-white border-t border-slate-100">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t.publishListing}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
