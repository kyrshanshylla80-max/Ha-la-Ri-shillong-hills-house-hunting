import React, { useMemo } from 'react';
import { FilterState, Property } from '../types/property';
import { SHILLONG_LOCALITIES } from '../data/initialProperties';
import { translations } from '../i18n/khasi';
import {
  X,
  RotateCcw,
  Check,
  Droplets,
  Car,
  ShieldCheck,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface FiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  properties: Property[];
  filters: FilterState;
  onUpdateFilters: (newFilters: Partial<FilterState>) => void;
  onResetFilters: () => void;
  lang: 'en' | 'kh';
}

interface PriceBin {
  label: string;
  min: number;
  max: number;
  count: number;
  avgPrice: number;
}

const CustomHistogramTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as PriceBin;
    return (
      <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-xl text-[11px] space-y-0.5 border border-slate-700/80 z-50 pointer-events-none">
        <div className="font-bold text-emerald-400">{data.label}</div>
        <div className="text-slate-200">
          <span className="font-extrabold text-white">{data.count}</span>{' '}
          {data.count === 1 ? 'property' : 'properties'} in this bracket
        </div>
        {data.count > 0 && (
          <div className="text-[10px] text-slate-400">
            Avg: ₹{Math.round(data.avgPrice).toLocaleString()}
          </div>
        )}
        <div className="text-[9px] text-emerald-300 font-medium pt-0.5">
          Click bar to filter
        </div>
      </div>
    );
  }
  return null;
};

