import { useState, useCallback } from "react";

export default function useApi(apiFunc) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const request = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFunc(...args);
        setData(response.data);
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || "Something went wrong");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiFunc]
  );

  return { data, error, loading, request };
}
