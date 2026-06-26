export type HabitCategory = string;

export interface Category {
  id: string;
  name: string;
  color: string;
  goalText: string;
  targetCompletionsPerMonth: number;
}

export interface Collection {
  id: string;
  name: string;
  color: string;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  category: HabitCategory;
  createdAt: number;
  color: string;
  icon?: string;
  goal?: string;
  archived?: boolean;
  frequency?: number[]; // [0, 1, 2, 3, 4, 5, 6] representing Sun-Sat
  reminderTime?: string; // "HH:mm"
  collectionId?: string;
}

export interface CompletionRecord {
  [date: string]: {
    [habitId: string]: boolean;
  };
}

export interface HabitStreak {
  startDate: string;
  endDate: string;
  length: number;
}

export interface HabitWithStats extends Habit {
  currentStreak: number;
  bestStreak: number;
  totalCompletions: number;
  completionRate: number;
  streakHistory: HabitStreak[];
}
