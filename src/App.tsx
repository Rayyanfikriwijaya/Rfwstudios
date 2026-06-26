/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { format, startOfToday, eachDayOfInterval, subDays, formatISO, startOfMonth, endOfMonth, isSameMonth, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { 
  Plus, 
  BarChart3, 
  CheckCircle2, 
  Circle, 
  Trophy, 
  Calendar as CalendarIcon, 
  Trash2, 
  Flame, 
  Settings, 
  Archive,
  History,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bell,
  Heart,
  Droplets,
  Book,
  Code,
  Coffee,
  Sun,
  Moon,
  Zap,
  Target,
  Smile,
  Check,
  X,
  FolderHeart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Habit, CompletionRecord, HabitCategory, Collection, Category } from './types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import CategoriesManager from './components/CategoriesManager';

// Constants
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'Health', name: 'Health', color: '#ef4444', goalText: 'Maintain physical and mental well-being through daily habits.', targetCompletionsPerMonth: 20 },
  { id: 'Productivity', name: 'Productivity', color: '#3b82f6', goalText: 'Optimize workflow, study sessions, and mindful focus.', targetCompletionsPerMonth: 15 },
  { id: 'Personal', name: 'Personal', color: '#10b981', goalText: 'Foster continuous personal growth, reading, and learning.', targetCompletionsPerMonth: 15 },
  { id: 'Finances', name: 'Finances', color: '#f59e0b', goalText: 'Improve financial security, saving rates, and tracking.', targetCompletionsPerMonth: 8 },
  { id: 'Other', name: 'Other', color: '#6366f1', goalText: 'Sustain various positive daily habits and routines.', targetCompletionsPerMonth: 5 },
];

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
  '#f43f5e', '#71717a'
];

const HABIT_ICONS = [
  { name: 'Plus', icon: Plus },
  { name: 'Heart', icon: Heart },
  { name: 'Droplets', icon: Droplets },
  { name: 'Book', icon: Book },
  { name: 'Code', icon: Code },
  { name: 'Coffee', icon: Coffee },
  { name: 'Sun', icon: Sun },
  { name: 'Moon', icon: Moon },
  { name: 'Zap', icon: Zap },
  { name: 'Target', icon: Target },
  { name: 'Smile', icon: Smile },
  { name: 'Check', icon: Check },
];

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  type: 'streak' | 'total_completions' | 'first';
  targetValue: number;
  pointsReward: number;
  iconName: string;
}

export const BADGES: BadgeDefinition[] = [
  {
    id: 'first_step',
    name: 'Seed of Intention',
    description: 'Complete your first-ever daily habit check-in.',
    type: 'first',
    targetValue: 1,
    pointsReward: 50,
    iconName: 'Smile',
  },
  {
    id: 'streak_7',
    name: 'Week of Devotion',
    description: 'Reach a 7-day streak on any intention.',
    type: 'streak',
    targetValue: 7,
    pointsReward: 150,
    iconName: 'Flame',
  },
  {
    id: 'streak_30',
    name: 'Lunar Aura',
    description: 'Reach a 30-day streak on any intention.',
    type: 'streak',
    targetValue: 30,
    pointsReward: 500,
    iconName: 'Moon',
  },
  {
    id: 'streak_100',
    name: 'Century Sage',
    description: 'Reach a legendary 100-day streak on any intention.',
    type: 'streak',
    targetValue: 100,
    pointsReward: 2000,
    iconName: 'Trophy',
  },
  {
    id: 'total_10',
    name: 'Refinement Path',
    description: 'Achieve 10 total completions across your intentions.',
    type: 'total_completions',
    targetValue: 10,
    pointsReward: 100,
    iconName: 'Zap',
  },
  {
    id: 'total_50',
    name: 'Aether Architect',
    description: 'Achieve 50 total completions across your intentions.',
    type: 'total_completions',
    targetValue: 50,
    pointsReward: 500,
    iconName: 'Target',
  },
  {
    id: 'total_200',
    name: 'Cosmic Zen Mind',
    description: 'Achieve 200 total completions across your intentions.',
    type: 'total_completions',
    targetValue: 200,
    pointsReward: 1000,
    iconName: 'Sun',
  },
];

type SortOption = 'name' | 'category' | 'createdAt' | 'streak';

