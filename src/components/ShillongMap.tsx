import React, { useState, useEffect } from 'react';
import { Property } from '../types/property';
import { translations } from '../i18n/khasi';
import {
  CITY_CENTERS,
  getPropertyCommuteToCenter,
  getBothCommutes,
  CityCenter,
} from '../utils/distance';
import {
  MapPin,
  Navigation,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Droplets,
  Car,
  Compass,
  CheckCircle2,
  X,
  ArrowRight,
  Phone,
  Eye,
  Home,
  MessageCircle,
  Footprints,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ShillongMapProps {
  properties: Property[];
  selectedProperty: Property | null;
  onSelectProperty: (property: Property) => void;
  lang: 'en' | 'kh';
  compactMode?: boolean;
  onToggleExpand?: () => void;
  isExpanded?: boolean;
  onCoordinatePicked?: (lat: number, lng: number) => void;
  pickerMode?: boolean;
}

// Coordinate bounds of Shillong urban area
const MAP_BOUNDS = {
  minLat: 25.520,
  maxLat: 25.620,
  minLng: 91.830,
  maxLng: 91.930,
};

// Known locality GPS centers in Shillong for fallback mapping
const LOCALITY_COORDS: Record<string, { lat: number; lng: number }> = {
  laitumkhrah: { lat: 25.5714, lng: 91.8986 },
  polo: { lat: 25.589, lng: 91.902 },
  'police bazar': { lat: 25.5788, lng: 91.8833 },
  laban: { lat: 25.565, lng: 91.878 },
  'nongrim hills': { lat: 25.568, lng: 91.912 },
  'upper shillong': { lat: 25.535, lng: 91.855 },
  malki: { lat: 25.569, lng: 91.889 },
  mawlai: { lat: 25.602, lng: 91.875 },
  motphran: { lat: 25.5795, lng: 91.877 },
  dhanketi: { lat: 25.57, lng: 91.893 },
  'cleve colony': { lat: 25.566, lng: 91.903 },
  'shillong peak': { lat: 25.528, lng: 91.848 },
};

// Landmarks for reference on the vector map
const SHILLONG_LANDMARKS = [
  { name: 'Ward’s Lake', khasi: 'Nan Polok', x: 50, y: 46, type: 'lake' },
  { name: 'Polo Grounds', khasi: 'Madaniing Polo', x: 58, y: 32, type: 'ground' },
  { name: 'Golf Course', khasi: 'Golf Links', x: 65, y: 26, type: 'park' },
  { name: 'Police Bazar', khasi: 'Khad-saw Dong', x: 44, y: 48, type: 'hub', isCenter: true, centerId: 'pb' },
  { name: 'Laitumkhrah', khasi: 'Laitumkhrah', x: 62, y: 55, type: 'hub', isCenter: true, centerId: 'laitumkhrah' },
  { name: 'Laban', khasi: 'Laban', x: 38, y: 62, type: 'hub' },
  { name: 'Mawlai', khasi: 'Mawlai', x: 40, y: 20, type: 'hub' },
  { name: 'Upper Shillong', khasi: 'Upper Shillong', x: 26, y: 84, type: 'ridge' },
  { name: 'Nongrim Hills', khasi: 'Nongrim Hills', x: 74, y: 58, type: 'hub' },
  { name: 'Shillong Peak (1,965m)', khasi: 'Lum Shillong', x: 22, y: 92, type: 'peak' },
];

export const ShillongMap: React.FC<ShillongMapProps> = ({
  properties,
  selectedProperty,
  onSelectProperty,
  lang,
  compactMode = false,
  onToggleExpand,
  isExpanded = false,
  onCoordinatePicked,
  pickerMode = false,
}) => {
  const t = translations[lang];
  const [zoomLevel, setZoomLevel] = useState(1);
  const [userLocation, setUserLocation] = useState<{ x: number; y: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [pinnedCoords, setPinnedCoords] = useState<{ x: number; y: number; lat: number; lng: number } | null>(null);

  // City center distance estimation benchmark
  const [activeCenter, setActiveCenter] = useState<'pb' | 'laitumkhrah'>('pb');
  // Pin display mode: 'both' shows price + distance, 'distance' shows distance & commute time, 'price' shows price
  const [pinTagMode, setPinTagMode] = useState<'both' | 'distance' | 'price'>('both');

  // Interactive Pin quick-preview state
  const [previewProperty, setPreviewProperty] = useState<Property | null>(null);

  // Synchronize preview when external selectedProperty changes
  useEffect(() => {
    if (selectedProperty) {
      setPreviewProperty(selectedProperty);
    }
  }, [selectedProperty]);

  // Resolve property GPS coordinates with reliable fallback
  const getPropertyCoords = (prop: Property): { lat: number; lng: number } => {
    if (
      typeof prop.lat === 'number' &&
      typeof prop.lng === 'number' &&
      !isNaN(prop.lat) &&
      !isNaN(prop.lng) &&
      prop.lat >= 25.4 &&
      prop.lat <= 25.7 &&
      prop.lng >= 91.7 &&
      prop.lng <= 92.1
    ) {
      return { lat: prop.lat, lng: prop.lng };
    }
    const locKey = prop.locality?.toLowerCase().trim();
    if (locKey && LOCALITY_COORDS[locKey]) {
      return LOCALITY_COORDS[locKey];
    }
    return { lat: 25.574, lng: 91.895 };
  };

  // Convert GPS lat/lng to percentage X/Y on SVG canvas (0 to 100)
  const latLngToPercent = (lat: number, lng: number) => {
    const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
    // Y inverted because latitude increases northwards
    const y = 100 - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
    return {
      x: Math.min(Math.max(x, 6), 94),
      y: Math.min(Math.max(y, 8), 92),
    };
  };

  const percentToLatLng = (x: number, y: number) => {
    const lng = MAP_BOUNDS.minLng + (x / 100) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
    const lat = MAP_BOUNDS.maxLat - (y / 100) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
    return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) };
  };

  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pickerMode || onCoordinatePicked) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const coords = percentToLatLng(x, y);
      setPinnedCoords({ x, y, ...coords });
      if (onCoordinatePicked) {
        onCoordinatePicked(coords.lat, coords.lng);
      }
      return;
    }

    // Tapping on empty map space dismisses the quick preview
    setPreviewProperty(null);
  };

  const handlePinClick = (e: React.MouseEvent, prop: Property) => {
    e.stopPropagation();
    setPreviewProperty(prop);
  };

  const handleLocateMe = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          if (
            lat >= MAP_BOUNDS.minLat &&
            lat <= MAP_BOUNDS.maxLat &&
            lng >= MAP_BOUNDS.minLng &&
            lng <= MAP_BOUNDS.maxLng
          ) {
            setUserLocation(latLngToPercent(lat, lng));
          } else {
            setUserLocation(latLngToPercent(25.5788, 91.8933));
          }
          setLocating(false);
        },
        () => {
          setUserLocation(latLngToPercent(25.574, 91.895));
          setLocating(false);
        },
        { timeout: 5000 }
      );
    } else {
      setUserLocation(latLngToPercent(25.574, 91.895));
      setLocating(false);
    }
  };

  const formatPriceTag = (price: number, type: 'rent' | 'sale') => {
    if (type === 'rent') {
      return `₹${Math.round(price / 1000)}k/m`;
    }
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)}Cr`;
    }
    return `₹${(price / 100000).toFixed(0)}L`;
  };

  // Preview property commute details if selected
  const previewCoords = previewProperty ? getPropertyCoords(previewProperty) : null;
  const previewCommutes = previewCoords ? getBothCommutes(previewCoords.lat, previewCoords.lng) : null;

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border border-slate-200/80 bg-[#122319] text-white transition-all duration-300 shadow-sm ${
        compactMode ? 'h-52 sm:h-60' : isExpanded ? 'h-[520px] md:h-[640px]' : 'h-80 sm:h-96'
      }`}
    >
      {/* Top Map Status & City Center Controls Strip */}
      <div className="absolute top-2 left-2 right-2 z-20 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {/* Left Side: Pin Count & City Center Commute Switcher */}
        <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
          {/* Active Pins Badge */}
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/90 backdrop-blur-md text-[11px] font-medium text-emerald-300 border border-white/10 shadow-sm">
            <Compass className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{properties.length} Pins</span>
          </div>

          {/* City Center Benchmark Toggle */}
          <div className="flex items-center p-0.5 bg-slate-950/90 backdrop-blur-md rounded-full border border-emerald-500/30 text-[11px] font-semibold shadow-sm">
            <span className="text-[10px] text-slate-400 pl-2 pr-1 hidden sm:inline">Center:</span>
            <button
              type="button"
              onClick={() => setActiveCenter('pb')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                activeCenter === 'pb'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Estimate commute distance to Police Bazar (Khyndailad)"
            >
              <span>Police Bazar</span>
              <span className="text-[9px] opacity-75">(PB)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveCenter('laitumkhrah')}
              className={`px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 ${
                activeCenter === 'laitumkhrah'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Estimate commute distance to Laitumkhrah"
            >
              <span>Laitumkhrah</span>
            </button>
          </div>

          {/* Pin Tag Mode Toggle (Both / Dist / Price) */}
          <div className="hidden sm:flex items-center p-0.5 bg-slate-950/80 backdrop-blur-md rounded-full border border-white/10 text-[10px] text-slate-300 shadow-sm">
            <button
              type="button"
              onClick={() => setPinTagMode('both')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                pinTagMode === 'both' ? 'bg-white/20 text-white font-bold' : 'hover:text-white'
              }`}
              title="Show both Price & Distance on map pins"
            >
              Both
            </button>
            <button
              type="button"
              onClick={() => setPinTagMode('distance')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                pinTagMode === 'distance' ? 'bg-white/20 text-white font-bold' : 'hover:text-white'
              }`}
              title="Show distance from city center only"
            >
              Distance
            </button>
            <button
              type="button"
              onClick={() => setPinTagMode('price')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                pinTagMode === 'price' ? 'bg-white/20 text-white font-bold' : 'hover:text-white'
              }`}
              title="Show price only"
            >
              Price
            </button>
          </div>
        </div>

        {/* Right Side: Map Navigation Tools */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-full border border-white/10 shadow-sm">
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
            title={t.nearMe}
          >
            <Navigation className={`w-3.5 h-3.5 ${locating ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          {!compactMode && (
            <>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(z + 0.2, 1.8))}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(z - 0.2, 0.8))}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
                title="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-200 hover:text-white transition-colors cursor-pointer"
              title={isExpanded ? t.collapseMap : t.expandMap}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Interactive Vector Hill Map */}
      <svg
        className={`w-full h-full cursor-${pickerMode ? 'crosshair' : 'default'} select-none`}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onClick={handleMapClick}
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: '50% 50%',
          transition: 'transform 0.2s ease-out',
        }}
      >
        <defs>
          {/* Topographic Hill Gradients */}
          <linearGradient id="hillSlopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B3524" />
            <stop offset="50%" stopColor="#142B1C" />
            <stop offset="100%" stopColor="#0B1A11" />
          </linearGradient>

          <radialGradient id="pineHillRidge" cx="30%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#254D34" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#1B3524" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#122319" stopOpacity="0" />
          </radialGradient>

          <pattern id="contourLines" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 0 5 Q 5 2 10 5" fill="none" stroke="#2D5A3C" strokeWidth="0.15" strokeOpacity="0.4" />
            <path d="M 0 10 Q 5 7 10 10" fill="none" stroke="#2D5A3C" strokeWidth="0.15" strokeOpacity="0.4" />
          </pattern>

          {/* Marker Drop Shadow Filter */}
          <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="0.8" stdDeviation="0.6" floodColor="#000000" floodOpacity="0.7" />
          </filter>
        </defs>

        {/* Base Hill Ground */}
        <rect width="100" height="100" fill="url(#hillSlopeGrad)" />
        <rect width="100" height="100" fill="url(#pineHillRidge)" />
        <rect width="100" height="100" fill="url(#contourLines)" />

        {/* Contour elevation ridges */}
        <path
          d="M 5,90 Q 25,75 50,85 T 95,80"
          fill="none"
          stroke="#3A6A48"
          strokeWidth="0.4"
          strokeDasharray="1 1"
          strokeOpacity="0.6"
        />
        <path
          d="M 10,70 Q 35,55 60,65 T 90,60"
          fill="none"
          stroke="#3A6A48"
          strokeWidth="0.4"
          strokeDasharray="1 1"
          strokeOpacity="0.6"
        />
        <path
          d="M 15,40 Q 40,30 65,35 T 85,30"
          fill="none"
          stroke="#3A6A48"
          strokeWidth="0.4"
          strokeDasharray="1 1"
          strokeOpacity="0.6"
        />

        {/* Ward's Lake / Water Body */}
        <ellipse cx="50" cy="46" rx="4" ry="2.2" fill="#205B66" fillOpacity="0.85" stroke="#368F9E" strokeWidth="0.3" />
        <text x="50" y="47" fontSize="1.6" fill="#88D4E2" textAnchor="middle" fontWeight="500">
          Ward’s Lake
        </text>

        {/* Polo Grounds Turf */}
        <rect x="55" y="30" width="8" height="5" rx="1" fill="#245431" stroke="#37824B" strokeWidth="0.3" />
        <text x="59" y="33.5" fontSize="1.5" fill="#A7E4B5" textAnchor="middle">
          Polo Grounds
        </text>

        {/* Main Shillong Road Arteries */}
        <path
          d="M 40,0 Q 42,20 44,48 Q 48,52 62,55 Q 74,58 95,65"
          fill="none"
          stroke="#556F5A"
          strokeWidth="0.7"
          strokeOpacity="0.75"
        />
        <path
          d="M 44,48 Q 38,62 30,75 Q 26,84 20,100"
          fill="none"
          stroke="#556F5A"
          strokeWidth="0.7"
          strokeOpacity="0.75"
        />
        <path
          d="M 44,48 Q 50,40 58,32 Q 65,26 80,15"
          fill="none"
          stroke="#425C47"
          strokeWidth="0.5"
          strokeOpacity="0.7"
        />

        {/* City Center Special Hub Indicators with Pulsing Aura */}
        {/* Police Bazar Center Indicator */}
        <g transform="translate(44, 48)">
          <circle cx="0" cy="0" r={activeCenter === 'pb' ? 3.5 : 2.5} fill="#F59E0B" fillOpacity={activeCenter === 'pb' ? 0.35 : 0.15}>
            {activeCenter === 'pb' && <animate attributeName="r" values="2.5;4.5;2.5" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle cx="0" cy="0" r="1.1" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="0.3" />
        </g>

        {/* Laitumkhrah Center Indicator */}
        <g transform="translate(62, 55)">
          <circle cx="0" cy="0" r={activeCenter === 'laitumkhrah' ? 3.5 : 2.5} fill="#10B981" fillOpacity={activeCenter === 'laitumkhrah' ? 0.35 : 0.15}>
            {activeCenter === 'laitumkhrah' && <animate attributeName="r" values="2.5;4.5;2.5" dur="2s" repeatCount="indefinite" />}
          </circle>
          <circle cx="0" cy="0" r="1.1" fill="#10B981" stroke="#FFFFFF" strokeWidth="0.3" />
        </g>

        {/* Locality & Landmark Labels */}
        {SHILLONG_LANDMARKS.map((lm) => {
          const isTargetCenter =
            (activeCenter === 'pb' && lm.name === 'Police Bazar') ||
            (activeCenter === 'laitumkhrah' && lm.name === 'Laitumkhrah');

          return (
            <g key={lm.name}>
              <circle
                cx={lm.x}
                cy={lm.y}
                r={isTargetCenter ? '1' : '0.6'}
                fill={isTargetCenter ? '#F59E0B' : '#88B896'}
              />
              <text
                x={lm.x}
                y={lm.y - (isTargetCenter ? 2.2 : 1.4)}
                fontSize={isTargetCenter ? '2.3' : '2'}
                fill={isTargetCenter ? '#FDE68A' : '#D4EADB'}
                fontWeight={isTargetCenter ? '800' : '600'}
                textAnchor="middle"
                className="pointer-events-none drop-shadow-xs"
                opacity={isTargetCenter ? '1' : '0.85'}
              >
                {lang === 'kh' ? lm.khasi : lm.name}
                {isTargetCenter && ' ★'}
              </text>
            </g>
          );
        })}

        {/* User Simulated Location */}
        {userLocation && (
          <g>
            <circle cx={userLocation.x} cy={userLocation.y} r="3" fill="#3B82F6" fillOpacity="0.25">
              <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={userLocation.x} cy={userLocation.y} r="1.2" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="0.4" />
          </g>
        )}

        {/* Coordinate Picker Pin */}
        {pinnedCoords && (
          <g>
            <circle cx={pinnedCoords.x} cy={pinnedCoords.y} r="1.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="0.5" />
            <text x={pinnedCoords.x} y={pinnedCoords.y - 2.5} fontSize="2" fill="#FCA5A5" textAnchor="middle" fontWeight="bold">
              Pin ({pinnedCoords.lat}, {pinnedCoords.lng})
            </text>
          </g>
        )}

        {/* Custom Interactive Property Pin Markers with City Center Distance Labels */}
        {!pickerMode &&
          properties.map((prop) => {
            const coords = getPropertyCoords(prop);
            const { x, y } = latLngToPercent(coords.lat, coords.lng);
            const isSelected = previewProperty?.id === prop.id;
            const priceTag = formatPriceTag(prop.price, prop.type);

            // Compute distance and commute to current active city center
            const commute = getPropertyCommuteToCenter(coords.lat, coords.lng, activeCenter);
            const centerLabel = activeCenter === 'pb' ? 'PB' : 'Laitum';

            return (
              <g
                key={prop.id}
                className="cursor-pointer group"
                transform={`translate(${x}, ${y})`}
                onClick={(e) => handlePinClick(e, prop)}
              >
                {/* Pin Shadow on Ground */}
                <ellipse cx="0" cy="0.4" rx="1.6" ry="0.6" fill="#000000" fillOpacity="0.55" />

                {/* Selected Radar Wave Ring */}
                {isSelected && (
                  <circle cx="0" cy="0" r="4.5" fill="#F59E0B" fillOpacity="0.4">
                    <animate attributeName="r" values="2;5;2" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Custom Teardrop Map Pin Body */}
                <path
                  d="M 0 0 C -1.8 -2.4 -2.8 -4 -2.8 -5.6 C -2.8 -7.2 -1.5 -8.5 0 -8.5 C 1.5 -8.5 2.8 -7.2 2.8 -5.6 C 2.8 -4 1.8 -2.4 0 0 Z"
                  fill={isSelected ? '#F59E0B' : prop.type === 'rent' ? '#059669' : '#6366F1'}
                  stroke="#FFFFFF"
                  strokeWidth="0.38"
                  filter="url(#markerShadow)"
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                {/* Pin Head Inner Badge */}
                <circle cx="0" cy="-5.6" r="1.3" fill="#FFFFFF" />
                <circle
                  cx="0"
                  cy="-5.6"
                  r="0.85"
                  fill={isSelected ? '#D97706' : prop.type === 'rent' ? '#047857' : '#4F46E5'}
                />

                {/* Distance & Price Pill Tag Above Pin */}
                {pinTagMode === 'both' ? (
                  // DUAL-ROW PILL: Price on Top + City Center Distance & Drive Time Below
                  <g transform="translate(0, -9.6)" className="transition-transform duration-200 group-hover:scale-105">
                    <rect
                      x="-7.5"
                      y="-5.4"
                      width="15"
                      height="5.6"
                      rx="2"
                      fill={isSelected ? '#F59E0B' : '#0B1D12'}
                      stroke={isSelected ? '#FFFFFF' : prop.type === 'rent' ? '#34D399' : '#A5B4FC'}
                      strokeWidth="0.34"
                      filter="url(#markerShadow)"
                    />
                    {/* Line 1: Price */}
                    <text
                      x="0"
                      y="-3.1"
                      fontSize="1.6"
                      fill={isSelected ? '#0B1D12' : '#FFFFFF'}
                      fontWeight="800"
                      textAnchor="middle"
                      fontFamily="system-ui, sans-serif"
                      className="select-none"
                    >
                      {priceTag}
                    </text>
                    {/* Line 2: Distance from City Center + commute minutes */}
                    <text
                      x="0"
                      y="-0.85"
                      fontSize="1.25"
                      fill={isSelected ? '#451A03' : '#6EE7B7'}
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="system-ui, sans-serif"
                      className="select-none"
                    >
                      📍 {commute.distanceKm}km {centerLabel} ({commute.formattedDrive})
                    </text>
                  </g>
                ) : pinTagMode === 'distance' ? (
                  // DISTANCE ONLY PILL
                  <g transform="translate(0, -9.6)" className="transition-transform duration-200 group-hover:scale-105">
                    <rect
                      x="-7"
                      y="-3.4"
                      width="14"
                      height="3.6"
                      rx="1.8"
                      fill={isSelected ? '#F59E0B' : '#092115'}
                      stroke={isSelected ? '#FFFFFF' : '#34D399'}
                      strokeWidth="0.32"
                      filter="url(#markerShadow)"
                    />
                    <text
                      x="0"
                      y="-1"
                      fontSize="1.4"
                      fill={isSelected ? '#0B1D12' : '#A7F3D0'}
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="system-ui, sans-serif"
                      className="select-none"
                    >
                      🚗 {commute.distanceKm}km to {centerLabel} ({commute.formattedDrive})
                    </text>
                  </g>
                ) : (
                  // PRICE ONLY PILL
                  <g transform="translate(0, -9.6)" className="transition-transform duration-200 group-hover:scale-105">
                    <rect
                      x="-5"
                      y="-3"
                      width="10"
                      height="3.2"
                      rx="1.6"
                      fill={isSelected ? '#F59E0B' : '#0B1D12'}
                      stroke={isSelected ? '#FFFFFF' : prop.type === 'rent' ? '#34D399' : '#A5B4FC'}
                      strokeWidth="0.32"
                      filter="url(#markerShadow)"
                    />
                    <text
                      x="0"
                      y="-0.85"
                      fontSize="1.7"
                      fill={isSelected ? '#0B1D12' : '#FFFFFF'}
                      fontWeight="700"
                      textAnchor="middle"
                      fontFamily="system-ui, sans-serif"
                      className="select-none"
                    >
                      {priceTag}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
      </svg>

      {/* Interactive Quick Preview Card on Pin Tap with Detailed Commute Times */}
      {previewProperty && !pickerMode && (
        <div
          className="absolute bottom-2.5 left-2.5 right-2.5 sm:left-auto sm:right-3 sm:max-w-md z-30 bg-slate-950/95 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start gap-3">
            {/* Property Photo Thumbnail */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-white/15 bg-slate-900">
              <img
                src={previewProperty.images[0] || '/src/assets/images/cottage_laitumkhrah_1790429837396.jpg'}
                alt={previewProperty.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/75 text-emerald-400">
                {previewProperty.type === 'rent' ? 'Rent' : 'Sale'}
              </span>
            </div>

            {/* Property Info Content */}
            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wide truncate">
                  {previewProperty.locality}
                </span>
                {previewProperty.elevation && (
                  <span className="text-[10px] text-slate-400 font-mono">({previewProperty.elevation})</span>
                )}
                {previewProperty.isVerified && (
                  <span className="flex items-center gap-0.5 text-[10px] text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    Verified
                  </span>
                )}
              </div>

              <h4 className="text-xs sm:text-sm font-semibold text-white truncate mt-0.5">
                {lang === 'kh' && previewProperty.khasiTitle ? previewProperty.khasiTitle : previewProperty.title}
              </h4>

              {/* Price & Specs */}
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-300 flex-wrap">
                <span className="font-bold text-emerald-300 text-xs">
                  {previewProperty.type === 'rent'
                    ? `₹${previewProperty.price.toLocaleString()}/mo`
                    : previewProperty.price >= 10000000
                    ? `₹${(previewProperty.price / 10000000).toFixed(2)} Cr`
                    : `₹${(previewProperty.price / 100000).toFixed(1)} Lakhs`}
                </span>
                <span>•</span>
                <span>{previewProperty.bhk === 0 ? 'Studio' : `${previewProperty.bhk} BHK`}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5 text-blue-300">
                  <Droplets className="w-2.5 h-2.5" /> Water
                </span>
              </div>
            </div>

            {/* Dismiss Close Button */}
            <button
              type="button"
              onClick={() => setPreviewProperty(null)}
              className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close preview"
              aria-label="Close preview"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* ESTIMATED COMMUTE TIMES ROW */}
          {previewCommutes && (
            <div className="mt-2.5 pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-xs">
              {/* Distance to Police Bazar */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-amber-500/20 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-amber-300">Police Bazar (PB)</span>
                  <Car className="w-3 h-3 text-amber-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-white">{previewCommutes.pb.formattedDistance}</span>
                  <span className="text-[11px] font-medium text-emerald-300">{previewCommutes.pb.formattedDrive}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Footprints className="w-2.5 h-2.5" />
                  <span>~{previewCommutes.pb.walkMinutes} min walk</span>
                </div>
              </div>

              {/* Distance to Laitumkhrah */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="font-semibold text-emerald-300">Laitumkhrah</span>
                  <Car className="w-3 h-3 text-emerald-400" />
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-white">{previewCommutes.laitumkhrah.formattedDistance}</span>
                  <span className="text-[11px] font-medium text-emerald-300">
                    {previewCommutes.laitumkhrah.formattedDrive}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <Footprints className="w-2.5 h-2.5" />
                  <span>~{previewCommutes.laitumkhrah.walkMinutes} min walk</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Action Footer */}
          <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => {
                onSelectProperty(previewProperty);
              }}
              className="flex-1 py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <span>View Full Listing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {previewProperty.phone && (
              <a
                href={`tel:${previewProperty.phone}`}
                className="py-1.5 px-2.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="Call Landlord"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Call</span>
              </a>
            )}

            {previewProperty.whatsapp && (
              <a
                href={`https://wa.me/91${previewProperty.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Kublei! I am inquiring about "${previewProperty.title}" in ${previewProperty.locality} on Ha la Ri Shillong.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                title="WhatsApp Landlord"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Mode Instructions for coordinate picker */}
      {pickerMode && (
        <div className="absolute bottom-2 left-3 right-3 bg-emerald-950/90 backdrop-blur-md text-emerald-200 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-lg text-center">
          Tap anywhere on the Shillong map above to drop the property pin
        </div>
      )}
    </div>
  );
};
