import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  XCircle,
  Circle,
  Calendar,
  BarChart3,
  BookOpen,
  Settings,
  Download,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Flame,
  Award,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Moon,
  Sun,
  Star,
  Check,
  Save,
  Clock,
  Target
} from 'lucide-react';

// ==========================================
// DEFAULT DATA FROM habit.xlsx
// ==========================================
const DEFAULT_HABITS = [
  { id: 'h1', name: 'Wake up by 9:00', why: 'Protects the quiet morning hours', category: 'Health', color: 'emerald' },
  { id: 'h2', name: 'Sleep for 6-7 hrs', why: 'Recovery & physical wellness', category: 'Health', color: 'blue' },
  { id: 'h3', name: 'Read 5 pages', why: 'Keep learning & compounding knowledge', category: 'Personal', color: 'amber' },
  { id: 'h4', name: 'screen time less than 4', why: 'Focus & eye health', category: 'Productivity', color: 'purple' },
  { id: 'h5', name: 'Dropshipping 2 task', why: 'Business growth & execution', category: 'Business', color: 'indigo' },
  { id: 'h6', name: 'Cybersec 4 hrs', why: 'Work on core technical skill', category: 'Skill', color: 'cyan' },
  { id: 'h7', name: 'complete a lab in any site', why: 'Hands-on practice & applied learning', category: 'Skill', color: 'sky' },
  { id: 'h8', name: 'Other activity', why: 'Any other fitness or outdoor activity', category: 'Lifestyle', color: 'rose' }
];

const DEFAULT_SETTINGS = {
  targetRate: 70,
  theme: 'dark',
  userName: 'Achiever'
};

// Seed sample log entries for late October 2026 to ensure the app is populated out-of-the-box
const INITIAL_LOGS = {
  '2026-10-23': {
    checks: { h1: true, h2: true, h3: true, h4: false, h5: true, h6: true, h7: true, h8: true },
    note: 'Great energy today! Finished PortSwigger SSRF lab early.'
  },
  '2026-10-24': {
    checks: { h1: true, h2: false, h3: true, h4: true, h5: false, h6: true, h7: true, h8: false },
    note: 'Weekend deep dive into buffer overflow mechanics.'
  },
  '2026-10-25': {
    checks: { h1: true, h2: true, h3: true, h4: true, h5: true, h6: true, h7: true, h8: true },
    note: 'Flawless 100% execution day. Rested early.'
  },
  '2026-10-26': {
    checks: { h1: true, h2: true, h3: true, h4: false, h5: true, h6: true, h7: false, h8: true },
    note: 'Productive morning. Working on lab continuation tonight.'
  }
};

const INITIAL_REVIEWS = {
  '2026-W43': {
    rating: 5,
    wentWell: 'Completed labs consistently and stayed on track with 4 hrs cybersec daily.',
    interrupted: 'Screen time exceeded on weekend social apps.',
    adjustment: 'Use app timers after 9:30 PM to keep screen time under 4 hours.',
    updatedAt: '2026-10-25'
  }
};

const STORAGE_KEY = 'habit_tracker_master_state_v1';

