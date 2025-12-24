export const searchLocations = async (query) => {
  if (!query.trim() || query.length < 2) {
    return [];
  }
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=20&countrycodes=gh&addressdetails=1`,
      { headers: { 'User-Agent': 'WorkaflowApp/1.0(support@Workaflow.com)' } }
    );
    const data = await response.json();
    return data.map(item => ({
      id: item.place_id.toString(),
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      address: item.address,
      type: item.type,
    }));
  } catch (err) {
    console.error('Location search error:', err);
    return [];
  }
};

export const filterServiceSuggestions = (query, suggestions, limit = 8) => {
  if (!query.trim()) return [];
  
  const queryLower = query.toLowerCase();
  return suggestions
    .filter(service => 
      service.toLowerCase().includes(queryLower) ||
      queryLower.split(' ').some(word => service.toLowerCase().includes(word))
    )
    .slice(0, limit);
};