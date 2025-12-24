import { useState, useCallback, useRef } from 'react';
import { searchLocations } from '../utils/searchUtils';

export const useLocationSearch = () => {
  const [locationQuery, setLocationQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const debounceTimeout = useRef(null);

  const search = useCallback(async (query) => {
    if (!query.trim() || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    
    setSearchingLocations(true);
    try {
      const suggestions = await searchLocations(query);
      setLocationSuggestions(suggestions);
    } catch (err) {
      console.error('Location search error:', err);
      setLocationSuggestions([]);
    } finally {
      setSearchingLocations(false);
    }
  }, []);

  const debouncedSearch = useCallback((query) => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => search(query), 300);
  }, [search]);

  const clearSearch = useCallback(() => {
    setLocationQuery('');
    setLocationSuggestions([]);
  }, []);

  return {
    locationQuery,
    setLocationQuery,
    locationSuggestions,
    searchingLocations,
    debouncedSearch,
    clearSearch,
  };
};