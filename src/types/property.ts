export type PropertyType = 'rent' | 'sale';
export type UserRole = 'tenant' | 'rent_owner' | 'owner';

export interface Property {
  id: string;
  title: string;
  khasiTitle?: string;
  address: string;
  locality: string;
  lat: number;
  lng: number;
  elevation?: string;
  price: number; // monthly if rent, total if sale
  type: PropertyType;
  bhk: number; // 0 for studio, 1, 2, 3, 4
  bathrooms: number;
  sqft?: number;
  images: string[];
  ownerId: string;
  ownerName: string;
  phone: string;
  whatsapp?: string;
  isVerified: boolean;
  waterSupply: string; // e.g. "24/7 Municipal & PHE", "Natural Spring + 2000L Tank", "Borewell 24/7"
  parking: string; // e.g. "Dedicated Car Garage", "Hillside Parking (1 Car)", "Two Wheeler Only", "Footpath Access"
  roadAccess: string; // e.g. "Car touch to gate", "2 min gentle footpath", "Main road frontage"
  furnishing?: 'Furnished' | 'Semi-Furnished' | 'Unfurnished';
  features: string[];
  description: string;
  createdAt: string;
  viewsCount?: number;
  inquiriesCount?: number;
}

export type Language = 'en' | 'kh';

export interface FilterState {
  type: 'all' | 'rent' | 'sale';
  searchQuery: string;
  locality: string;
  minPrice: number;
  maxPrice: number;
  bhk: number | null; // null for any
  water247Only: boolean;
  carParkingOnly: boolean;
  verifiedOnly: boolean;
}