export const FiltersSheet: React.FC<FiltersSheetProps> = ({
  isOpen,
  onClose,
  properties,
  filters,
  onUpdateFilters,
  onResetFilters,
  lang,
}) => {
  const t = translations[lang];

  // Subset of properties matching current listing category (rent vs sale)
  const relevantProperties = useMemo(() => {
    if (!properties || properties.length === 0) return [];
    if (filters.type === 'all') return properties;
    return properties.filter((p) => p.type === filters.type);
  }, [properties, filters.type]);

  // Compute price histogram distribution buckets
  const { histogramData, mostCommonBin, minPriceFound, maxPriceFound, averagePrice } = useMemo(() => {
    if (!relevantProperties || relevantProperties.length === 0) {
      return {
        histogramData: [],
        mostCommonBin: null,
        minPriceFound: 0,
        maxPriceFound: 0,
        averagePrice: 0,
      };
    }

    const prices = relevantProperties.map((p) => p.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const avgP = prices.reduce((a, b) => a + b, 0) / prices.length;

    const isRent =
      filters.type === 'rent' ||
      (filters.type === 'all' && relevantProperties.every((p) => p.price <= 200000));
    const isSale = filters.type === 'sale';

    let bins: { label: string; min: number; max: number; count: number; sum: number }[] = [];

    if (isRent) {
      bins = [
        { label: '<₹15k', min: 0, max: 15000, count: 0, sum: 0 },
        { label: '₹15k-25k', min: 15000, max: 25000, count: 0, sum: 0 },
        { label: '₹25k-35k', min: 25000, max: 35000, count: 0, sum: 0 },
        { label: '₹35k-50k', min: 35000, max: 50000, count: 0, sum: 0 },
        { label: '₹50k+', min: 50000, max: 50000000, count: 0, sum: 0 },
      ];
    } else if (isSale) {
      bins = [
        { label: '<₹50L', min: 0, max: 5000000, count: 0, sum: 0 },
        { label: '₹50L-80L', min: 5000000, max: 8000000, count: 0, sum: 0 },
        { label: '₹80L-1.2Cr', min: 8000000, max: 12000000, count: 0, sum: 0 },
        { label: '₹1.2-1.8Cr', min: 12000000, max: 18000000, count: 0, sum: 0 },
        { label: '₹1.8Cr+', min: 18000000, max: 500000000, count: 0, sum: 0 },
      ];
    } else {
      // Dynamic 5 equal bins for mixed results
      const range = maxP - minP || 1;
      const step = Math.ceil(range / 5);
      const fmt = (v: number) => {
        if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
        if (v >= 100000) return `₹${(v / 100000).toFixed(0)}L`;
        if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
        return `₹${v}`;
      };

      bins = Array.from({ length: 5 }, (_, i) => {
        const bMin = minP + i * step;
        const bMax = i === 4 ? 500000000 : minP + (i + 1) * step;
        const label = i === 4 ? `${fmt(bMin)}+` : `${fmt(bMin)}-${fmt(bMax)}`;
        return { label, min: bMin, max: bMax, count: 0, sum: 0 };
      });
    }

    relevantProperties.forEach((p) => {
      for (const bin of bins) {
        if (p.price >= bin.min && p.price < bin.max) {
          bin.count++;
          bin.sum += p.price;
          break;
        }
      }
    });

    const formattedBins: PriceBin[] = bins.map((b) => ({
      label: b.label,
      min: b.min,
      max: b.max,
      count: b.count,
      avgPrice: b.count > 0 ? b.sum / b.count : (b.min + (b.max === 500000000 ? b.min * 1.5 : b.max)) / 2,
    }));

    const sortedByCount = [...formattedBins].sort((a, b) => b.count - a.count);
    const mostCommon = sortedByCount[0]?.count > 0 ? sortedByCount[0] : null;

    return {
      histogramData: formattedBins,
      mostCommonBin: mostCommon,
      minPriceFound: minP,
      maxPriceFound: maxP,
      averagePrice: avgP,
    };
  }, [relevantProperties, filters.type]);

  // Click on a histogram bar to filter directly to that range
  const handleBarClick = (data: any) => {
    if (!data || !data.activePayload || !data.activePayload[0]) return;
    const clickedBin = data.activePayload[0].payload as PriceBin;

    // If already filtering this exact bracket, reset price filter
    if (filters.minPrice === clickedBin.min && filters.maxPrice === clickedBin.max) {
      onUpdateFilters({ minPrice: 0, maxPrice: 50000000 });
    } else {
      onUpdateFilters({
        minPrice: clickedBin.min,
        maxPrice: clickedBin.max,
      });
    }
  };

  const isCustomPriceFiltered =
    (filters.minPrice > 0 || (filters.maxPrice < 50000000 && filters.maxPrice > 0));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div
        className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">{t.filters}</h3>
            <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
              {relevantProperties.length} results
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.reset}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Rent vs Sale Category */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Listing Category
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => onUpdateFilters({ type: 'all' })}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  filters.type === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.all}
              </button>
              <button
                type="button"
                onClick={() => onUpdateFilters({ type: 'rent' })}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  filters.type === 'rent' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.forRent}
              </button>
              <button
                type="button"
                onClick={() => onUpdateFilters({ type: 'sale' })}
                className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                  filters.type === 'sale' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                {t.forSale}
              </button>
            </div>
          </div>

          {/* RECHARTS PRICE DISTRIBUTION HISTOGRAM */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Price Distribution
                </span>
              </div>
              {isCustomPriceFiltered && (
                <button
                  type="button"
                  onClick={() => onUpdateFilters({ minPrice: 0, maxPrice: 50000000 })}
                  className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Reset Price
                </button>
              )}
            </div>

            {mostCommonBin && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-emerald-50/70 border border-emerald-100 px-2.5 py-1 rounded-lg">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>
                  Most common in results: <strong className="text-emerald-900">{mostCommonBin.label}</strong> ({mostCommonBin.count} listings)
                </span>
              </div>
            )}

            {/* Recharts Bar Histogram Container */}
            {histogramData.length > 0 ? (
              <div className="w-full h-32 pt-1 select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={histogramData}
                    onClick={handleBarClick}
                    margin={{ top: 10, right: 4, left: -24, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9.5, fill: '#64748B', fontWeight: 500 }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 9, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={<CustomHistogramTooltip />}
                      cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer"
                    >
                      {histogramData.map((bin) => {
                        const isSelected =
                          filters.minPrice === bin.min && filters.maxPrice === bin.max;
                        return (
                          <Cell
                            key={bin.label}
                            fill={isSelected ? '#064E3B' : '#059669'}
                            stroke={isSelected ? '#022C22' : 'transparent'}
                            strokeWidth={isSelected ? 1.5 : 0}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                No price data available for current selection
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
              <span>
                Lowest: ₹{minPriceFound.toLocaleString()}
              </span>
              <span>
                Avg: ₹{Math.round(averagePrice).toLocaleString()}
              </span>
              <span>
                Highest: ₹{maxPriceFound.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Shillong Locality */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Neighborhood / Dong
            </label>
            <select
              value={filters.locality}
              onChange={(e) => onUpdateFilters({ locality: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs outline-hidden focus:border-emerald-600"
            >
              {SHILLONG_LOCALITIES.map((loc) => (
                <option key={loc} value={loc === 'All Localities' ? '' : loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* BHK Configuration */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Bedrooms (BHK)
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { val: null, label: 'Any' },
                { val: 0, label: 'Studio' },
                { val: 1, label: '1 BHK' },
                { val: 2, label: '2 BHK' },
                { val: 3, label: '3+ BHK' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => onUpdateFilters({ bhk: opt.val })}
                  className={`py-2 px-1 text-center rounded-xl border text-xs font-medium transition-all ${
                    filters.bhk === opt.val
                      ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Essential Shillong Hill Amenities */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Hill Essentials
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <Droplets className="w-4 h-4 text-sky-600" />
                24/7 Running Water Supply
              </span>
              <input
                type="checkbox"
                checked={filters.water247Only}
                onChange={(e) => onUpdateFilters({ water247Only: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <Car className="w-4 h-4 text-emerald-700" />
                Car Parking On-Site
              </span>
              <input
                type="checkbox"
                checked={filters.carParkingOnly}
                onChange={(e) => onUpdateFilters({ carParkingOnly: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <span className="flex items-center gap-2 text-xs font-medium text-slate-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Verified Local Owners Only
              </span>
              <input
                type="checkbox"
                checked={filters.verifiedOnly}
                onChange={(e) => onUpdateFilters({ verifiedOnly: e.target.checked })}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Footer Apply CTA */}
        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>{t.apply}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
