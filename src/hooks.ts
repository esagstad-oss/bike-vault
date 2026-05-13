import { useState, useEffect, useCallback } from "react";

type AsyncFn<T> = () => Promise<T>;

export function useAsync<T>(fn: AsyncFn<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    setLoading(true);
    fn().then((result) => {
      setData(result);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}
