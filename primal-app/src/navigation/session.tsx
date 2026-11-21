import React, { createContext, useContext, useMemo, useState } from 'react';
import { Food, MealId } from '../types';
import { todayKey } from '../lib/nutrition';

// Navigation state shared between screens — same rules as the previous App.tsx:
// which meal and which day a food will be added to, and the food being viewed.
interface Session {
  selectedMeal: MealId; setSelectedMeal: (meal: MealId) => void;
  foodDate: string; setFoodDate: (date: string) => void;
  pending: { food: Food; meal: MealId } | null; setPending: (value: { food: Food; meal: MealId } | null) => void;
}
const Ctx = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [selectedMeal, setSelectedMeal] = useState<MealId>('snack');
  const [foodDate, setFoodDate] = useState(todayKey());
  const [pending, setPending] = useState<{ food: Food; meal: MealId } | null>(null);
  const value = useMemo(() => ({ selectedMeal, setSelectedMeal, foodDate, setFoodDate, pending, setPending }), [selectedMeal, foodDate, pending]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export function useSession(): Session {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
