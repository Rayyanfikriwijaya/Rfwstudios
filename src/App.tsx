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
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Habit, CompletionRecord, HabitCategory, Collection } from './types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Constants
const CATEGORIES: { name: HabitCategory; color: string }[] = [
  { name: 'Health', color: '#ef4444' },
  { name: 'Productivity', color: '#3b82f6' },
  { name: 'Personal', color: '#10b981' },
  { name: 'Finances', color: '#f59e0b' },
  { name: 'Other', color: '#6366f1' },
];

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
  '#f43f5e', '#71717a'
];

type SortOption = 'name' | 'category' | 'createdAt' | 'streak';

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
  const [view, setView] = useState<'today' | 'stats' | 'archived'>('today');
  const [filter, setFilter] = useState<HabitCategory | 'All'>('All');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [aiAdvice, setAiAdvice] = useState<{ advice: string; suggestion: string } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem('habitly_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habitly_collections', JSON.stringify(collections));
  }, [collections]);

  useEffect(() => {
    localStorage.setItem('habitly_completions', JSON.stringify(completions));
  }, [completions]);

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

  const calculateStreak = (habitId: string, history: CompletionRecord) => {
    let currentStreak = 0;
    
    // Check if streak is still alive (today or yesterday completed)
    const isDoneToday = !!history[todayKey]?.[habitId];
    const yesterdayKey = format(subDays(today, 1), 'yyyy-MM-dd');
    const isDoneYesterday = !!history[yesterdayKey]?.[habitId];

    if (!isDoneToday && !isDoneYesterday) return 0;

    // Start counting from the most recent completed day
    let checkDate = isDoneToday ? today : subDays(today, 1);
    
    while (history[format(checkDate, 'yyyy-MM-dd')]?.[habitId]) {
      currentStreak++;
      checkDate = subDays(checkDate, 1);
    }
    
    return currentStreak;
  };

  // Stats calculation
  const stats = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });

    const chartData = last7Days.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayCompletions = completions[dateKey] || {};
      const completedCount = Object.values(dayCompletions).filter(Boolean).length;
      
      return {
        date: format(date, 'MMM dd'),
        completions: completedCount,
      };
    });

    const totalCompletions = Object.values(completions).reduce((acc: number, day) => {
      return acc + Object.values(day).filter(Boolean).length;
    }, 0);

    return { chartData, totalCompletions };
  }, [completions, today]);

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
  };

  const handleSaveHabit = (data: { 
    name: string; 
    category: HabitCategory; 
    color: string; 
    description?: string;
    frequency?: number[];
    reminderTime?: string;
    collectionId?: string;
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
          
          <div className="flex gap-2">
             {view === 'today' && habitsForToday.length > 0 && (
               <div className="hidden md:flex items-center gap-4 mr-4">
                 <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-900/20 block">Today's Progress</span>
                    <span className="text-2xl font-serif italic text-brand-900">{dailyCompletionRate}%</span>
                 </div>
                 <div className="w-12 h-12 rounded-full border-4 border-brand-900/5 flex items-center justify-center relative overflow-hidden">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${dailyCompletionRate}%` }}
                      className="absolute bottom-0 left-0 right-0 bg-brand-900/10"
                    />
                    <span className="relative text-[10px] font-bold text-brand-900/40">{dailyCompletionRate}%</span>
                 </div>
               </div>
             )}
             <button 
              onClick={() => setView('today')}
              title="Today"
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                view === 'today' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <CalendarIcon size={24} />
            </button>
            <button 
              onClick={() => setView('archived')}
              title="Archived"
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                view === 'archived' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <Archive size={24} />
            </button>
            <button 
              onClick={() => setView('stats')}
              title="Statistics"
              className={cn(
                "p-3 rounded-full transition-all duration-300",
                view === 'stats' ? "bg-brand-900 text-brand-100" : "bg-transparent text-brand-900/60 hover:bg-brand-200"
              )}
            >
              <BarChart3 size={24} />
            </button>
          </div>
        </div>
      </header>

      <main>
        {view !== 'stats' ? (
          <section className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-brand-900/10 pb-4">
              <h2 className="text-xl font-serif italic text-brand-900/60">
                {view === 'archived' ? 'Archived Intentions' : 'Your Daily Intentions'}
              </h2>
              <div className="flex gap-3">
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
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
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
                          onToggle={() => handleToggleHabit(habit.id)}
                          onDelete={() => handleDeleteHabit(habit.id)}
                          onEdit={() => { setEditingHabit(habit); setIsModalOpen(true); }}
                          onArchive={() => handleArchiveHabit(habit.id)}
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
        ) : (
          <StatsSection 
            stats={stats} 
            habits={habits} 
            completions={completions} 
            aiAdvice={aiAdvice}
            onGetAdvice={getAiAdvice}
            isAiLoading={isAiLoading}
          />
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isModalOpen && (
          <HabitModal 
            habits={habits}
            habit={editingHabit}
            categories={CATEGORIES}
            colors={COLORS}
            collections={collections}
            onAddCollection={handleAddCollection}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveHabit}
          />
        )}
      </AnimatePresence>

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

function HabitCard({ habit, completed, streak, onToggle, onDelete, onEdit, onArchive }: HabitCardProps) {
  const milestone = streak === 7 || streak === 30 || streak === 100;
  const isHighStreak = streak >= 7;
  
  return (
    <motion.div 
      layout
      className={cn(
        "group relative flex items-center justify-between p-6 rounded-3xl transition-all duration-500",
        completed ? "bg-brand-900 text-brand-100" : "bg-white border border-brand-900/5 shadow-sm hover:shadow-md",
        habit.archived && "opacity-60 grayscale-[0.5]"
      )}
    >
      <AnimatePresence>
        {isHighStreak && <MilestoneBadge streak={streak} />}
      </AnimatePresence>
      <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={onToggle}>
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
              <CheckCircle2 size={24} className="text-brand-100" />
            </motion.div>
          ) : (
            <Circle size={24} style={{ color: habit.color }} />
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
          <div className="flex items-center gap-2">
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
                {streak} {streak === 1 ? 'Day' : 'Days'}
              </div>
            )}
          </div>
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

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/20 hover:text-brand-900"
          )}
          title="Edit"
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
          title={habit.archived ? "Unarchive" : "Archive"}
        >
          {habit.archived ? <History size={18} /> : <Archive size={18} />}
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className={cn(
            "p-2 rounded-xl hover:bg-brand-100/10",
            completed ? "text-brand-100/40 hover:text-brand-100" : "text-brand-900/20 hover:text-red-500"
          )}
          title="Delete"
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

function StatsSection({ stats, habits, completions, aiAdvice, onGetAdvice, isAiLoading }: { 
  stats: { chartData: any[], totalCompletions: number };
  habits: Habit[];
  completions: CompletionRecord;
  aiAdvice: { advice: string; suggestion: string } | null;
  onGetAdvice: () => void;
  isAiLoading: boolean;
}) {
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(habits[0]?.id || null);
  const selectedHabit = habits.find(h => h.id === selectedHabitId);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* AI Advice Section */}
      <div className="bg-gradient-to-br from-brand-900 to-[#2a2a2a] p-8 rounded-[2.5rem] text-brand-100 relative overflow-hidden group">
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
            <span className="text-xs uppercase tracking-widest font-bold text-brand-900/20">Consistency Rate</span>
          </div>
          <span className="block font-serif text-5xl font-black text-brand-900">
            {habits.length > 0 ? Math.round((stats.totalCompletions / (habits.length * 7)) * 100) : 0}%
          </span>
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
  }) => void;
}) {
  const [name, setName] = useState(habit?.name || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [category, setCategory] = useState<HabitCategory>(habit?.category || 'Health');
  const [color, setColor] = useState(habit?.color || '#ef4444');
  const [customColor, setCustomColor] = useState(habit?.color || '#ef4444');
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

  const handleHandleAddCollection = () => {
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
      collectionId: collectionId || undefined
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
                    onClick={handleHandleAddCollection}
                    className="px-4 py-2 bg-brand-200 rounded-xl text-[10px] font-bold uppercase tracking-widest"
                  >
                    Create
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs uppercase tracking-widest font-bold text-brand-900/40 block">Essence Color</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      value={customColor}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                          setColor(e.target.value);
                        }
                      }}
                      className="w-20 px-2 py-1 text-[10px] font-mono border border-brand-900/10 rounded uppercase"
                    />
                    <input 
                      type="color" 
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        setCustomColor(e.target.value);
                      }}
                      className="w-6 h-6 rounded-lg overflow-hidden border-none"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
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