function MultiSelectToolbar({ 
  count, 
  categories,
  onClose, 
  onArchive, 
  onDelete, 
  onCategoryChange 
}: { 
  count: number; 
  categories: Category[];
  onClose: () => void; 
  onArchive: () => void; 
  onDelete: () => void; 
  onCategoryChange: (cat: HabitCategory) => void;
}) {
  return (
    <motion.div 
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-brand-900 text-brand-100 px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 backdrop-blur-md"
    >
      <div className="flex items-center gap-4 pr-8 border-r border-white/10">
        <span className="text-sm font-bold uppercase tracking-widest">{count} Selected</span>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={onArchive}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-brand-100/60 transition-colors"
        >
          <Archive size={16} />
          Archive
        </button>
        <button 
          onClick={onDelete}
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-red-400 transition-colors"
        >
          <Trash2 size={16} />
          Delete
        </button>
        
        <div className="relative group">
          <button className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest hover:text-brand-100/60 transition-colors">
            Move To...
          </button>
          <div className="absolute bottom-full mb-4 left-0 hidden group-hover:block bg-brand-900 border border-white/10 rounded-2xl p-2 min-w-[160px] shadow-2xl">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.name)}
                className="w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 rounded-lg transition-colors"
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('habitly_habits');
    return saved ? JSON.parse(saved) : [];
  });

  const [collections, setCollections] = useState<Collection[]>(() => {
    const saved = localStorage.getItem('habitly_collections');
    return saved ? JSON.parse(saved) : [];
  });

  const [completions, setCompletions] = useState<CompletionRecord>(() => {
    const saved = localStorage.getItem('habitly_completions');
    return saved ? JSON.parse(saved) : {};
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [view, setView] = useState<'today' | 'stats' | 'archived' | 'categories'>('today');
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('habitly_categories');
    return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
  });
  const [filter, setFilter] = useState<HabitCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [selectedHabitIds, setSelectedHabitIds] = useState<Set<string>>(new Set());
  const [aiAdvice, setAiAdvice] = useState<{ advice: string; suggestion: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<{ badgeName: string; points: number; text: string } | null>(null);
  const [triggeredReminders, setTriggeredReminders] = useState<{ [dateKey: string]: { [habitId: string]: boolean } }>(() => {
    const saved = localStorage.getItem('habitly_triggered_reminders');
    return saved ? JSON.parse(saved) : {};
  });
  const [toasts, setToasts] = useState<{ id: string; habitId: string; habitName: string; time: string; color: string }[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default';
  });

  useEffect(() => {
    localStorage.setItem('habitly_triggered_reminders', JSON.stringify(triggeredReminders));
  }, [triggeredReminders]);

  useEffect(() => {
    localStorage.setItem('habitly_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habitly_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('habitly_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('habitly_completions', JSON.stringify(completions));
  }, [completions]);

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentHourMin = format(now, 'HH:mm');
      const currentDateKey = format(now, 'yyyy-MM-dd');
      const currentDayOfWeek = now.getDay();

      habits.forEach(habit => {
        if (habit.archived) return;
        if (habit.frequency && habit.frequency.length > 0 && !habit.frequency.includes(currentDayOfWeek)) return;

        if (habit.reminderTime === currentHourMin) {
          const isCompletedToday = completions[currentDateKey]?.[habit.id];
          const isNotifiedToday = triggeredReminders[currentDateKey]?.[habit.id];

          if (!isCompletedToday && !isNotifiedToday) {
            // Trigger native browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification(`Intention Reminder: ${habit.name}`, {
                  body: habit.description || `It's time for your daily habit scheduled at ${habit.reminderTime}.`,
                  icon: '/favicon.ico'
                });
              } catch (err) {
                console.error('Failed to show native browser notification:', err);
              }
            }

            // Add custom visual in-app toast notification
            setToasts(prev => {
              if (prev.some(t => t.habitId === habit.id)) return prev;
              return [...prev, {
                id: `${habit.id}-${Date.now()}`,
                habitId: habit.id,
                habitName: habit.name,
                time: habit.reminderTime || currentHourMin,
                color: habit.color || '#ef4444'
              }];
            });

            // Persist that the reminder has been sent for this date
            setTriggeredReminders(prev => ({
              ...prev,
              [currentDateKey]: {
                ...(prev[currentDateKey] || {}),
                [habit.id]: true
              }
            }));
          }
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [habits, completions, triggeredReminders]);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setNotificationPermission(result);
      } catch (err) {
        console.error('Notification permission request error:', err);
      }
    }
  };

  const today = startOfToday();
  const todayKey = format(today, 'yyyy-MM-dd');

  const habitsForToday = useMemo(() => {
    const todayDay = today.getDay();
    return habits.filter(h => {
      if (h.archived) return false;
      if (!h.frequency || h.frequency.length === 0) return true;
      return h.frequency.includes(todayDay);
    });
  }, [habits, today]);

  const dailyCompletionRate = useMemo(() => {
    if (habitsForToday.length === 0) return 0;
    const completedCount = habitsForToday.filter(h => (completions[todayKey] || {})[h.id]).length;
    return Math.round((completedCount / habitsForToday.length) * 100);
  }, [habitsForToday, completions, todayKey]);

  const calculateStreakDetails = (habitId: string, history: CompletionRecord): { currentStreak: number; bestStreak: number; streakHistory: any[] } => {
    let currentStreak = 0;
    let bestStreak = 0;
    const streakHistory: { startDate: string; endDate: string; length: number }[] = [];
    
    // Sort all dates that have any records
    const habitCompletionDates = Object.keys(history)
      .filter(date => history[date]?.[habitId])
      .sort();

    if (habitCompletionDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0, streakHistory: [] };
    }

    let tempStreak = 1;
    let streakStart = habitCompletionDates[0];
    
    for (let i = 1; i <= habitCompletionDates.length; i++) {
      const prevDate = new Date(habitCompletionDates[i - 1]);
      const currDate = habitCompletionDates[i] ? new Date(habitCompletionDates[i]) : null;
      
      const isConsecutive = currDate && 
        (currDate.getTime() - prevDate.getTime()) <= (24 * 60 * 60 * 1000 + 1000 * 60); // Approx 1 day with small buffer

      if (isConsecutive) {
        tempStreak++;
      } else {
        // Streak ended
        streakHistory.push({
          startDate: streakStart,
          endDate: habitCompletionDates[i - 1],
          length: tempStreak
        });
        if (tempStreak > bestStreak) bestStreak = tempStreak;
        
        if (currDate) {
          tempStreak = 1;
          streakStart = habitCompletionDates[i];
        }
      }
    }

    // Calculate current streak
    const lastCompletedDateKey = habitCompletionDates[habitCompletionDates.length - 1];
    const lastDate = new Date(lastCompletedDateKey);
    const isStillActive = (today.getTime() - lastDate.getTime()) <= (24 * 60 * 60 * 1000 + 1000 * 60);
    
    if (isStillActive) {
      const lastStreak = streakHistory[streakHistory.length - 1];
      currentStreak = lastStreak.length;
    }

    return { currentStreak, bestStreak, streakHistory };
  };

  const calculateStreak = (habitId: string, history: CompletionRecord) => {
    return calculateStreakDetails(habitId, history).currentStreak;
  };

  // Stats calculation
  const stats = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });

    let last7DaysCompletions = 0;
    const chartData = last7Days.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayCompletions = completions[dateKey] || {};
      const completedCount = Object.values(dayCompletions).filter(Boolean).length;
      last7DaysCompletions += completedCount;
      
      return {
        date: format(date, 'MMM dd'),
        completions: completedCount,
      };
    });

    const totalCompletions = Object.values(completions).reduce((acc: number, day) => {
      return acc + Object.values(day).filter(Boolean).length;
    }, 0);

    const activeHabitsCount = habits.filter(h => !h.archived).length;
    const last7DaysPotential = activeHabitsCount * 7;
    const consistencyRate = last7DaysPotential > 0 ? Math.round((last7DaysCompletions / last7DaysPotential) * 100) : 0;

    return { chartData, totalCompletions, consistencyRate };
  }, [completions, today, habits]);

  const rewards = useMemo(() => {
    const totalCompletions = Object.values(completions).reduce((acc: number, day: any) => {
      return acc + Object.values(day || {}).filter(Boolean).length;
    }, 0) as number;

    const bestStreak: number = habits.length > 0 
      ? Math.max(0, ...habits.map(h => calculateStreakDetails(h.id, completions).bestStreak))
      : 0;

    const basePoints = totalCompletions * 10;
    
    // Determine which badges are unlocked
    const badgeStatus = BADGES.map(badge => {
      let isUnlocked = false;
      let progress = 0;
      
      if (badge.type === 'first') {
        isUnlocked = totalCompletions >= badge.targetValue;
        progress = Math.min(totalCompletions, badge.targetValue);
      } else if (badge.type === 'streak') {
        isUnlocked = bestStreak >= badge.targetValue;
        progress = Math.min(bestStreak, badge.targetValue);
      } else if (badge.type === 'total_completions') {
        isUnlocked = totalCompletions >= badge.targetValue;
        progress = Math.min(totalCompletions, badge.targetValue);
      }
      
      return {
        ...badge,
        isUnlocked,
        progress,
      };
    });

    const bonusPoints = badgeStatus.filter(b => b.isUnlocked).reduce((sum, b) => sum + b.pointsReward, 0);
    const totalPoints = basePoints + bonusPoints;

    return { totalPoints, badgeStatus, totalCompletions, bestStreak };
  }, [completions, habits]);

  const filteredHabits = useMemo(() => {
    let result = habits;
    
    if (view === 'archived') {
      result = result.filter(h => h.archived);
    } else if (view === 'today') {
      const todayDay = today.getDay();
      result = result.filter(h => {
        if (h.archived) return false;
        if (!h.frequency || h.frequency.length === 0) return true;
        return h.frequency.includes(todayDay);
      });
    }

    if (filter !== 'All') {
      result = result.filter(h => h.category === filter);
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'category') return a.category.localeCompare(b.category);
      if (sortBy === 'createdAt') return b.createdAt - a.createdAt;
      if (sortBy === 'streak') {
        return calculateStreak(b.id, completions) - calculateStreak(a.id, completions);
      }
      return 0;
    });
  }, [habits, filter, view, sortBy, completions]);

  const handleToggleHabit = (habitId: string) => {
    const isNowCompleting = !(completions[todayKey] || {})[habitId];
    
    setCompletions(prev => {
      const dayRecords = prev[todayKey] || {};
      return {
        ...prev,
        [todayKey]: {
          ...dayRecords,
          [habitId]: !dayRecords[habitId]
        }
      };
    });

    if (isNowCompleting) {
      // Calculate what the streak will be assuming it is checked today
      const simulatedCompletions = {
        ...completions,
        [todayKey]: {
          ...(completions[todayKey] || {}),
          [habitId]: true
        }
      };
      
      const details = calculateStreakDetails(habitId, simulatedCompletions);
      const newStreak = details.currentStreak;
      
      if (newStreak === 7) {
        setCelebratingMilestone({
          badgeName: "Week of Devotion (7 Days)",
          points: 150,
          text: "You have completed a solid 7-day devotion streak on this intention! Your mindful discipline is shining."
        });
      } else if (newStreak === 30) {
        setCelebratingMilestone({
          badgeName: "Lunar Aura (30 Days)",
          points: 500,
          text: "Incredible! A complete 30-day lunar cycle streak achieved. You have made this intention part of your essence."
        });
      } else if (newStreak === 100) {
        setCelebratingMilestone({
          badgeName: "Century Sage (100 Days)",
          points: 2000,
          text: "Pure mastery. A legendary 100-day streak unlocked. You have entered the realm of the ascended."
        });
      }
    }
  };

  const handleSaveHabit = (data: { 
    name: string; 
    category: HabitCategory; 
    color: string; 
    description?: string;
    frequency?: number[];
    reminderTime?: string;
    collectionId?: string;
    goal?: string;
    icon?: string;
  }) => {
    if (editingHabit) {
      setHabits(habits.map(h => h.id === editingHabit.id ? { ...h, ...data } : h));
    } else {
      const newHabit: Habit = {
        id: crypto.randomUUID(),
        ...data,
        createdAt: Date.now(),
        archived: false
      };
      setHabits([...habits, newHabit]);
    }
    setIsModalOpen(false);
    setEditingHabit(null);
  };

  const handleAddCollection = (name: string, color: string) => {
    const newColl: Collection = { id: crypto.randomUUID(), name, color };
    setCollections([...collections, newColl]);
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  const handleArchiveHabit = (id: string) => {
    setHabits(habits.map(h => h.id === id ? { ...h, archived: !h.archived } : h));
  };

  const toggleSelectHabit = (id: string) => {
    setSelectedHabitIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkArchive = () => {
    setHabits(habits.map(h => selectedHabitIds.has(h.id) ? { ...h, archived: true } : h));
    setSelectedHabitIds(new Set());
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedHabitIds.size} habits?`)) {
      setHabits(habits.filter(h => !selectedHabitIds.has(h.id)));
      setSelectedHabitIds(new Set());
    }
  };

  const handleBulkChangeCategory = (cat: HabitCategory) => {
    setHabits(habits.map(h => selectedHabitIds.has(h.id) ? { ...h, category: cat } : h));
    setSelectedHabitIds(new Set());
  };

  const getAiAdvice = async () => {
    setIsAiLoading(true);
    try {
      const streakInfo = habits.map(h => ({ name: h.name, streak: calculateStreak(h.id, completions) }));
      const response = await fetch('/api/ai/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habits: habits.map(h => h.name), streakInfo })
      });
      const data = await response.json();
      setAiAdvice(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-8 md:py-16 selection:bg-brand-900 selection:text-brand-100">
      {/* Header with Oversized Typography */}
      <header className="relative mb-16">
        <div className="flex justify-between items-start">
          <div className="z-10">
            <span className="text-sm font-semibold uppercase tracking-widest text-brand-900/40 mb-2 block">
              {format(today, 'EEEE, MMMM yyyy')}
            </span>
            <h1 className="font-serif font-black text-6xl md:text-8xl lg:text-9xl tracking-tighter leading-none text-brand-900">
              {format(today, 'dd')}
              <span className="text-3xl md:text-5xl ml-2 font-light italic">Today.</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="mr-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-400/15 text-yellow-600 rounded-full font-bold text-xs md:text-sm border border-yellow-400/20 shadow-sm shrink-0">
                <Trophy size={14} className="fill-yellow-500 text-yellow-600 shrink-0" />
                <span>{rewards.totalPoints} pts</span>
              </div>
            </div>
             {view === 'today' && habitsForToday.length > 0 && (
               <div className="flex items-center gap-2 md:gap-4 mr-2 md:mr-4">
                 <div className="text-right hidden sm:block">
                    <span className="text-[px] font-black uppercase tracking-widest text-brand-900/20 block">Today</span>
                    <span className="text-xl md:text-2xl font-serif italic text-brand-900">{dailyCompletionRate}%</span>
                 </div>
                 <div className="w-10 h-10 md:w-12 md:h-12 rounded-full border-4 border-brand-900/5 flex items-center justify-center relative overflow-hidden">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${dailyCompletionRate}%` }}
                      className="absolute bottom-0 left-0 right-0 bg-brand-900/10"
                    />
                    <span className="relative text-[8px] md:text-[10px] font-bold text-brand-900/40">{dailyCompletionRate}%</span>
                 </div>
               </div>
             )}
             <button 
              onClick={() => setView('today')}
              title="Today"
              className={cn(
                "p-2 md:p-3 rounded-full transition-all duration-300",
                view === 'today' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <CalendarIcon size={20} className="md:w-[24px] md:h-[24px]" />
            </button>
            <button 
              onClick={() => setView('archived')}
              title="Archived"
              className={cn(
                "p-2 md:p-3 rounded-full transition-all duration-300",
                view === 'archived' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <Archive size={20} className="md:w-[24px] md:h-[24px]" />
            </button>
            <button 
              onClick={() => setView('stats')}
              title="Statistics"
              className={cn(
                "p-2 md:p-3 rounded-full transition-all duration-300",
                view === 'stats' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <BarChart3 size={20} className="md:w-[24px] md:h-[24px]" />
            </button>
            <button 
              onClick={() => setView('categories')}
              title="Categories & Goals"
              className={cn(
                "p-2 md:p-3 rounded-full transition-all duration-300",
                view === 'categories' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <FolderHeart size={20} className="md:w-[24px] md:h-[24px]" />
            </button>
          </div>
        </div>
      </header>

      <main>
        {view === 'today' || view === 'archived' ? (
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-brand-900/10 pb-4">
              <h2 className="text-xl font-serif italic text-brand-900/60">
                {view === 'archived' ? 'Archived Intentions' : 'Your Daily Intentions'}
              </h2>
              <div className="flex gap-3">
                {notificationPermission !== 'granted' && (
                  <button 
                    onClick={requestNotificationPermission}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium hover:scale-105 transition-all shadow-sm border",
                      notificationPermission === 'denied' 
                        ? "bg-red-50 text-red-600 border-red-200" 
                        : "bg-white text-brand-900/60 border-brand-900/10 hover:text-brand-900"
                    )}
                    title={notificationPermission === 'denied' ? "Notification permissions blocked. Custom in-app alerts are active." : "Request desktop notification permission"}
                  >
                    <Bell size={18} className={cn(notificationPermission === 'denied' ? "text-red-500 animate-none" : "text-brand-900/40 animate-pulse")} />
                    <span className="hidden sm:inline">
                      {notificationPermission === 'denied' ? 'Reminders Blocked' : 'Enable Reminders'}
                    </span>
                  </button>
                )}
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-white border border-brand-900/10 rounded-full px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="createdAt">Sort: Latest</option>
                  <option value="name">Sort: Name</option>
                  <option value="category">Sort: Category</option>
                  <option value="streak">Sort: Streak</option>
                </select>
                <button 
                  onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-900 text-brand-100 rounded-full text-sm font-medium hover:scale-105 transition-transform"
                >
                  <Plus size={18} />
                  Add Habit
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
              <button
                onClick={() => setFilter('All')}
                className={cn(
                  "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all shrink-0",
                  filter === 'All' 
                    ? "bg-brand-900 text-brand-100 shadow-md" 
                    : "bg-white text-brand-900/40 border border-brand-900/5 hover:bg-white/80"
                )}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.name)}
                  className={cn(
                    "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all shrink-0 flex items-center gap-2",
                    filter === cat.name 
                      ? "bg-brand-900 text-brand-100 shadow-md" 
                      : "bg-white text-brand-900/40 border border-brand-900/5 hover:bg-white/80"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  {cat.name}
                </button>
              ))}
            </div>

            <div className="space-y-12">
              {Object.entries(
                filteredHabits.reduce((acc, h) => {
                  const collId = h.collectionId || 'individual';
                  if (!acc[collId]) acc[collId] = [];
                  acc[collId].push(h);
                  return acc;
                }, {} as Record<string, Habit[]>)
              ).map(([collId, collHabits]: [string, Habit[]]) => {
                const collection = collections.find(c => c.id === collId);
                return (
                  <div key={collId} className="space-y-4">
                    {collId !== 'individual' && collection && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 rounded-full" style={{ backgroundColor: collection.color }} />
                        <h3 className="font-serif text-2xl text-brand-900/40 italic">{collection.name}</h3>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {collHabits.map((habit: Habit) => (
                        <HabitCard 
                          key={habit.id}
                          habit={habit}
                          completed={!!(completions[todayKey] || {})[habit.id]}
                          streak={calculateStreak(habit.id, completions)}
                          bestStreak={calculateStreakDetails(habit.id, completions).bestStreak}
                          onToggle={() => handleToggleHabit(habit.id)}
                          onDelete={() => handleDeleteHabit(habit.id)}
                          onEdit={() => { setEditingHabit(habit); setIsModalOpen(true); }}
                          onArchive={() => handleArchiveHabit(habit.id)}
                          onSelect={() => toggleSelectHabit(habit.id)}
                          selected={selectedHabitIds.has(habit.id)}
                          isMultiSelectMode={selectedHabitIds.size > 0}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {filteredHabits.length === 0 && (
                <div className="col-span-full py-20 text-center bg-brand-200/50 rounded-[3rem] border-2 border-dashed border-brand-900/10 px-8">
                  <div className="w-20 h-20 bg-brand-900/5 rounded-full flex items-center justify-center mx-auto mb-6">
                    {view === 'archived' ? <Archive size={32} className="text-brand-900/20" /> : <Plus size={32} className="text-brand-900/20" />}
                  </div>
                  <h3 className="font-serif text-3xl text-brand-900 mb-2">
                    {habits.length === 0 
                      ? "Empty Slate, Pure Potential" 
                      : filter !== 'All' 
                        ? `No ${filter} intentions found`
                        : view === 'archived' 
                          ? "No items in sanctuary" 
                          : "Peaceful day ahead"}
                  </h3>
                  <p className="text-brand-900/40 italic max-w-sm mx-auto mb-8">
                    {habits.length === 0 
                      ? "Every great journey begins with a single deliberate choice. Start crafting your routine today."
                      : "Refine your filters or add a new intention to continue your journey."}
                  </p>
                  {habits.length === 0 && (
                    <button 
                      onClick={() => { setEditingHabit(null); setIsModalOpen(true); }}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-brand-900 text-brand-100 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      <Plus size={20} />
                      Start First Habit
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        ) : view === 'stats' ? (
          <StatsSection 
            stats={stats} 
            habits={habits} 
            completions={completions} 
            aiAdvice={aiAdvice}
            onGetAdvice={getAiAdvice}
            isAiLoading={isAiLoading}
            rewards={rewards}
          />
        ) : (
          <CategoriesManager 
            categories={categories}
            setCategories={setCategories}
            habits={habits}
            setHabits={setHabits}
            completions={completions}
          />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <HabitModal 
            habits={habits}
            habit={editingHabit}
            categories={categories}
            colors={COLORS}
            collections={collections}
            onAddCollection={handleAddCollection}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveHabit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedHabitIds.size > 0 && (
          <MultiSelectToolbar 
            count={selectedHabitIds.size}
            categories={categories}
            onClose={() => setSelectedHabitIds(new Set())}
            onArchive={handleBulkArchive}
            onDelete={handleBulkDelete}
            onCategoryChange={handleBulkChangeCategory}
          />
        )}
      </AnimatePresence>

      {/* Celebration Modal */}
      <AnimatePresence>
        {celebratingMilestone && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-900/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-brand-100 p-8 md:p-12 rounded-[3.5rem] border border-yellow-400/20 shadow-2xl max-w-lg w-full text-center relative overflow-hidden"
            >
              {/* Animated ambient light glow */}
              <motion.div 
                animate={{ scale: [1, 1.15, 1], rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-tr from-yellow-400/5 to-transparent rounded-full blur-3xl pointer-events-none"
              />

              <div className="relative z-10 space-y-6">
                <div className="w-24 h-24 bg-yellow-400 text-brand-900 rounded-[2rem] flex items-center justify-center mx-auto shadow-lg animate-bounce duration-1000">
                  <Trophy size={48} className="fill-current" />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-600 block font-sans">Milestone Reached!</span>
                  <h2 className="font-serif text-3xl md:text-4xl text-brand-900 leading-tight">
                    {celebratingMilestone.badgeName}
                  </h2>
                </div>

                <p className="text-sm font-sans text-brand-900/60 italic max-w-sm mx-auto leading-relaxed">
                  {celebratingMilestone.text}
                </p>

                <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-400 text-brand-900 rounded-full font-black text-xs md:text-sm shadow-md">
                  <Trophy size={14} className="fill-current" />
                  <span>+{celebratingMilestone.points} Essence PTS</span>
                </div>

                <div className="pt-4">
                  <button
                    onClick={() => setCelebratingMilestone(null)}
                    className="w-full py-4 bg-brand-900 text-brand-100 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl font-sans"
                  >
                    Integrate Essence
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating In-App Toast Notification Stream */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-4 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="pointer-events-auto w-full bg-brand-900 border border-white/10 text-brand-100 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 backdrop-blur-md relative overflow-hidden"
            >
              {/* Pulsing glow underlay matching habit color */}
              <div 
                className="absolute inset-0 opacity-[0.08] pointer-events-none rounded-3xl blur-xl"
                style={{ backgroundColor: toast.color }}
              />

              <div className="flex gap-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner"
                  style={{ backgroundColor: `${toast.color}20`, color: toast.color }}
                >
                  <Bell size={22} className="animate-bounce" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-brand-100/40 block">Reminder • {toast.time}</span>
                  <h4 className="font-serif text-lg leading-snug font-semibold mt-0.5 truncate text-brand-100">
                    {toast.habitName}
                  </h4>
                  <p className="text-xs text-brand-100/60 mt-1 line-clamp-2 leading-relaxed">
                    Take a moment for your intention right now.
                  </p>
                </div>
                <button 
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="absolute top-4 right-4 text-brand-100/30 hover:text-brand-100 p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex gap-2.5">
                <button
                  onClick={() => {
                    handleToggleHabit(toast.habitId);
                    setToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className="flex-1 py-3 bg-brand-100 text-brand-900 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check size={14} className="stroke-[3]" />
                  Complete
                </button>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className="px-4 py-3 bg-white/5 hover:bg-white/10 text-brand-100/80 hover:text-brand-100 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <footer className="mt-24 pt-8 border-t border-brand-900/10 text-center">
        <p className="text-xs text-brand-900/30 uppercase tracking-[0.2em] font-medium">Rfwstudios &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

interface HabitCardProps {
  habit: Habit;
  completed: boolean;
  streak: number;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onSelect: () => void;
  selected: boolean;
  isMultiSelectMode: boolean;
  bestStreak: number;
  key?: string;
}

function MilestoneBadge({ streak }: { streak: number }) {
  const milestone = streak >= 100 ? 100 : streak >= 30 ? 30 : streak >= 7 ? 7 : 0;
  if (!milestone) return null;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -20, y: 10 }}
      animate={{ 
        scale: [0, 1.2, 1], 
        rotate: [0, -10, 0],
        y: 0
      }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className="absolute -top-3 -right-3 z-30 flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-brand-900 rounded-full font-black text-[10px] shadow-lg border-2 border-white uppercase tracking-tighter"
    >
      <Trophy size={10} className="fill-brand-900 shrink-0" />
      <span className="whitespace-nowrap">{milestone} Day Legend</span>
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-white rounded-full"
      />
    </motion.div>
  );
}

function HabitCard({ habit, completed, streak, bestStreak, onToggle, onDelete, onEdit, onArchive, onSelect, selected, isMultiSelectMode }: HabitCardProps) {
  const milestone = streak === 7 || streak === 30 || streak === 100;
  const isHighStreak = streak >= 7;
  const HabitIcon = HABIT_ICONS.find(i => i.name === habit.icon)?.icon || HABIT_ICONS.find(i => i.name === 'Check')?.icon || Circle;
  
  return (
    <motion.div 
      layout
      className={cn(
        "group relative flex items-center justify-between p-6 rounded-3xl transition-all duration-500",
        selected ? "ring-2 ring-brand-900 border-transparent" : "border-brand-900/5",
        completed ? "bg-brand-900 text-brand-100" : "bg-white border shadow-sm hover:shadow-md",
        habit.archived && "opacity-60 grayscale-[0.5]"
      )}
    >
      <AnimatePresence>
        {isHighStreak && <MilestoneBadge streak={streak} />}
      </AnimatePresence>

      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={isMultiSelectMode ? onSelect : onToggle}>
        {isMultiSelectMode && (
          <div className={cn(
            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            selected ? "bg-brand-900 border-brand-900 text-brand-100" : "bg-white border-brand-900/10"
          )}>
            {selected && <Check size={14} />}
          </div>
        )}
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 relative"
          style={{ backgroundColor: completed ? 'rgba(255,255,255,0.1)' : `${habit.color}15` }}
        >
          {completed ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15 }}
            >
              <HabitIcon size={24} className="text-brand-100" />
            </motion.div>
          ) : (
            <HabitIcon size={24} style={{ color: habit.color }} />
          )}
          {completed && isHighStreak && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [1, 2, 2.5] }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 bg-white/20 rounded-full pointer-events-none"
            />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className={cn(
              "font-serif text-xl transition-all",
              completed ? "line-through opacity-60" : "text-brand-900"
            )}>
              {habit.name}
            </h3>
            {streak > 0 && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                completed ? "bg-brand-100/20 text-brand-100 border border-white/20" : "bg-orange-500 text-white shadow-sm"
              )}>
                <Flame size={10} className="fill-current" />
                {streak}
              </div>
            )}
            {bestStreak > streak && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter opacity-40",
                completed ? "text-brand-100" : "text-brand-900"
              )}>
                Best: {bestStreak}
              </div>
            )}
          </div>
          {habit.goal && (
            <p className={cn(
              "text-[10px] font-black uppercase tracking-widest mt-0.5",
              completed ? "text-brand-100/40" : "text-brand-900/40"
            )}>
              Goal: {habit.goal}
            </p>
          )}
          {habit.reminderTime && (
            <div className={cn(
              "flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest mt-1",
              completed ? "text-brand-100/40" : "text-brand-900/20"
            )}>
              <Bell size={10} />
              Reminds at {habit.reminderTime}
            </div>
          )}
          {habit.description && (
            <p className={cn(
              "text-sm mb-1 line-clamp-1 transition-all",
              completed ? "text-brand-100/60" : "text-brand-900/60"
            )}>
              {habit.description}
            </p>
          )}
          <span className={cn(
            "text-xs uppercase tracking-widest font-medium opacity-40",
            completed ? "text-brand-100" : "text-brand-900"
          )}>
            {habit.category}
          </span>
        </div>
      </div>

      <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/40 hover:text-brand-900",
            selected && "text-brand-900 font-bold bg-brand-200"
          )}
          aria-label="Select Intention"
        >
          <Check size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/20 hover:text-brand-900"
          )}
          aria-label="Edit Intention"
        >
          <Settings size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/20 hover:text-brand-900",
            habit.archived && "text-brand-900 font-bold bg-brand-200"
          )}
          aria-label={habit.archived ? "Unarchive Intention" : "Archive Intention"}
        >
          {habit.archived ? <History size={18} /> : <Archive size={18} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/20 hover:text-red-500"
          )}
          aria-label="Delete Intention"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function HistoryCalendar({ completions, habit }: { completions: CompletionRecord, habit: Habit }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subDays(monthStart, 1));
  const nextMonth = () => setCurrentDate(subDays(endOfMonth(monthStart), -1));

  return (
    <div className="bg-white p-6 rounded-3xl border border-brand-900/5 mt-4">
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-serif text-lg italic text-brand-900/60 flex items-center gap-2">
          <CalendarIcon size={18} />
          {format(currentDate, 'MMMM yyyy')}
        </h4>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-2 hover:bg-brand-200 rounded-full transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-brand-200 rounded-full transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
          <div key={day} className="text-center text-[10px] font-black text-brand-900/20 uppercase tracking-tighter py-2">
            {day}
          </div>
        ))}
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const isCompleted = completions[dateKey]?.[habit.id];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);

          return (
            <div 
              key={day.toString()}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center text-xs font-medium transition-all relative",
                !isCurrentMonth ? "opacity-10" : "opacity-100",
                isCompleted ? "bg-brand-900 text-brand-100" : "bg-brand-200/40 text-brand-900/40",
                isToday && !isCompleted && "ring-2 ring-brand-900/10"
              )}
            >
              {format(day, 'd')}
              {isCompleted && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-brand-100/40" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MasterCalendar({ completions, habits }: { completions: CompletionRecord, habits: Habit[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subDays(monthStart, 1));
  const nextMonth = () => setCurrentDate(subDays(endOfMonth(monthStart), -1));

  const getCompletionsForDay = (dateKey: string) => {
    const dayRecords = completions[dateKey] || {};
    return Object.keys(dayRecords).filter(habitId => dayRecords[habitId]).length;
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-brand-900/5 shadow-sm">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="font-serif text-2xl italic">Master Calendar</h3>
          <p className="text-xs text-brand-900/40 uppercase tracking-widest font-bold mt-1">Total Daily Completions</p>
        </div>
        <div className="flex items-center gap-4">
          <h4 className="font-serif text-lg italic text-brand-900/60">
            {format(currentDate, 'MMMM yyyy')}
          </h4>
          <div className="flex gap-1">
            <button onClick={prevMonth} className="p-2 hover:bg-brand-200 rounded-full transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-brand-200 rounded-full transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-3">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-[10px] font-black text-brand-900/20 uppercase tracking-widest py-2">
            {day}
          </div>
        ))}
        {calendarDays.map(day => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const count = getCompletionsForDay(dateKey);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const activeHabits = habits.length || 1;
          const intensity = Math.min(count / activeHabits, 1);

          return (
            <div 
              key={day.toString()}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center text-xs font-bold transition-all relative group",
                !isCurrentMonth ? "opacity-10 pointer-events-none" : "opacity-100",
                count > 0 ? "text-brand-100" : "bg-brand-200/40 text-brand-900/20"
              )}
              style={{ 
                backgroundColor: count > 0 ? `rgba(26, 26, 26, ${0.1 + intensity * 0.9})` : undefined 
              }}
            >
              {format(day, 'd')}
              {count > 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-brand-900/90 rounded-2xl transition-opacity">
                  <span className="text-[10px]">{count}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsSection({ stats, habits, completions, aiAdvice, onGetAdvice, isAiLoading, rewards }: { 
  stats: { chartData: any[], totalCompletions: number, consistencyRate: number };
  habits: Habit[];
  completions: CompletionRecord;
  aiAdvice: { advice: string; suggestion: string } | null;
  onGetAdvice: () => void;
  isAiLoading: boolean;
  rewards: {
    totalPoints: number;
    badgeStatus: any[];
    totalCompletions: number;
    bestStreak: number;
  };
}) {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(habits[0]?.id || null);
  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  const getBadgeIconComponent = (iconName: string) => {
    if (iconName === 'Flame') return Flame;
    if (iconName === 'Trophy') return Trophy;
    const match = HABIT_ICONS.find(i => i.name === iconName);
    return match ? match.icon : Trophy;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* AI Advice Section */}
      <div className="bg-gradient-to-br from-brand-900 to-[#2a2a2a] p-8 rounded-[2.5rem] text-brand-100 relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
          <Trophy size={160} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif text-3xl italic">Mindful Insight</h3>
            <button 
              onClick={onGetAdvice}
              disabled={isAiLoading || habits.length === 0}
              className="px-6 py-2 bg-brand-100 text-brand-900 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isAiLoading ? "Consulting Coach..." : "Get AI Advice"}
            </button>
          </div>
          
          {aiAdvice ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <p className="text-xl font-serif leading-relaxed text-brand-100/90 italic">"{aiAdvice.advice}"</p>
              <div className="pt-4 border-t border-brand-100/10">
                <span className="text-xs uppercase tracking-widest font-bold text-brand-100/40 block mb-1">Small Step Forward</span>
                <p className="text-sm text-brand-100/70">{aiAdvice.suggestion}</p>
              </div>
            </motion.div>
          ) : (
            <p className="text-brand-100/60 italic">Click the button for a personalized mindful perspective on your habits.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-brand-900/5 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <Trophy className="text-yellow-500" size={32} />
            <span className="text-xs uppercase tracking-widest font-bold text-brand-900/20">Total Check-ins</span>
          </div>
          <span className="block font-serif text-5xl font-black text-brand-900">{stats.totalCompletions}</span>
        </div>
        <div className="bg-brand-900 p-8 rounded-3xl text-brand-100">
           <div className="flex justify-between items-start mb-4">
            <CheckCircle2 className="text-brand-100" size={32} />
            <span className="text-xs uppercase tracking-widest font-bold text-brand-100/40">Active Habits</span>
          </div>
          <span className="block font-serif text-5xl font-black text-brand-100">{habits.length}</span>
        </div>
        <div className="bg-white p-8 rounded-3xl border border-brand-900/5 shadow-sm">
           <div className="flex justify-between items-start mb-4">
            <CalendarIcon className="text-brand-900/40" size={32} />
            <span className="text-xs uppercase tracking-widest font-bold text-brand-900/20">7-Day Consistency</span>
          </div>
          <span className="block font-serif text-5xl font-black text-brand-900">
            {stats.consistencyRate}%
          </span>
        </div>
      </div>

      {/* Achievements Sanctuary */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-brand-900/5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h3 className="font-serif text-2xl italic">Achievements Sanctuary</h3>
            <p className="text-xs text-brand-900/40 uppercase tracking-widest font-bold mt-1">Unlock milestones and earn essence points</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400/15 text-yellow-600 rounded-full font-bold text-sm border border-yellow-400/20 shadow-sm shrink-0">
            <Trophy size={16} className="fill-yellow-500 text-yellow-600" />
            <span>{rewards.totalPoints} Essence Points</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rewards.badgeStatus.map((badge) => {
            const isUnlocked = badge.isUnlocked;
            const percentage = Math.round((badge.progress / badge.targetValue) * 100);
            const BadgeIcon = getBadgeIconComponent(badge.iconName);

            return (
              <motion.div 
                key={badge.id}
                whileHover={{ y: -4 }}
                className={cn(
                  "p-6 rounded-[2rem] border transition-all relative overflow-hidden flex flex-col justify-between min-h-[220px]",
                  isUnlocked 
                    ? "bg-brand-900 text-brand-100 border-transparent shadow-md" 
                    : "bg-brand-200/20 border-brand-900/5 text-brand-900/80 shadow-sm"
                )}
              >
                {/* Background light-glow for unlocked badges */}
                {isUnlocked && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/5 rounded-full blur-3xl -translate-y-5 translate-x-5 pointer-events-none" />
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center",
                      isUnlocked ? "bg-yellow-400 text-brand-900 shadow-md animate-pulse" : "bg-brand-200 text-brand-900/30"
                    )}>
                      <BadgeIcon size={24} className={isUnlocked ? "fill-current" : ""} />
                    </div>
                    <div className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                      isUnlocked ? "bg-yellow-400/20 text-yellow-400" : "bg-brand-200 text-brand-900/40"
                    )}>
                      +{badge.pointsReward} PTS
                    </div>
                  </div>

                  <h4 className="font-serif text-lg leading-snug mb-1 font-semibold">{badge.name}</h4>
                  <p className={cn(
                    "text-xs leading-relaxed",
                    isUnlocked ? "text-brand-100/60" : "text-brand-900/60"
                  )}>
                    {badge.description}
                  </p>
                </div>

                <div className="mt-6">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest mb-1.5">
                    <span className={isUnlocked ? "text-yellow-400" : "text-brand-900/30"}>
                      {isUnlocked ? "Unlocked" : "Progress"}
                    </span>
                    <span className={isUnlocked ? "text-brand-100/40" : "text-brand-900/35 font-bold"}>
                      {badge.progress} / {badge.targetValue}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-brand-900/10 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-1000",
                        isUnlocked ? "bg-yellow-400" : "bg-brand-900/40"
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Habit History Calendar */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-brand-900/5 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-serif text-2xl italic">Habit History</h3>
            <select 
              value={selectedHabitId || ''}
              onChange={(e) => setSelectedHabitId(e.target.value)}
              className="bg-brand-100 border-none rounded-full px-4 py-2 text-sm font-medium focus:ring-0"
            >
              <option value="">Select a habit...</option>
              {habits.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          </div>
          
          {selectedHabit ? (
            <HistoryCalendar completions={completions} habit={selectedHabit} />
          ) : (
            <div className="py-20 text-center opacity-20 italic">Select a habit to view its journey.</div>
          )}
        </div>

        {/* Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-brand-900/5 shadow-sm">
          <h3 className="font-serif text-2xl mb-8 italic">Trend</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chartData}>
                <defs>
                  <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1a1a1a10" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#1a1a1a40', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1a1a1a', 
                    border: 'none', 
                    borderRadius: '16px',
                    color: '#f5f2ed',
                    fontSize: '12px'
                  }}
                  itemStyle={{ color: '#f5f2ed' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="completions" 
                  stroke="#1a1a1a" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorComp)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <MasterCalendar completions={completions} habits={habits} />
    </motion.div>
  );
}

function HabitModal({ habits, habit, categories, colors, collections, onAddCollection, onClose, onSave }: { 
  habits: Habit[];
  habit: Habit | null;
  categories: any[]; 
  colors: string[];
  collections: Collection[];
  onAddCollection: (name: string, color: string) => void;
  onClose: () => void;
  onSave: (data: { 
    name: string; 
    category: HabitCategory; 
    color: string; 
    description?: string;
    frequency?: number[];
    reminderTime?: string;
    collectionId?: string;
    goal?: string;
    icon?: string;
  }) => void;
}) {
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [category, setCategory] = useState<HabitCategory>(habit?.category || 'Health');
  const [color, setColor] = useState(habit?.color || '#ef4444');
  const [customColor, setCustomColor] = useState(habit?.color || '#ef4444');
  const [goal, setGoal] = useState(habit?.goal || '');
  const [iconName, setIconName] = useState(habit?.icon || 'Check');
  const [frequency, setFrequency] = useState<number[]>(habit?.frequency || [0, 1, 2, 3, 4, 5, 6]);
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime || '');
  const [collectionId, setCollectionId] = useState(habit?.collectionId || '');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const toggleDay = (day: number) => {
    setFrequency(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const handleAddCollection = () => {
    if (!newCollectionName.trim()) return;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    onAddCollection(newCollectionName.trim(), color);
    setNewCollectionName('');
  };

  const getAiSuggestions = async () => {
    setIsSuggesting(true);
    try {
      const response = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentHabits: habits.map(h => h.name),
          categories: categories.map(c => c.name)
        })
      });
      const data = await response.json();
      setAiSuggestions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ 
      name, 
      category, 
      color, 
      description: description.trim() || undefined,
      frequency: frequency.length === 7 ? undefined : frequency,
      reminderTime: reminderTime || undefined,
      collectionId: collectionId || undefined,
      goal: goal.trim() || undefined,
      icon: iconName
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-10 bg-brand-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-brand-100 w-full max-w-4xl p-8 rounded-[2.5rem] shadow-2xl z-10"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-serif text-3xl">{habit ? 'Refine Intention' : 'New Intention'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-200 rounded-full transition-colors">
            <Trash2 size={24} className="opacity-20" />
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Habit Name</label>
                <input 
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-brand-900/10 p-4 rounded-2xl text-lg font-serif focus:outline-none focus:ring-2 focus:ring-brand-900/10"
                  placeholder="e.g. Daily Reflection"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Daily Goal (Optional)</label>
                <input 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full bg-white border border-brand-900/10 p-4 rounded-2xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-900/10"
                  placeholder="e.g. 8 glasses, 30 minutes"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Frequency</label>
                <div className="flex justify-between gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "w-8 h-8 rounded-lg text-[10px] font-black transition-all",
                        frequency.includes(i) 
                          ? "bg-brand-900 text-brand-100" 
                          : "bg-white text-brand-900/20 border border-brand-900/5"
                      )}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Care Context</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-brand-900/10 p-4 rounded-2xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-brand-900/10 resize-none h-24"
                  placeholder="Why is this habit important to your journey?"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Reminder</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-900/20" size={16} />
                    <input 
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full bg-white border border-brand-900/10 pl-10 pr-4 py-4 rounded-2xl text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value as HabitCategory)}
                    className="w-full bg-white border border-brand-900/10 px-4 py-4 rounded-2xl text-sm focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-2 block">Collection</label>
                <div className="flex gap-2 mb-2">
                  <select 
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="flex-1 bg-white border border-brand-900/10 px-4 py-3 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">No Collection</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input 
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1 bg-white/50 border border-brand-900/5 px-4 py-2 rounded-xl text-xs"
                    placeholder="New collection name..."
                  />
                  <button 
                    type="button"
                    onClick={handleAddCollection}
                    className="px-4 py-2 bg-brand-200 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-3 block">Essence Color</label>
                <div className="flex flex-wrap gap-2 mb-4">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        setCustomColor(c);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 transition-all",
                        color === c ? "border-brand-900 scale-125 shadow-md" : "border-transparent"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 mb-3 block">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {HABIT_ICONS.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => setIconName(item.name)}
                      className={cn(
                        "p-2 rounded-xl border-2 transition-all",
                        iconName === item.name ? "border-brand-900 bg-brand-900 text-brand-100" : "border-brand-900/5 bg-white text-brand-900/40"
                      )}
                    >
                      <item.icon size={18} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button"
                  onClick={onClose}
                  className="px-6 py-4 rounded-2xl text-brand-900/40 font-bold uppercase tracking-widest text-[10px] hover:bg-brand-200"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-4 rounded-2xl bg-brand-900 text-brand-100 font-bold uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {habit ? 'Update' : 'Begin'}
                </button>
              </div>
            </div>
          </form>

          {/* AI Suggestions Side Panel */}
          <div className="bg-brand-200/50 rounded-[2rem] p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-xl italic text-brand-900/60">Ideas</h3>
              <button 
                onClick={getAiSuggestions}
                disabled={isSuggesting}
                className="p-2 hover:bg-brand-900/5 rounded-full transition-colors text-brand-900/40 disabled:opacity-50"
              >
                <History size={18} className={isSuggesting ? "animate-spin" : ""} />
              </button>
            </div>

            {isSuggesting ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white/50 h-24 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : aiSuggestions.length > 0 ? (
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setName(suggestion.name);
                      setCategory(suggestion.category);
                      setDescription(suggestion.description);
                    }}
                    className="w-full text-left bg-white p-4 rounded-2xl border border-brand-900/5 hover:border-brand-900/20 transition-all group"
                  >
                    <span className="text-[10px] font-black uppercase tracking-tighter text-brand-900/20 group-hover:text-brand-900/40">{suggestion.category}</span>
                    <h4 className="font-serif text-lg text-brand-900 leading-tight mb-1">{suggestion.name}</h4>
                    <p className="text-[10px] text-brand-900/40 line-clamp-2">{suggestion.description}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-xs text-brand-900/20 italic">Click the icon to see personalized habit suggestions.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}


