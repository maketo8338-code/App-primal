import { useMemo } from 'react';
import { useRouter as useExpoRouter } from 'expo-router';

// Fast double taps used to open the same screen twice (or go back twice),
// which made transitions stutter. One navigation per 450 ms, app-wide.
let last = 0;
const allow = () => { const now = Date.now(); if (now - last < 450) return false; last = now; return true; };

export function useRouter() {
  const router = useExpoRouter();
  return useMemo(() => ({
    ...router,
    push: ((...a: Parameters<typeof router.push>) => { if (allow()) router.push(...a); }) as typeof router.push,
    navigate: ((...a: Parameters<typeof router.navigate>) => { if (allow()) router.navigate(...a); }) as typeof router.navigate,
    replace: ((...a: Parameters<typeof router.replace>) => { if (allow()) router.replace(...a); }) as typeof router.replace,
    back: () => { if (allow()) router.back(); },
  }), [router]);
}
