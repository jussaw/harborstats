export type StatsSectionId =
  | 'headline'
  | 'scoring'
  | 'finishes'
  | 'head-to-head'
  | 'activity'
  | 'records';

export interface StatsSection {
  id: StatsSectionId;
  title: string;
  subtitle: string;
}

export const STATS_SECTIONS: StatsSection[] = [
  { id: 'headline', title: 'Headline', subtitle: 'Top-line standings.' },
  { id: 'scoring', title: 'Scoring', subtitle: 'How players score.' },
  { id: 'finishes', title: 'Finishes & Tiers', subtitle: 'Where players land.' },
  { id: 'head-to-head', title: 'Head-to-Head', subtitle: 'Rivalries and matchups.' },
  { id: 'activity', title: 'Activity & Trends', subtitle: 'When games happen.' },
  { id: 'records', title: 'Records & Streaks', subtitle: 'Personal bests and milestones.' },
];
