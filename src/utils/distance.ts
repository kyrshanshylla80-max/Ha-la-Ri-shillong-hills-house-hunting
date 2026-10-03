// Distance & Hill Commute Estimation Utility for Shillong
// Focuses on the two primary city centers: Police Bazar (Khyndailad) and Laitumkhrah

export interface CityCenter {
  id: 'pb' | 'laitumkhrah';
  name: string;
  shortName: string;
  code: string;
  khasiName: string;
  lat: number;
  lng: number;
  description: string;
}

export const CITY_CENTERS: Record<'pb' | 'laitumkhrah', CityCenter> = {
  pb: {
    id: 'pb',
    name: 'Police Bazar',
    shortName: 'Police Bazar',
    code: 'PB',
    khasiName: 'Khyndailad (PB)',
    lat: 25.5788,
    lng: 91.8833,
    description: 'Central taxi stand, markets & commercial hub',
  },
  laitumkhrah: {
    id: 'laitumkhrah',
    name: 'Laitumkhrah',
    shortName: 'Laitumkhrah',
    code: 'Laitum',
    khasiName: 'Laitumkhrah',
    lat: 25.5714,
    lng: 91.8986,
    description: 'Educational hub, cafes & cathedral square',
  },
};

/**
 * Calculates geodesic distance with a hill road factor (~1.25x for Shillong winding roads).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightKm = R * c;

  // Apply Shillong winding hill road coefficient (~1.25x)
  const roadKm = straightKm * 1.25;
  return Math.max(0.3, Number(roadKm.toFixed(1)));
}

/**
 * Estimate local hill taxi / car commute time in minutes.
 * Shillong hill urban average speed is ~18 km/h due to curves & elevation changes.
 */
export function estimateDriveMinutes(distanceKm: number): number {
  const mins = Math.round((distanceKm / 18) * 60);
  return Math.max(3, mins);
}

/**
 * Estimate walking time in minutes on hill gradients (approx 4 km/h).
 */
export function estimateWalkMinutes(distanceKm: number): number {
  const mins = Math.round((distanceKm / 4) * 60);
  return Math.max(4, mins);
}

export interface CommuteEstimate {
  distanceKm: number;
  driveMinutes: number;
  walkMinutes: number;
  formattedDistance: string;
  formattedDrive: string;
}

export function getPropertyCommuteToCenter(
  propLat: number,
  propLng: number,
  centerId: 'pb' | 'laitumkhrah'
): CommuteEstimate {
  const center = CITY_CENTERS[centerId];
  const km = calculateDistanceKm(propLat, propLng, center.lat, center.lng);
  const driveMins = estimateDriveMinutes(km);
  const walkMins = estimateWalkMinutes(km);

  return {
    distanceKm: km,
    driveMinutes: driveMins,
    walkMinutes: walkMins,
    formattedDistance: `${km} km`,
    formattedDrive: `~${driveMins} min`,
  };
}

export function getBothCommutes(
  propLat: number,
  propLng: number
): { pb: CommuteEstimate; laitumkhrah: CommuteEstimate } {
  return {
    pb: getPropertyCommuteToCenter(propLat, propLng, 'pb'),
    laitumkhrah: getPropertyCommuteToCenter(propLat, propLng, 'laitumkhrah'),
  };
}
