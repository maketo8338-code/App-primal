import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { todayKey } from './nutrition';

/**
 * Today's date key, kept up to date: re-checked when the app comes back to the
 * foreground and every minute while it is open, so screens switch to the new day
 * at midnight (or after the phone slept) without a relaunch.
 */
export function useDayKey(): string {
  const [day, setDay] = useState(todayKey());
  useEffect(() => {
    const check = () => setDay((current) => { const now = todayKey(); return now === current ? current : now; });
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') check(); });
    const timer = setInterval(check, 60_000);
    return () => { sub.remove(); clearInterval(timer); };
  }, []);
  return day;
}
