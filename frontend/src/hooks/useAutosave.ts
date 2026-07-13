import { useEffect, useRef } from 'react';

/**
 * Debounced autosave: calls `save(value)` `delay` ms after the latest change.
 * Skips the initial render (loading data is not an edit) and flushes any
 * pending save on unmount / page hide so quick back-navigation can't lose edits.
 */
export function useAutosave<T>(value: T, save: (value: T) => void, delay = 600): void {
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ value, save, dirty: false });
  latest.current.value = value;
  latest.current.save = save;

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    latest.current.dirty = true;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      latest.current.dirty = false;
      latest.current.save(latest.current.value);
    }, delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay]);

  useEffect(() => {
    function flush() {
      if (timer.current) clearTimeout(timer.current);
      if (latest.current.dirty) {
        latest.current.dirty = false;
        latest.current.save(latest.current.value);
      }
    }
    window.addEventListener('beforeunload', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      flush();
    };
  }, []);
}
