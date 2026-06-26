import { useState, useMemo, FormEvent } from 'react';
import { Trash2, Edit3, Plus, Trophy, CheckCircle2, FolderHeart, AlertCircle, X, Sparkles, Target, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Category, Habit, CompletionRecord } from '../types';
import { isSameMonth, format } from 'date-fns';

interface CategoriesManagerProps {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  habits: Habit[];
  setHabits: (habits: Habit[]) => void;
  completions: CompletionRecord;
}

export default function CategoriesManager({
  categories,
  setCategories,
  habits,
  setHabits,
  completions,
}: CategoriesManagerProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [goalText, setGoalText] = useState('');
  const [targetCompletions, setTargetCompletions] = useState(15);
  const [error, setError] = useState('');

  const COLOR_PALETTE = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#f59e0b', // Yellow/Amber
    '#10b981', // Green
    '#06b6d4', // Cyan
    '#3b82f6', // Blue
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#d946ef', // Magenta/Pink
    '#71717a'  // Zinc
  ];

  const now = new Date();
  const currentMonthName = format(now, 'MMMM');

  // Find completions recorded in the current calendar month
  const currentMonthKeys = useMemo(() => {
    return Object.keys(completions).filter(dateKey => {
      try {
        const parsedDate = new Date(dateKey);
        return isSameMonth(parsedDate, now);
      } catch {
        return false;
      }
    });
  }, [completions, now]);

  // Compute total completions per category in current month
  const completionsByCategory = useMemo(() => {
    return categories.reduce((acc, cat) => {
      let count = 0;
      currentMonthKeys.forEach(dateKey => {
        const dayCompletions = completions[dateKey] || {};
        habits.forEach(habit => {
          // Compare case-insensitively just in case
          if (habit.category.toLowerCase() === cat.name.toLowerCase() && dayCompletions[habit.id]) {
            count++;
          }
        });
      });
      acc[cat.id] = count;
      return acc;
    }, {} as Record<string, number>);
  }, [categories, habits, completions, currentMonthKeys]);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
    setGoalText('');
    setTargetCompletions(15);
    setError('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setColor(cat.color);
    setGoalText(cat.goalText);
    setTargetCompletions(cat.targetCompletionsPerMonth || 15);
    setError('');
    setIsFormOpen(true);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Category name cannot be empty.');
      return;
    }

    const trimmedName = name.trim();

    // Check conflict (excluding current category being edited)
    const exists = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && (!editingCategory || c.id !== editingCategory.id)
    );
    if (exists) {
      setError('A category with this name already exists.');
      return;
    }

    if (editingCategory) {
      // Update existing category
      const updatedCategories = categories.map(c => {
        if (c.id === editingCategory.id) {
          return {
            ...c,
            name: trimmedName,
            color,
            goalText: goalText.trim(),
            targetCompletionsPerMonth: targetCompletions,
          };
        }
        return c;
      });

      // Update associated habits if name changed
      if (editingCategory.name !== trimmedName) {
        const updatedHabits = habits.map(h => {
          if (h.category === editingCategory.name) {
            return { ...h, category: trimmedName };
          }
          return h;
        });
        setHabits(updatedHabits);
      }

      setCategories(updatedCategories);
    } else {
      // Create new category
      const newCat: Category = {
        id: crypto.randomUUID(),
        name: trimmedName,
        color,
        goalText: goalText.trim(),
        targetCompletionsPerMonth: targetCompletions,
      };
      setCategories([...categories, newCat]);
    }

    setIsFormOpen(false);
    setEditingCategory(null);
  };

  const handleDelete = (cat: Category) => {
    if (categories.length <= 1) {
      alert('You must maintain at least one category sanctuary.');
      return;
    }

    const associatedHabits = habits.filter(h => h.category.toLowerCase() === cat.name.toLowerCase());
    const confirmMessage = associatedHabits.length > 0 
      ? `Are you sure you want to delete the "${cat.name}" category? Its ${associatedHabits.length} habits will be safely reassigned to "${categories.find(c => c.id !== cat.id)?.name}".`
      : `Are you sure you want to delete the "${cat.name}" category?`;

    if (window.confirm(confirmMessage)) {
      const remainingCats = categories.filter(c => c.id !== cat.id);
      const fallbackCatName = remainingCats[0]?.name || 'Other';

      // Reassign habits
      const updatedHabits = habits.map(h => {
        if (h.category.toLowerCase() === cat.name.toLowerCase()) {
          return { ...h, category: fallbackCatName };
        }
        return h;
      });

      setHabits(updatedHabits);
      setCategories(remainingCats);
    }
  };

  return (
    <section className="space-y-8">
      {/* Overview Card */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 border-b border-brand-900/10 pb-6">
        <div>
          <h2 className="text-3xl font-serif italic text-brand-900 leading-tight">Category Sanctuaries</h2>
          <p className="text-xs text-brand-900/40 uppercase tracking-[0.2em] font-bold mt-1">
            Define long-term goals and cultivate alignment towards monthly milestones
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-900 text-brand-100 rounded-full text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all shadow-md shrink-0 font-sans uppercase tracking-wider"
        >
          <Plus size={18} />
          Create Category
        </button>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const associatedHabits = habits.filter(h => h.category.toLowerCase() === cat.name.toLowerCase() && !h.archived);
          const monthlyCount = completionsByCategory[cat.id] || 0;
          const target = cat.targetCompletionsPerMonth || 15;
          const percentage = Math.min(100, Math.round((monthlyCount / target) * 100));

          // Beautiful alignment status labels
          let statusText = "Awaiting Spark";
          let statusColor = "text-brand-900/40 bg-brand-900/5";
          if (percentage >= 100) {
            statusText = "Fully Aligned ✨";
            statusColor = "text-yellow-600 bg-yellow-400/15 border border-yellow-400/20 shadow-sm";
          } else if (percentage >= 50) {
            statusText = "Pathway Manifesting";
            statusColor = "text-emerald-600 bg-emerald-500/10 border border-emerald-500/20";
          } else if (percentage > 0) {
            statusText = "Cultivating Devotion";
            statusColor = "text-blue-600 bg-blue-500/10 border border-blue-500/20";
          }

          return (
            <motion.div
              key={cat.id}
              whileHover={{ y: -4 }}
              className="bg-white p-8 rounded-[2.5rem] border border-brand-900/5 shadow-sm flex flex-col justify-between min-h-[340px] relative overflow-hidden group"
            >
              {/* Decorative Subtle Glowing Background Ring */}
              <div 
                className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 -translate-y-6 translate-x-6 pointer-events-none transition-transform group-hover:scale-125 duration-500"
                style={{ backgroundColor: cat.color }}
              />

              <div className="space-y-6">
                {/* Category Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full shadow-inner block shrink-0" style={{ backgroundColor: cat.color }} />
                    <h3 className="font-serif text-2xl font-semibold text-brand-900 truncate max-w-[150px]" title={cat.name}>
                      {cat.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-2 hover:bg-brand-200/50 rounded-xl text-brand-900/40 hover:text-brand-900 transition-colors"
                      title="Edit Category Sanctuary"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="p-2 hover:bg-red-50 rounded-xl text-brand-900/40 hover:text-red-500 transition-colors"
                      title="Delete Category Sanctuary"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Long Term Goal Display */}
                <div className="bg-brand-200/20 p-5 rounded-2xl border border-brand-900/5 min-h-[84px] flex flex-col justify-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-900/30 block mb-1">Long-term Goal</span>
                  <p className="font-sans text-xs italic text-brand-900/70 leading-relaxed">
                    {cat.goalText ? `“${cat.goalText}”` : "“No long-term goal defined yet. Click edit to set one.”"}
                  </p>
                </div>

                {/* Associated Habits */}
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-900/30 block mb-2">Associated Intentions ({associatedHabits.length})</span>
                  {associatedHabits.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-[50px] overflow-y-auto scrollbar-hide">
                      {associatedHabits.map(h => (
                        <span 
                          key={h.id} 
                          className="px-2.5 py-1 bg-brand-900/5 text-brand-900/60 rounded-full text-[10px] font-medium"
                        >
                          {h.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[10px] text-brand-900/35 italic">No active habits in this category.</p>
                  )}
                </div>
              </div>

              {/* Progress Tracker Footer */}
              <div className="pt-6 border-t border-brand-900/5 mt-6 space-y-3">
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-brand-900/40">{currentMonthName} Devotion</span>
                  <span className="text-brand-900/60 font-black">{monthlyCount} / {target} checks</span>
                </div>

                {/* Custom-colored progress bar */}
                <div className="w-full h-2.5 bg-brand-900/5 rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className={cn("text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full", statusColor)}>
                    {statusText}
                  </span>
                  <span className="text-xs font-black text-brand-900/70">{percentage}%</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Dynamic Modal Form Overlay for Create/Edit */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-brand-100 p-8 md:p-10 rounded-[3.5rem] border border-white/10 shadow-2xl max-w-lg w-full relative"
            >
              <button
                onClick={() => setIsFormOpen(false)}
                className="absolute top-8 right-8 p-2.5 bg-white border border-brand-900/10 hover:bg-brand-200 rounded-full text-brand-900/40 hover:text-brand-900 transition-all shadow-sm"
              >
                <X size={16} />
              </button>

              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="w-12 h-12 bg-brand-900 text-brand-100 rounded-2xl flex items-center justify-center shadow-md mb-3">
                    <FolderHeart size={24} />
                  </div>
                  <h3 className="font-serif text-3xl text-brand-900 leading-tight">
                    {editingCategory ? 'Edit Sanctuary' : 'New Category Sanctuary'}
                  </h3>
                  <p className="text-xs text-brand-900/50">
                    A dedicated landscape to organize matching positive patterns.
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-5">
                  {/* Category Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-900/40 block">Category Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Fitness, Mindfulness, Learning, Art"
                      maxLength={30}
                      className="w-full bg-white border border-brand-900/10 px-5 py-4 rounded-2xl text-sm focus:outline-none focus:border-brand-900/30 shadow-sm"
                    />
                  </div>

                  {/* Long-term Goal */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-900/40 block">Long-term Goal Statement</label>
                    <textarea
                      value={goalText}
                      onChange={(e) => setGoalText(e.target.value)}
                      placeholder="e.g., Cultivate a strong core body, read 12 mindfulness scrolls, or master typing skills."
                      rows={3}
                      maxLength={180}
                      className="w-full bg-white border border-brand-900/10 px-5 py-4 rounded-2xl text-sm focus:outline-none focus:border-brand-900/30 shadow-sm resize-none"
                    />
                  </div>

                  {/* Monthly target */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-900/40 block">Monthly Goal Targets (Total completions)</label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-900/20 animate-pulse" size={16} />
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={targetCompletions}
                        onChange={(e) => setTargetCompletions(Number(e.target.value))}
                        className="w-full bg-white border border-brand-900/10 pl-11 pr-5 py-4 rounded-2xl text-sm focus:outline-none focus:border-brand-900/30 shadow-sm font-semibold"
                      />
                    </div>
                    <span className="text-[9px] text-brand-900/35 leading-relaxed block">
                      Recommended: 15 to 30. This counts all checks across matching habits this month.
                    </span>
                  </div>

                  {/* Color Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-brand-900/40 block">Visual Sanctuary Aura (Color)</label>
                    <div className="flex flex-wrap gap-2.5 p-4 bg-white rounded-2xl border border-brand-900/5 shadow-sm">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={cn(
                            "w-7 h-7 rounded-full transition-transform active:scale-90",
                            color === c ? "scale-110 shadow-md ring-2 ring-brand-900 ring-offset-2" : "opacity-70 hover:opacity-100 hover:scale-105"
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      {/* Advanced color picker */}
                      <div className="relative w-7 h-7 rounded-full overflow-hidden border border-brand-900/10 shadow-inner group cursor-pointer shrink-0">
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="absolute inset-0 scale-150 cursor-pointer opacity-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="flex-1 py-4 bg-white hover:bg-brand-200 border border-brand-900/10 text-brand-900 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all font-sans"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-brand-900 hover:bg-brand-900/95 text-brand-100 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all shadow-md flex items-center justify-center gap-1.5 font-sans"
                    >
                      <Sparkles size={14} />
                      {editingCategory ? 'Update Sanctuary' : 'Initiate Sanctuary'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