// Helper Date formatters
const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getIsoWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export default function App() {
  // Primary State
  const [activeTab, setActiveTab] = useState('daily');
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  
  // Date State
  const [selectedDate, setSelectedDate] = useState('2026-10-26');
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [toastMessage, setToastMessage] = useState(null);

  // Load from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.habits && Array.isArray(parsed.habits)) setHabits(parsed.habits);
        if (parsed.logs) setLogs(parsed.logs);
        if (parsed.reviews) setReviews(parsed.reviews);
        if (parsed.settings) setSettings(parsed.settings);
      }
    } catch (e) {
      console.error('Failed to load habit tracker state:', e);
    }
  }, []);

  // Save to LocalStorage on changes
  useEffect(() => {
    try {
      const dataToSave = { habits, logs, reviews, settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
    }
  }, [habits, logs, reviews, settings]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ----------------------------------------
  // Helper calculations
  // ----------------------------------------
  const getDayStats = (dateKey) => {
    const dayLog = logs[dateKey]?.checks || {};
    const totalHabits = habits.length;
    if (totalHabits === 0) return { completed: 0, total: 0, percentage: 0 };
    
    let completed = 0;
    habits.forEach(h => {
      if (dayLog[h.id] === true) completed++;
    });
    const percentage = Math.round((completed / totalHabits) * 100);
    return { completed, total: totalHabits, percentage };
  };

  // Streak calculation for a specific habit
  const habitStreaks = useMemo(() => {
    const streaks = {};
    const today = new Date(selectedDate);

    habits.forEach(habit => {
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;

      // Scan through last 365 days
      const dates = [];
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(formatDateKey(d));
      }

      // Check current streak from selectedDate backwards
      let checkCurrent = true;
      for (const dKey of dates) {
        const checked = logs[dKey]?.checks?.[habit.id];
        if (checked) {
          if (checkCurrent) currentStreak++;
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          checkCurrent = false;
          tempStreak = 0;
        }
      }

      streaks[habit.id] = { current: currentStreak, max: Math.max(maxStreak, currentStreak) };
    });

    return streaks;
  }, [habits, logs, selectedDate]);

  // Monthly summary metrics
  const monthlyMetrics = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    let totalExpectedLogs = 0;
    let totalCompletedLogs = 0;
    let loggedDaysCount = 0;

    const habitMonthlyCounts = {};
    habits.forEach(h => { habitMonthlyCounts[h.id] = 0; });

    for (let day = 1; day <= daysInMonth; day++) {
      const dKey = `${selectedMonth}-${String(day).padStart(2, '0')}`;
      const dayData = logs[dKey];
      if (dayData && dayData.checks) {
        loggedDaysCount++;
        habits.forEach(h => {
          totalExpectedLogs++;
          if (dayData.checks[h.id] === true) {
            totalCompletedLogs++;
            habitMonthlyCounts[h.id] = (habitMonthlyCounts[h.id] || 0) + 1;
          }
        });
      }
    }

    const overallRate = totalExpectedLogs > 0 
      ? Math.round((totalCompletedLogs / totalExpectedLogs) * 100) 
      : 0;

    // Determine best habit and needs-attention habit
    let bestHabit = null;
    let worstHabit = null;
    let highestCount = -1;
    let lowestCount = Infinity;

    habits.forEach(h => {
      const count = habitMonthlyCounts[h.id] || 0;
      if (count > highestCount) {
        highestCount = count;
        bestHabit = h;
      }
      if (count < lowestCount) {
        lowestCount = count;
        worstHabit = h;
      }
    });

    return {
      daysInMonth,
      loggedDaysCount,
      totalCompletedLogs,
      overallRate,
      habitMonthlyCounts,
      bestHabit: highestCount > 0 ? bestHabit : null,
      worstHabit: worstHabit || null
    };
  }, [selectedMonth, habits, logs]);

  // Handlers for habit toggles
  const handleToggleHabit = (habitId) => {
    setLogs(prev => {
      const currentDay = prev[selectedDate] || { checks: {}, note: '' };
      const currentStatus = currentDay.checks?.[habitId];
      const newStatus = !currentStatus;

      return {
        ...prev,
        [selectedDate]: {
          ...currentDay,
          checks: {
            ...currentDay.checks,
            [habitId]: newStatus
          }
        }
      };
    });
  };

  const handleMarkAll = (status) => {
    setLogs(prev => {
      const currentDay = prev[selectedDate] || { checks: {}, note: '' };
      const newChecks = {};
      habits.forEach(h => {
        newChecks[h.id] = status;
      });
      return {
        ...prev,
        [selectedDate]: {
          ...currentDay,
          checks: newChecks
        }
      };
    });
    showToast(status ? 'All habits marked as done!' : 'Cleared all checks for this day.');
  };

  const handleNoteChange = (text) => {
    setLogs(prev => {
      const currentDay = prev[selectedDate] || { checks: {}, note: '' };
      return {
        ...prev,
        [selectedDate]: {
          ...currentDay,
          note: text
        }
      };
    });
  };

  // Date Navigator Controls
  const stepDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateKey(d));
  };

  // Export / Import / Reset handlers
  const handleExportData = () => {
    const payload = {
      app: 'HabitTrackerPro',
      exportedAt: new Date().toISOString(),
      habits,
      logs,
      reviews,
      settings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Habits_Backup_${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!');
  };

  const fileInputRef = useRef(null);
  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.habits && Array.isArray(parsed.habits)) {
          setHabits(parsed.habits);
          if (parsed.logs) setLogs(parsed.logs);
          if (parsed.reviews) setReviews(parsed.reviews);
          if (parsed.settings) setSettings(parsed.settings);
          showToast('Data restored successfully!');
        } else {
          alert('Invalid habit data file format.');
        }
      } catch (err) {
        alert('Failed to parse backup file. Please ensure it is a valid JSON export.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all habits and tracking records back to original sample data? This will overwrite existing logs.')) {
      setHabits(DEFAULT_HABITS);
      setLogs(INITIAL_LOGS);
      setReviews(INITIAL_REVIEWS);
      setSettings(DEFAULT_SETTINGS);
      showToast('Reset to default habit template.');
    }
  };

  // Current Day Quick Summary
  const currentDayStats = getDayStats(selectedDate);
  const isDarkMode = settings.theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-fade-in text-sm font-medium">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col min-h-screen">
        
        {/* Top Header & Brand Bar */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-xl">
              ✓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Daily Routine & Habit Tracker</h1>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Goal: {settings.targetRate}%
                </span>
              </div>
              <p className="text-xs text-slate-400">Offline-first · Zero cloud dependency · 100% persistent in your browser</p>
            </div>
          </div>

          {/* Quick Global Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="Export backup to JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex space-x-2 py-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-sm font-medium">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'daily'
                ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Log</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard & Heatmap</span>
          </button>

          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'weekly'
                ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Weekly Review</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Habits & Settings</span>
          </button>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 py-6">
          
          {/* ==================================================== */}
          {/* TAB 1: DAILY LOG VIEW                                */}
          {/* ==================================================== */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {/* Date Navigation Card */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => stepDate(-1)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Previous day"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 px-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent font-bold text-lg text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
                    />
                    <button
                      onClick={() => setSelectedDate(formatDateKey(new Date()))}
                      className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-medium"
                    >
                      Today
                    </button>
                  </div>

                  <button
                    onClick={() => stepDate(1)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Next day"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Daily Progress summary */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {currentDayStats.completed} of {currentDayStats.total} done ({currentDayStats.percentage}%)
                    </p>
                    <p className="text-xs text-slate-400">
                      Target: {settings.targetRate}% {currentDayStats.percentage >= settings.targetRate ? '✓ Achieved' : '· Needs focus'}
                    </p>
                  </div>
                  
                  <div className="w-16 h-16 relative flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-800" />
                      <circle
                        cx="18"
                        cy="18"
                        r="14"
                        fill="none"
                        stroke={currentDayStats.percentage >= settings.targetRate ? '#10b981' : '#f59e0b'}
                        strokeWidth="3.5"
                        strokeDasharray="88"
                        strokeDashoffset={88 - (88 * currentDayStats.percentage) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <span className="absolute text-xs font-bold">{currentDayStats.percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-medium uppercase tracking-wider">Today's Habits ({habits.length})</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAll(true)}
                    className="hover:text-emerald-500 underline font-medium"
                  >
                    Mark All Completed
                  </button>
                  <span>·</span>
                  <button
                    onClick={() => handleMarkAll(false)}
                    className="hover:text-rose-500 underline font-medium"
                  >
                    Reset Checks
                  </button>
                </div>
              </div>

              {/* Habits Check-in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {habits.map((habit, index) => {
                  const isChecked = !!logs[selectedDate]?.checks?.[habit.id];
                  const streak = habitStreaks[habit.id] || { current: 0, max: 0 };

                  return (
                    <div
                      key={habit.id}
                      onClick={() => handleToggleHabit(habit.id)}
                      className={`group p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 select-none ${
                        isChecked
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-50 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'border-2 border-slate-300 dark:border-slate-700 text-transparent group-hover:border-slate-400'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                            <h3 className={`font-semibold text-base truncate ${isChecked ? 'line-through opacity-80' : ''}`}>
                              {habit.name}
                            </h3>
                          </div>
                          {habit.why && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{habit.why}</p>
                          )}
                        </div>
                      </div>

                      {/* Streak Badge */}
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-300 shrink-0">
                        <Flame className={`w-3.5 h-3.5 ${streak.current > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                        <span>{streak.current}d</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Day Note / Reflection Box */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Daily Reflection & Notes</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Auto-saved for {selectedDate}</span>
                </div>
                <textarea
                  value={logs[selectedDate]?.note || ''}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Record what happened today, thoughts, energy levels, or blockers..."
                  rows={3}
                  className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: DASHBOARD & HEATMAP                           */}
          {/* ==================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Month Selector Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-bold">Performance Analytics</h2>
                  <p className="text-xs text-slate-400">Monthly overview & adherence rate vs {settings.targetRate}% target</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold focus:outline-none cursor-pointer"
                  />
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Metric 1: Monthly Success Rate */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Monthly Rate</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-extrabold">{monthlyMetrics.overallRate}%</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        monthlyMetrics.overallRate >= settings.targetRate
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        Target {settings.targetRate}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metric 2: Today's status */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Today's Done</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-extrabold">{currentDayStats.completed}/{currentDayStats.total}</div>
                    <p className="text-xs text-slate-400 mt-1">{currentDayStats.percentage}% executed today</p>
                  </div>
                </div>

                {/* Metric 3: Top Performer Habit */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Best Habit</span>
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-base font-bold truncate">
                      {monthlyMetrics.bestHabit ? monthlyMetrics.bestHabit.name : 'No data yet'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {monthlyMetrics.bestHabit
                        ? `${monthlyMetrics.habitMonthlyCounts[monthlyMetrics.bestHabit.id]} completions`
                        : 'Log more to rank'}
                    </p>
                  </div>
                </div>

                {/* Metric 4: Needs Focus */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Needs Focus</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-base font-bold truncate">
                      {monthlyMetrics.worstHabit ? monthlyMetrics.worstHabit.name : 'All balanced'}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {monthlyMetrics.worstHabit
                        ? `${monthlyMetrics.habitMonthlyCounts[monthlyMetrics.worstHabit.id] || 0} completions`
                        : 'Great consistency'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Monthly GitHub-Style Contribution Heatmap */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base">Monthly Adherence Grid</h3>
                    <p className="text-xs text-slate-400">Click any day to jump to its daily view</p>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>0%</span>
                    <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 dark:bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-amber-400/40" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500/60" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500" />
                    <span>100%</span>
                  </div>
                </div>

                {/* Heatmap Grid */}
                <div className="grid grid-cols-7 gap-2 pt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells before month starts */}
                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1).getDay();
                    // Shift Sunday from 0 to 7 to match Monday=1
                    const offset = (firstDay === 0 ? 7 : firstDay) - 1;
                    const blanks = [];
                    for (let i = 0; i < offset; i++) {
                      blanks.push(<div key={`blank-${i}`} className="h-12 rounded-xl bg-transparent opacity-0 pointer-events-none" />);
                    }
                    return blanks;
                  })()}

                  {/* Month Days */}
                  {Array.from({ length: monthlyMetrics.daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dKey = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const stats = getDayStats(dKey);
                    const isSelected = selectedDate === dKey;
                    const isToday = formatDateKey(new Date()) === dKey;

                    let bgClass = 'bg-slate-100 dark:bg-slate-800/60 text-slate-400';
                    if (stats.percentage >= 80) bgClass = 'bg-emerald-500 text-white font-bold';
                    else if (stats.percentage >= 50) bgClass = 'bg-emerald-500/50 text-white font-bold';
                    else if (stats.percentage > 0) bgClass = 'bg-amber-400/60 text-slate-900 font-bold';

                    return (
                      <button
                        key={dKey}
                        onClick={() => {
                          setSelectedDate(dKey);
                          setActiveTab('daily');
                        }}
                        className={`h-12 rounded-xl flex flex-col items-center justify-center p-1 relative transition transform hover:scale-105 ${bgClass} ${
                          isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900' : ''
                        }`}
                        title={`${dKey}: ${stats.completed}/${stats.total} habits completed (${stats.percentage}%)`}
                      >
                        <span className="text-xs">{dayNum}</span>
                        {stats.percentage > 0 && (
                          <span className="text-[10px] opacity-90">{stats.percentage}%</span>
                        )}
                        {isToday && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white dark:border-slate-900" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Trend Breakdown (W1-W5) */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-base">Weekly Breakdown (W1 – W5)</h3>
                
                <div className="space-y-3">
                  {[
                    { label: 'Week 1 (Days 1–7)', start: 1, end: 7 },
                    { label: 'Week 2 (Days 8–14)', start: 8, end: 14 },
                    { label: 'Week 3 (Days 15–21)', start: 15, end: 21 },
                    { label: 'Week 4 (Days 22–28)', start: 22, end: 28 },
                    { label: `Week 5 (Days 29–${monthlyMetrics.daysInMonth})`, start: 29, end: monthlyMetrics.daysInMonth }
                  ].map(w => {
                    let totalExp = 0;
                    let totalDone = 0;
                    for (let d = w.start; d <= Math.min(w.end, monthlyMetrics.daysInMonth); d++) {
                      const dKey = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const checkData = logs[dKey]?.checks;
                      if (checkData) {
                        habits.forEach(h => {
                          totalExp++;
                          if (checkData[h.id] === true) totalDone++;
                        });
                      }
                    }
                    const weekRate = totalExp > 0 ? Math.round((totalDone / totalExp) * 100) : 0;

                    return (
                      <div key={w.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span>{w.label}</span>
                          <span className={weekRate >= settings.targetRate ? 'text-emerald-500' : 'text-slate-400'}>
                            {weekRate}% ({totalDone} / {totalExp})
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              weekRate >= settings.targetRate ? 'bg-emerald-500' : 'bg-amber-400'
                            }`}
                            style={{ width: `${weekRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Habit Details Adherence Table */}
              <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                <h3 className="font-bold text-base mb-4">Habit Performance Table</h3>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-semibold uppercase text-slate-400">
                      <th className="pb-3">Habit</th>
                      <th className="pb-3 text-center">Category</th>
                      <th className="pb-3 text-center">Month Success</th>
                      <th className="pb-3 text-center">Streak</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {habits.map(h => {
                      const count = monthlyMetrics.habitMonthlyCounts[h.id] || 0;
                      const rate = monthlyMetrics.loggedDaysCount > 0
                        ? Math.round((count / monthlyMetrics.loggedDaysCount) * 100)
                        : 0;
                      const streak = habitStreaks[h.id] || { current: 0, max: 0 };
                      const onTrack = rate >= settings.targetRate;

                      return (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-3 pr-2">
                            <span className="font-semibold block">{h.name}</span>
                            <span className="text-xs text-slate-400">{h.why}</span>
                          </td>
                          <td className="py-3 text-center text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {h.category || 'General'}
                            </span>
                          </td>
                          <td className="py-3 text-center">
                            <span className="font-bold">{rate}%</span>
                            <span className="text-xs text-slate-400 block">({count} days)</span>
                          </td>
                          <td className="py-3 text-center text-xs">
                            <span className="text-amber-500 font-bold">{streak.current}d</span>
                            <span className="text-slate-400 block">Best: {streak.max}d</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                              onTrack ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                            }`}>
                              {onTrack ? 'On Track' : 'Needs Focus'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: WEEKLY REVIEW                                 */}
          {/* ==================================================== */}
          {activeTab === 'weekly' && (
            <div className="space-y-6">
              {(() => {
                const currentWeekKey = getIsoWeekKey(new Date(selectedDate));
                const currentReview = reviews[currentWeekKey] || {
                  rating: 5,
                  wentWell: '',
                  interrupted: '',
                  adjustment: ''
                };

                const updateReviewField = (field, val) => {
                  setReviews(prev => ({
                    ...prev,
                    [currentWeekKey]: {
                      ...prev[currentWeekKey],
                      [field]: val,
                      updatedAt: formatDateKey(new Date())
                    }
                  }));
                };

                return (
                  <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                      <div>
                        <h2 className="text-lg font-bold">Weekly Retrospective: {currentWeekKey}</h2>
                        <p className="text-xs text-slate-400">Directly modeled after your weekly Excel check-in page</p>
                      </div>
                      
                      {/* 1 to 5 Star Rating */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Weekly Score:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button
                              key={star}
                              onClick={() => updateReviewField('rating', star)}
                              className="p-1 hover:scale-110 transition"
                            >
                              <Star
                                className={`w-5 h-5 ${
                                  star <= (currentReview.rating || 0)
                                    ? 'text-amber-400 fill-amber-400'
                                    : 'text-slate-300 dark:text-slate-700'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reflection Prompts matching habit.xlsx */}
                    <div className="space-y-4">
                      
                      {/* Prompt 1 */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>1. What went well this week?</span>
                        </label>
                        <textarea
                          rows={3}
                          value={currentReview.wentWell || ''}
                          onChange={(e) => updateReviewField('wentWell', e.target.value)}
                          placeholder="Consistent labs, waking up before 9 AM, completed dropshipping milestone..."
                          className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      {/* Prompt 2 */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span>2. What interrupted or derailed my routine?</span>
                        </label>
                        <textarea
                          rows={3}
                          value={currentReview.interrupted || ''}
                          onChange={(e) => updateReviewField('interrupted', e.target.value)}
                          placeholder="Late night phone scrolling, unexpected travel, distraction during work hours..."
                          className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      {/* Prompt 3 */}
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span>3. One concrete adjustment for next week:</span>
                        </label>
                        <textarea
                          rows={2}
                          value={currentReview.adjustment || ''}
                          onChange={(e) => updateReviewField('adjustment', e.target.value)}
                          placeholder="Set app limit to 3.5 hrs, prep cybersec lab material the night before..."
                          className="w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => showToast('Weekly review recorded.')}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Review</span>
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Past Reviews History */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-base">Past Retrospective Logs</h3>
                {Object.keys(reviews).length === 0 ? (
                  <p className="text-xs text-slate-400">No past reviews logged yet.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(reviews).map(([wKey, rev]) => (
                      <div key={wKey} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700 dark:text-slate-200">{wKey}</span>
                          <span className="text-amber-500 font-semibold">{'★'.repeat(rev.rating || 0)}</span>
                        </div>
                        {rev.wentWell && <p className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-emerald-500">Went well:</strong> {rev.wentWell}</p>}
                        {rev.interrupted && <p className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-amber-500">Interrupted:</strong> {rev.interrupted}</p>}
                        {rev.adjustment && <p className="text-xs text-slate-600 dark:text-slate-300"><strong className="text-blue-500">Adjustment:</strong> {rev.adjustment}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: SETTINGS & HABIT CONFIGURATION                */}
          {/* ==================================================== */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              
              {/* Overall Configuration */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h2 className="text-lg font-bold">Tracker Target Settings</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase">Target Success Rate (%)</label>
                    <div className="flex items-center gap-3 mt-1.5">
                      <input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={settings.targetRate}
                        onChange={(e) => setSettings(s => ({ ...s, targetRate: Number(e.target.value) }))}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                      <span className="font-bold text-lg min-w-10 text-emerald-500">{settings.targetRate}%</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Default is 70% matching your spreadsheet standard.</p>
                  </div>
                </div>
              </div>

              {/* Manage Habits List */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base font-bold">Configured Habits ({habits.length})</h3>
                    <p className="text-xs text-slate-400">Add, rename, or delete habits without breaking existing logs</p>
                  </div>
                  <button
                    onClick={() => {
                      const name = prompt('Enter new habit name:');
                      if (name && name.trim()) {
                        const why = prompt('Why does this habit matter?') || '';
                        const newHabit = {
                          id: `h_${Date.now()}`,
                          name: name.trim(),
                          why: why.trim(),
                          category: 'Custom'
                        };
                        setHabits(prev => [...prev, newHabit]);
                        showToast(`Added habit: ${name.trim()}`);
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Habit</span>
                  </button>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {habits.map((habit, idx) => (
                    <div key={habit.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-semibold text-sm truncate">{habit.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                            {habit.category || 'General'}
                          </span>
                        </div>
                        {habit.why && <p className="text-xs text-slate-400 mt-0.5">{habit.why}</p>}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            const newName = prompt('Update habit name:', habit.name);
                            if (newName && newName.trim()) {
                              const newWhy = prompt('Update why/reason:', habit.why || '') || '';
                              setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, name: newName.trim(), why: newWhy.trim() } : h));
                              showToast('Habit updated.');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                          title="Edit habit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (habits.length <= 1) {
                              alert('You must have at least one active habit.');
                              return;
                            }
                            if (window.confirm(`Delete "${habit.name}"?`)) {
                              setHabits(prev => prev.filter(h => h.id !== habit.id));
                              showToast('Habit removed.');
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                          title="Delete habit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data & Backup Center */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-base font-bold">Data & Persistence Management</h3>
                <p className="text-xs text-slate-400">
                  All habit data is saved instantly to your device's LocalStorage. You can export a full JSON backup to sync with another phone or laptop.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Download JSON Backup</span>
                  </button>

                  <button
                    onClick={handleResetToDefaults}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset to Template Defaults</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>

        {/* Footer */}
        <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
          Habit & Routine Tracker · Built for high consistency & offline freedom
        </footer>

      </div>
    </div>
  );
}