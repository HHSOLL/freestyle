export type TrendGender = 'men' | 'women';
export type TrendSeason = 'spring' | 'summer' | 'fall' | 'winter';
export type TrendStyle = 'street' | 'formal' | 'dandy';

export interface TrendItem {
  id: number;
  creator: string;
  nameKey: string;
  descKey: string;
  image: string;
  color?: string;
  popularity?: number;
  createdAt?: number;
  gender: TrendGender;
  season: TrendSeason;
  style: TrendStyle;
}

export type TrendTranslator = (key: string) => string;
