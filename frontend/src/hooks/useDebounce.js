import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to debounce a value
 * Useful for search inputs and filters to reduce API calls
 * 
 * @param {any} value - The value to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {any} - The debounced value
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook to create a debounced callback function
 * 
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} - The debounced function
 */
export function useDebouncedCallback(callback, delay = 300) {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

export default useDebounce;
