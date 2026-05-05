import { useEffect, useRef } from "react";

/**
 * Hook utility que devuelve un ref booleano indicando si el componente sigue
 * montado. Útil en hooks que hacen fetch async y necesitan evitar setState
 * en componentes desmontados (warning React + memory leak).
 *
 * Uso:
 *   const isMounted = useIsMounted();
 *   useEffect(() => {
 *     fetchData().then(data => {
 *       if (!isMounted.current) return;
 *       setData(data);
 *     });
 *   }, []);
 */
export function useIsMounted() {
  const ref = useRef(true);
  useEffect(() => {
    ref.current = true;
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}
