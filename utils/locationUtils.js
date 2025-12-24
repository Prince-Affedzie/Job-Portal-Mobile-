export const formatTaskerLocation = (location) => {
  if (!location) return null;
  const parts = [];
  if (location.street) parts.push(location.street);
  if (location.town) parts.push(location.town);
  if (location.city) parts.push(location.city);
  if (location.region) parts.push(location.region);
  return [...new Set(parts)].join(', ') || null;
};

export const formatDistance = (meters) => {
  if (!meters) return 'Nearby';
  return meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
};

export const formatAddress = (suggestion) => {
  const { address } = suggestion;
  const parts = [];
  if (address.suburb || address.town || address.village) parts.push(address.suburb || address.town || address.village);
  if (address.city || address.county) parts.push(address.city || address.county);
  if (address.state || address.region) parts.push(address.state || address.region);
  return parts.join(', ');
};

export const getLocationIcon = (type) => {
  switch(type) {
    case 'city': return 'business';
    case 'town': return 'home';
    case 'village': return 'home-outline';
    default: return 'location';
  }
};