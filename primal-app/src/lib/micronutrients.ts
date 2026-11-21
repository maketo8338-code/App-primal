import { NutrientKey, Profile } from '../types';

function validAge(age: number | undefined): boolean { return typeof age === 'number' && Number.isFinite(age) && age >= 13 && age <= 120; }
function sex(profile: Pick<Profile, 'sex'>): 'female' | 'male' | undefined { return profile.sex === 'female' || profile.sex === 'male' ? profile.sex : undefined; }

/** Reference intakes, deliberately kept separate from food data so they can evolve independently. */
export function nutrientTargetForProfile(key: NutrientKey, profile?: Pick<Profile, 'age' | 'sex'>): number | undefined {
  const age = validAge(profile?.age) ? profile?.age as number : undefined;
  const biologicalSex = profile ? sex(profile) : undefined;
  switch (key) {
    case 'vitA': return biologicalSex === 'female' ? 700 : 900;
    case 'vitB1': return biologicalSex === 'female' ? 1.1 : 1.2;
    case 'vitB2': return biologicalSex === 'female' ? 1.1 : 1.3;
    case 'vitB3': return biologicalSex === 'female' ? 14 : 16;
    case 'vitB5': return 5;
    case 'vitB6': return age !== undefined && age >= 51 ? (biologicalSex === 'female' ? 1.5 : 1.7) : (biologicalSex === 'female' ? 1.3 : 1.3);
    case 'vitB7': return 30;
    case 'vitB9': return 400;
    case 'vitB12': return 2.4;
    case 'vitC': return biologicalSex === 'female' ? 75 : 90;
    case 'vitD': return 15;
    case 'vitE': return 15;
    case 'vitK': return biologicalSex === 'female' ? 90 : 120;
    case 'calcium': return 1000;
    case 'magnesium': return biologicalSex === 'female' ? 310 : 400;
    case 'potassium': return biologicalSex === 'female' ? 2600 : 3400;
    case 'sodium': return 2300;
    case 'iron': return biologicalSex === 'female' ? 18 : 8;
    case 'zinc': return biologicalSex === 'female' ? 8 : 11;
    case 'copper': return 0.9;
    case 'manganese': return biologicalSex === 'female' ? 1.8 : 2.3;
    case 'selenium': return 55;
    case 'iodine': return 150;
    case 'phosphorus': return 700;
    case 'omega3': return biologicalSex === 'female' ? 1.1 : 1.6;
    case 'fiber': return 14;
    default: return undefined;
  }
}
