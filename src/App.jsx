import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  CheckCircle2,
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
  Target,
  ArrowUp,
  ArrowDown,
  Cloud,
  CloudOff,
  LogOut,
  Lightbulb,
  Lock
} from 'lucide-react';

// ==========================================
// CLOUD SYNC CONFIG (Supabase)
// Put these in a .env file in your project root:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
// Without them the app runs fully offline (localStorage only).
// ==========================================
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ==========================================
// DEFAULT DATA FROM habit.xlsx
// type: 'check' = yes/no tick, 'number' = enter a value and compare to a goal
// op:   'gte' at least, 'lte' at most, 'between' min..max
// ==========================================
const DEFAULT_HABITS = [
  { id: 'h1', name: 'Wake up by 9:00', why: 'Protects the quiet morning hours', category: 'Health', type: 'check' },
  { id: 'h2', name: 'Sleep for 6-7 hrs', why: 'Recovery & physical wellness', category: 'Health', type: 'check' },
  { id: 'h3', name: 'Read 5 pages', why: 'Keep learning & compounding knowledge', category: 'Personal', type: 'number', unit: 'pages', op: 'gte', goal: 5 },
  { id: 'h4', name: 'Screen time less than 4', why: 'Focus & eye health', category: 'Productivity', type: 'number', unit: 'hrs', op: 'lte', goal: 4 },
  { id: 'h5', name: 'Dropshipping 2 task', why: 'Business growth & execution', category: 'Business', type: 'check' },
  { id: 'h6', name: 'Cybersec 4 hrs', why: 'Work on core technical skill', category: 'Skill', type: 'check' },
  { id: 'h7', name: 'complete a lab in any site', why: 'Hands-on practice & applied learning', category: 'Skill', type: 'check' },
  { id: 'h8', name: 'Other activity', why: 'Any other fitness or outdoor activity', category: 'Lifestyle', type: 'check' }
];
const DEFAULT_BY_ID = Object.fromEntries(DEFAULT_HABITS.map(h => [h.id, h]));

const DEFAULT_SETTINGS = {
  targetRate: 70,
  theme: 'dark',
  userName: 'Achiever'
};

// Seed sample log entries for late October 2026 so the app is populated out-of-the-box
const INITIAL_LOGS = {
  '2026-10-23': {
    checks: { h1: true, h2: true, h5: true, h6: true, h7: true, h8: true },
    values: { h3: 5, h4: 4.5 },
    note: 'Great energy today! Finished PortSwigger SSRF lab early.'
  },
  '2026-10-24': {
    checks: { h1: true, h2: false, h5: false, h6: true, h7: true, h8: false },
    values: { h3: 5, h4: 3.5 },
    note: 'Weekend deep dive into buffer overflow mechanics.'
  },
  '2026-10-25': {
    checks: { h1: true, h2: true, h5: true, h6: true, h7: true, h8: true },
    values: { h3: 6, h4: 3 },
    note: 'Flawless 100% execution day. Rested early.'
  },
  '2026-10-26': {
    checks: { h1: true, h2: true, h5: true, h6: true, h7: false, h8: true },
    values: { h3: 5, h4: 4.5 },
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
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

// ==========================================
// DATE HELPERS
// ==========================================
const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse a 'YYYY-MM-DD' key as a LOCAL date. `new Date('2026-10-26')` is parsed
// as UTC midnight, which shifts to the previous day in US timezones.
const parseDateKey = (key) => {
  const [y, m, d] = String(key || '').split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return isNaN(dt.getTime()) ? new Date() : dt;
};

const todayKey = () => formatDateKey(new Date());

const getIsoWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

// The seven date keys (Mon..Sun) of an ISO week key like '2026-W43'
const weekDates = (weekKey) => {
  const [y, w] = weekKey.split('-W').map(Number);
  const jan4 = new Date(y, 0, 4);
  const dow = (jan4.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(y, 0, 4 - dow + (w - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDateKey(d);
  });
};

// ==========================================
// HABIT / LOG HELPERS
// ==========================================
const normalizeHabit = (h) => ({ type: 'check', ...(DEFAULT_BY_ID[h.id] || {}), ...h, id: String(h.id) });

const numericTarget = (h) => (h.op === 'between' ? h.min : h.goal);

// Basic validation for habits coming from an imported backup file
const isValidHabit = (h) =>
  !!h && (typeof h.id === 'string' || typeof h.id === 'number') &&
  typeof h.name === 'string' && h.name.trim().length > 0;

// Did this habit count as done on a given day's log?
const isDone = (habit, day) => {
  if (!day) return false;
  if (habit.type !== 'number') return day.checks?.[habit.id] === true;
  const raw = day.values?.[habit.id];
  if (raw === undefined || raw === null || raw === '') return false;
  const n = Number(raw);
  if (Number.isNaN(n)) return false;
  if (habit.op === 'lte') return n <= habit.goal;
  if (habit.op === 'between') return n >= habit.min && n <= habit.max;
  return n >= habit.goal;
};

const hasEntries = (day) =>
  !!day && (Object.keys(day.checks || {}).length > 0 || Object.keys(day.values || {}).length > 0);

const goalLabel = (h) => {
  if (h.type !== 'number') return 'Yes / No';
  const u = h.unit ? ` ${h.unit}` : '';
  if (h.op === 'lte') return `at most ${h.goal}${u}`;
  if (h.op === 'between') return `${h.min}–${h.max}${u}`;
  return `at least ${h.goal}${u}`;
};

// Upgrade data saved by the first version (numeric habits used checkboxes)
const migrateLogs = (logs, habits) => {
  const out = {};
  Object.entries(logs || {}).forEach(([k, day]) => {
    const d = {
      checks: { ...(day?.checks || {}) },
      values: { ...(day?.values || {}) },
      note: day?.note || ''
    };
    habits.forEach(h => {
      if (h.type !== 'number') return;
      if (d.values[h.id] === undefined && d.checks[h.id] === true) {
        d.values[h.id] = numericTarget(h);
      }
      delete d.checks[h.id];
    });
    out[k] = d;
  });
  return out;
};

const TREND_DAYS = 30;

function TrackerApp({ onLock }) {
  // Primary State
  const [activeTab, setActiveTab] = useState('daily');
  const [habits, setHabits] = useState(DEFAULT_HABITS);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [reviews, setReviews] = useState(INITIAL_REVIEWS);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  // Date State (defaults to today)
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedMonth, setSelectedMonth] = useState(() => todayKey().slice(0, 7));
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimer = useRef(null);

  // Habit editor state (settings tab)
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Persistence / sync state
  const [hydrated, setHydrated] = useState(false);
  const updatedAtRef = useRef(null);       // timestamp of the last real user change
  const remoteApplying = useRef(false);    // true = the next save came from loading, don't re-stamp
  const latest = useRef({});
  latest.current = { habits, logs, reviews, settings };

  const [session, setSession] = useState(null);
  const [syncStatus, setSyncStatus] = useState(supabase ? 'signed-out' : 'not-configured');
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSynced, setLastSynced] = useState(null);
  const [emailInput, setEmailInput] = useState('');
  const userRef = useRef(null);
  const pushTimer = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMessage(null), 3000);
  };

  // Apply a saved/remote data blob to state
  const applyData = (d) => {
    remoteApplying.current = true;
    const list = Array.isArray(d.habits) && d.habits.length ? d.habits.filter(isValidHabit).map(normalizeHabit) : DEFAULT_HABITS;
    const hs = list.length ? list : DEFAULT_HABITS;
    setHabits(hs);
    setLogs(migrateLogs(d.logs || {}, hs));
    setReviews(d.reviews && typeof d.reviews === 'object' ? d.reviews : INITIAL_REVIEWS);
    setSettings({ ...DEFAULT_SETTINGS, ...(d.settings || {}) });
    updatedAtRef.current = d.updatedAt || null;
  };

  // Load from LocalStorage on mount
  useEffect(() => {
    remoteApplying.current = true;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) applyData(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load habit tracker state:', e);
    }
    setHydrated(true);
  }, []);

  // Save to LocalStorage on every change, and push to the cloud when signed in
  useEffect(() => {
    if (!hydrated) return;
    if (!remoteApplying.current) updatedAtRef.current = new Date().toISOString();
    remoteApplying.current = false;

    const blob = { habits, logs, reviews, settings, updatedAt: updatedAtRef.current };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(blob));
    } catch (e) {
      console.error('Failed to persist to localStorage:', e);
      showToast('Could not save to browser storage. Use Backup to keep a copy.');
    }

    if (supabase && userRef.current) {
      clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(() => pushToCloud(userRef.current.id, blob), 1500);
    }
  }, [hydrated, habits, logs, reviews, settings]);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    clearTimeout(pushTimer.current);
  }, []);

  // ----------------------------------------
  // Cloud sync (Supabase)
  // ----------------------------------------
  const pushToCloud = async (userId, blob) => {
    setSyncStatus('syncing');
    try {
      const { error } = await supabase
        .from('habit_state')
        .upsert({ user_id: userId, data: blob, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSyncStatus('synced');
      setLastSynced(new Date());
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Upload failed');
    }
  };

  // Pull the cloud copy if it is newer than this device's copy, otherwise upload this device's copy
  const syncFromCloud = async (user) => {
    if (!supabase || !user) return;
    setSyncStatus('syncing');
    setSyncMessage('');
    try {
      const { data: row, error } = await supabase
        .from('habit_state')
        .select('data')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;

      const remote = row?.data;
      const localStamp = updatedAtRef.current || '';
      if (remote && (remote.updatedAt || '') > localStamp) {
        applyData(remote);
        setSyncMessage('Loaded newer data from the cloud.');
        setLastSynced(new Date());
        setSyncStatus('synced');
      } else {
        const blob = { ...latest.current, updatedAt: updatedAtRef.current || new Date().toISOString() };
        updatedAtRef.current = blob.updatedAt;
        await pushToCloud(user.id, blob);
      }
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Sync failed');
    }
  };

  // Keep the session in sync with Supabase auth
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // When signed in (and local data is loaded), sync once
  useEffect(() => {
    if (!supabase || !hydrated) return;
    if (session?.user) {
      userRef.current = session.user;
      syncFromCloud(session.user);
    } else {
      userRef.current = null;
      setSyncStatus('signed-out');
    }
  }, [session?.user?.id, hydrated]);

  const sendMagicLink = async (e) => {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) return;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname }
    });
    if (error) showToast(error.message);
    else showToast('Check your email for the sign-in link.');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    showToast('Signed out. Data stays on this device.');
  };

  // ----------------------------------------
  // Derived data
  // ----------------------------------------
  const getDayStats = (dateKey) => {
    const day = logs[dateKey];
    const total = habits.length;
    if (total === 0) return { completed: 0, total: 0, percentage: 0 };
    const completed = habits.filter(h => isDone(h, day)).length;
    return { completed, total, percentage: Math.round((completed / total) * 100) };
  };

  // Streak per habit, counted back from the selected date (up to 1500 days)
  const habitStreaks = useMemo(() => {
    const streaks = {};
    const today = parseDateKey(selectedDate);
    const dates = [];
    for (let i = 0; i < 1500; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dates.push(formatDateKey(d));
    }

    habits.forEach(habit => {
      let currentStreak = 0;
      let maxStreak = 0;
      let tempStreak = 0;
      let counting = true;

      for (let i = 0; i < dates.length; i++) {
        if (isDone(habit, logs[dates[i]])) {
          if (counting) currentStreak++;
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
        } else {
          tempStreak = 0;
          // A miss on the newest day (not done yet) does not break the streak.
          if (i > 0) counting = false;
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
      if (hasEntries(dayData)) {
        loggedDaysCount++;
        habits.forEach(h => {
          totalExpectedLogs++;
          if (isDone(h, dayData)) {
            totalCompletedLogs++;
            habitMonthlyCounts[h.id] = (habitMonthlyCounts[h.id] || 0) + 1;
          }
        });
      }
    }

    const overallRate = totalExpectedLogs > 0 ? Math.round((totalCompletedLogs / totalExpectedLogs) * 100) : 0;

    let bestHabit = null;
    let worstHabit = null;
    let highestCount = -1;
    let lowestCount = Infinity;
    habits.forEach(h => {
      const count = habitMonthlyCounts[h.id] || 0;
      if (count > highestCount) { highestCount = count; bestHabit = h; }
      if (count < lowestCount) { lowestCount = count; worstHabit = h; }
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

  // Last 30 days, for the trend line
  const trend = useMemo(() => {
    const end = parseDateKey(selectedDate);
    const pts = [];
    for (let i = TREND_DAYS - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const key = formatDateKey(d);
      pts.push({ key, logged: hasEntries(logs[key]), pct: getDayStats(key).percentage });
    }
    return pts;
  }, [logs, habits, selectedDate]);

  // Average completion by weekday (Mon..Sun), over all logged days
  const weekdayRates = useMemo(() => {
    const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const buckets = names.map(() => ({ done: 0, exp: 0 }));
    Object.keys(logs).forEach(k => {
      if (!hasEntries(logs[k])) return;
      const idx = (parseDateKey(k).getDay() + 6) % 7;
      habits.forEach(h => {
        buckets[idx].exp++;
        if (isDone(h, logs[k])) buckets[idx].done++;
      });
    });
    return names.map((name, i) => ({
      name,
      rate: buckets[i].exp ? Math.round((buckets[i].done / buckets[i].exp) * 100) : 0
    }));
  }, [logs, habits]);

  // Habit pairs where doing A goes with doing B noticeably more often
  const correlations = useMemo(() => {
    const days = Object.keys(logs).filter(k => hasEntries(logs[k]));
    const out = [];
    habits.forEach(a => habits.forEach(b => {
      if (a.id === b.id) return;
      let nA = 0, bWhenA = 0, nNot = 0, bWhenNot = 0;
      days.forEach(k => {
        const bDone = isDone(b, logs[k]);
        if (isDone(a, logs[k])) { nA++; if (bDone) bWhenA++; }
        else { nNot++; if (bDone) bWhenNot++; }
      });
      if (nA < 5 || nNot < 3) return;
      const pA = bWhenA / nA;
      const pNot = bWhenNot / nNot;
      if (pA - pNot >= 0.2) {
        out.push({ a: a.name, b: b.name, pA: Math.round(pA * 100), pNot: Math.round(pNot * 100), n: nA });
      }
    }));
    return out.sort((x, y) => (y.pA - y.pNot) - (x.pA - x.pNot)).slice(0, 3);
  }, [logs, habits]);

  // Auto summary for one ISO week
  const weekSummary = (weekKey) => {
    const keys = weekDates(weekKey).filter(k => hasEntries(logs[k]));
    let done = 0;
    let exp = 0;
    const perHabit = habits.map(h => ({ name: h.name, d: 0 }));
    keys.forEach(k => habits.forEach((h, idx) => {
      exp++;
      if (isDone(h, logs[k])) { done++; perHabit[idx].d++; }
    }));
    const ranked = perHabit
      .map(p => ({ name: p.name, rate: keys.length ? Math.round((p.d / keys.length) * 100) : 0 }))
      .sort((a, b) => b.rate - a.rate);
    return {
      days: keys.length,
      rate: exp ? Math.round((done / exp) * 100) : 0,
      best: ranked[0],
      worst: ranked[ranked.length - 1]
    };
  };

  // ----------------------------------------
  // Handlers
  // ----------------------------------------
  const handleToggleHabit = (habitId) => {
    setLogs(prev => {
      const cur = prev[selectedDate] || { checks: {}, values: {}, note: '' };
      return {
        ...prev,
        [selectedDate]: { ...cur, checks: { ...(cur.checks || {}), [habitId]: !cur.checks?.[habitId] } }
      };
    });
  };

  const setHabitValue = (habitId, raw) => {
    setLogs(prev => {
      const cur = prev[selectedDate] || { checks: {}, values: {}, note: '' };
      const values = { ...(cur.values || {}) };
      if (raw === '' || raw === null || raw === undefined) delete values[habitId];
      else values[habitId] = raw;
      return { ...prev, [selectedDate]: { ...cur, values } };
    });
  };

  const handleMarkAll = (status) => {
    setLogs(prev => {
      const cur = prev[selectedDate] || { checks: {}, values: {}, note: '' };
      const checks = { ...(cur.checks || {}) };
      habits.forEach(h => { if (h.type !== 'number') checks[h.id] = status; });
      return { ...prev, [selectedDate]: { ...cur, checks } };
    });
    showToast(status ? 'All yes/no habits marked as done!' : 'Cleared checks for this day.');
  };

  const handleResetDay = () => {
    if (!window.confirm(`Clear all checks and values for ${selectedDate}? Your note is kept.`)) return;
    setLogs(prev => {
      const cur = prev[selectedDate] || { checks: {}, values: {}, note: '' };
      return { ...prev, [selectedDate]: { ...cur, checks: {}, values: {} } };
    });
    showToast('Day cleared.');
  };

  const handleNoteChange = (text) => {
    setLogs(prev => {
      const cur = prev[selectedDate] || { checks: {}, values: {}, note: '' };
      return { ...prev, [selectedDate]: { ...cur, note: text } };
    });
  };

  const stepDate = (days) => {
    const d = parseDateKey(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateKey(d));
  };

  // Keyboard shortcuts on the Daily Log: ← → change day, T = today, 1–9 toggle yes/no habits
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (activeTab !== 'daily') return;
      if (e.key === 'ArrowLeft') stepDate(-1);
      else if (e.key === 'ArrowRight') stepDate(1);
      else if (e.key.toLowerCase() === 't') setSelectedDate(todayKey());
      else if (/^[1-9]$/.test(e.key)) {
        const h = habits[Number(e.key) - 1];
        if (h && h.type !== 'number') handleToggleHabit(h.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeTab, habits, selectedDate]);

  // Habit management
  const addHabit = (habit) => {
    setHabits(prev => [...prev, habit]);
    setShowAddForm(false);
    showToast(`Added habit: ${habit.name}`);
  };

  const updateHabit = (habit) => {
    setHabits(prev => prev.map(h => (h.id === habit.id ? { ...h, ...habit } : h)));
    setEditingId(null);
    showToast('Habit updated.');
  };

  const deleteHabit = (habit) => {
    if (habits.length <= 1) {
      alert('You must have at least one active habit.');
      return;
    }
    if (window.confirm(`Delete "${habit.name}"? Past logs for it are kept.`)) {
      setHabits(prev => prev.filter(h => h.id !== habit.id));
      showToast('Habit removed.');
    }
  };

  const moveHabit = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= habits.length) return;
    setHabits(prev => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
    document.body.appendChild(a); // Firefox needs the link in the DOM to download
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Data exported successfully!');
  };

  const handleImportData = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed && Array.isArray(parsed.habits) && parsed.habits.length > 0 && parsed.habits.every(isValidHabit)) {
          applyData({
            habits: parsed.habits,
            logs: parsed.logs,
            reviews: parsed.reviews,
            settings: parsed.settings,
            updatedAt: new Date().toISOString()
          });
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
    if (window.confirm('Reset all habits and tracking records back to the original sample data? This will overwrite existing logs.')) {
      applyData({ habits: DEFAULT_HABITS, logs: INITIAL_LOGS, reviews: INITIAL_REVIEWS, settings: DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });
      showToast('Reset to default habit template.');
    }
  };

  // ----------------------------------------
  // Render helpers
  // ----------------------------------------
  const currentDayStats = getDayStats(selectedDate);
  const todayStats = getDayStats(todayKey());
  const isDarkMode = settings.theme === 'dark';
  const currentWeekKey = getIsoWeekKey(parseDateKey(selectedDate));

  const syncLabel = {
    'not-configured': 'Off',
    'signed-out': 'Signed out',
    syncing: 'Syncing…',
    synced: lastSynced ? `Synced ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Synced',
    error: 'Sync error'
  }[syncStatus];

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100';
  const cardCls = 'p-5 md:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm';

  return (
    // The `dark` class makes dark: variants follow the in-app toggle instead of the OS setting.
    // Tailwind needs darkMode: 'class' configured for this to work.
    <div className={`min-h-screen transition-colors duration-200 ${isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>

      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl text-sm font-medium max-w-[calc(100vw-3rem)]">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 flex flex-col min-h-screen">

        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 font-black text-xl">
              ✓
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">Daily Routine & Habit Tracker</h1>
                <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                  Goal: {settings.targetRate}%
                </span>
              </div>
              <p className="text-xs text-slate-400">Offline-first · {session ? 'Synced to cloud' : 'Saved in your browser'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}
              className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition ${FOCUS_RING}`}
              title="Toggle theme"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {onLock && (
              <button
                onClick={onLock}
                className={`p-2 rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition ${FOCUS_RING}`}
                title="Lock app"
                aria-label="Lock app"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleExportData}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition ${FOCUS_RING}`}
              title="Export backup to JSON file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup</span>
            </button>

            <label className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer ${FOCUS_RING}`}>
              <Upload className="w-3.5 h-3.5" />
              <span>Restore</span>
              <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
            </label>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="flex space-x-2 py-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-sm font-medium">
          {[
            { id: 'daily', label: 'Daily Log', Icon: Calendar },
            { id: 'dashboard', label: 'Dashboard & Heatmap', Icon: BarChart3 },
            { id: 'weekly', label: 'Weekly Review', Icon: BookOpen },
            { id: 'settings', label: 'Habits & Settings', Icon: Settings }
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${FOCUS_RING} ${
                activeTab === id
                  ? 'bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 py-6">

          {/* ==================================================== */}
          {/* TAB 1: DAILY LOG VIEW                                */}
          {/* ==================================================== */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {/* Date Navigation Card */}
              <div className={`${cardCls} flex flex-col md:flex-row items-center justify-between gap-4`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => stepDate(-1)} className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 ${FOCUS_RING}`} title="Previous day" aria-label="Previous day">
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2 px-2">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => { if (e.target.value) setSelectedDate(e.target.value); }}
                      className={`bg-transparent font-bold text-lg text-slate-800 dark:text-slate-100 cursor-pointer ${FOCUS_RING}`}
                    />
                    <button onClick={() => setSelectedDate(todayKey())} className={`text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 font-medium ${FOCUS_RING}`}>
                      Today
                    </button>
                  </div>

                  <button onClick={() => stepDate(1)} className={`p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 ${FOCUS_RING}`} title="Next day" aria-label="Next day">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {currentDayStats.completed} of {currentDayStats.total} done ({currentDayStats.percentage}%)
                    </p>
                    <p className="text-xs text-slate-400">
                      Target: {settings.targetRate}% {currentDayStats.percentage >= settings.targetRate ? '✓ Achieved' : '· Needs focus'}
                    </p>
                  </div>

                  <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-slate-200 dark:text-slate-800" />
                      <circle
                        cx="18" cy="18" r="14" fill="none"
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
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span className="font-medium uppercase tracking-wider">Today's Habits ({habits.length})</span>
                <div className="flex gap-2">
                  <button onClick={() => handleMarkAll(true)} className={`hover:text-emerald-500 underline font-medium rounded ${FOCUS_RING}`}>Mark All Yes/No Done</button>
                  <span>·</span>
                  <button onClick={handleResetDay} className={`hover:text-rose-500 underline font-medium rounded ${FOCUS_RING}`}>Clear Day</button>
                </div>
              </div>

              {/* Habits Check-in Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {habits.map((habit, index) => {
                  const day = logs[selectedDate];
                  const isNum = habit.type === 'number';
                  const done = isDone(habit, day);
                  const streak = habitStreaks[habit.id] || { current: 0, max: 0 };
                  const rawValue = day?.values?.[habit.id] ?? '';

                  return (
                    <div
                      key={habit.id}
                      role={isNum ? undefined : 'checkbox'}
                      aria-checked={isNum ? undefined : done}
                      tabIndex={isNum ? undefined : 0}
                      onClick={isNum ? undefined : () => handleToggleHabit(habit.id)}
                      onKeyDown={isNum ? undefined : (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleToggleHabit(habit.id);
                        }
                      }}
                      className={`group p-4 rounded-2xl border transition-all duration-150 flex items-center justify-between gap-4 select-none ${FOCUS_RING} ${isNum ? '' : 'cursor-pointer'} ${
                        done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-50 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div
                          className={`mt-0.5 w-6 h-6 shrink-0 rounded-lg flex items-center justify-center transition-all ${
                            done
                              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'border-2 border-slate-300 dark:border-slate-700 text-transparent group-hover:border-slate-400'
                          }`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                            <h3 className={`font-semibold text-base truncate ${done ? 'line-through opacity-80' : ''}`}>{habit.name}</h3>
                          </div>
                          {habit.why && <p className="text-xs text-slate-400 mt-0.5 truncate">{habit.why}</p>}
                          {isNum && <p className="text-[11px] text-slate-400 mt-0.5">Goal: {goalLabel(habit)}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isNum && (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min="0"
                              value={rawValue}
                              onChange={(e) => setHabitValue(habit.id, e.target.value)}
                              placeholder="0"
                              aria-label={`${habit.name} value`}
                              className={`w-20 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm text-right font-semibold ${FOCUS_RING}`}
                            />
                            <span className="text-xs text-slate-400 w-12 truncate">{habit.unit}</span>
                          </div>
                        )}

                        {/* Streak Badge */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-500 dark:text-slate-300">
                          <Flame className={`w-3.5 h-3.5 ${streak.current > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                          <span>{streak.current}d</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400 text-center">Shortcuts: ← → change day · T today · 1–9 toggle yes/no habits</p>

              {/* Day Note / Reflection Box */}
              <div className={`${cardCls} space-y-2`}>
                <div className="flex items-center justify-between">
                  <label htmlFor="day-note" className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Daily Reflection & Notes</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Auto-saved for {selectedDate}</span>
                </div>
                <textarea
                  id="day-note"
                  value={logs[selectedDate]?.note || ''}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  placeholder="Record what happened today, thoughts, energy levels, or blockers..."
                  rows={3}
                  className={`${inputCls} placeholder:text-slate-400`}
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
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => { if (e.target.value) setSelectedMonth(e.target.value); }}
                  className={`px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-semibold cursor-pointer ${FOCUS_RING}`}
                />
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Monthly Rate</span>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-extrabold">{monthlyMetrics.overallRate}%</div>
                    <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      monthlyMetrics.overallRate >= settings.targetRate ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      Target {settings.targetRate}%
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Today's Done</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl md:text-3xl font-extrabold">{todayStats.completed}/{todayStats.total}</div>
                    <p className="text-xs text-slate-400 mt-1">{todayStats.percentage}% executed today</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Best Habit</span>
                    <Award className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-base font-bold truncate">{monthlyMetrics.bestHabit ? monthlyMetrics.bestHabit.name : 'No data yet'}</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {monthlyMetrics.bestHabit ? `${monthlyMetrics.habitMonthlyCounts[monthlyMetrics.bestHabit.id]} completions` : 'Log more to rank'}
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-medium">Needs Focus</span>
                    <AlertTriangle className="w-4 h-4 text-rose-500" />
                  </div>
                  <div className="mt-3">
                    <div className="text-base font-bold truncate">{monthlyMetrics.worstHabit ? monthlyMetrics.worstHabit.name : 'All balanced'}</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {monthlyMetrics.worstHabit ? `${monthlyMetrics.habitMonthlyCounts[monthlyMetrics.worstHabit.id] || 0} completions` : 'Great consistency'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Insights: trend, weekday pattern, correlations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`${cardCls} space-y-3`}>
                  <div>
                    <h3 className="font-bold text-base">Last 30 Days</h3>
                    <p className="text-xs text-slate-400">Daily completion. Dashed line = your {settings.targetRate}% target.</p>
                  </div>
                  {trend.filter(p => p.logged).length < 2 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">Log at least two days to see a trend.</p>
                  ) : (
                    <svg viewBox="0 0 300 100" className="w-full h-32 overflow-visible" role="img" aria-label="30-day completion trend">
                      <line x1="0" x2="300" y1={100 - settings.targetRate} y2={100 - settings.targetRate} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1" />
                      <polyline
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        points={trend.map((p, i) => ({ p, i })).filter(x => x.p.logged)
                          .map(x => `${(x.i / (TREND_DAYS - 1)) * 300},${100 - x.p.pct}`).join(' ')}
                      />
                      {trend.map((p, i) => p.logged && (
                        <circle key={p.key} cx={(i / (TREND_DAYS - 1)) * 300} cy={100 - p.pct} r="2.5" fill="#10b981">
                          <title>{`${p.key}: ${p.pct}%`}</title>
                        </circle>
                      ))}
                    </svg>
                  )}
                </div>

                <div className={`${cardCls} space-y-3`}>
                  <div>
                    <h3 className="font-bold text-base">Weekday Pattern</h3>
                    <p className="text-xs text-slate-400">Average completion by day of week, all logged days.</p>
                  </div>
                  <div className="space-y-2">
                    {weekdayRates.map(w => (
                      <div key={w.name} className="flex items-center gap-3 text-xs">
                        <span className="w-8 font-semibold text-slate-500">{w.name}</span>
                        <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${w.rate >= settings.targetRate ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${w.rate}%` }} />
                        </div>
                        <span className="w-10 text-right font-semibold">{w.rate}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`${cardCls} space-y-3`}>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <h3 className="font-bold text-base">Habit Connections</h3>
                </div>
                {correlations.length === 0 ? (
                  <p className="text-xs text-slate-400">No strong patterns yet. Keep logging: a pattern shows up after about 5 days where one habit was done.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {correlations.map((c, i) => (
                      <li key={i} className="text-xs text-slate-600 dark:text-slate-300">
                        On days you do <strong>{c.a}</strong>, you also do <strong>{c.b}</strong> {c.pA}% of the time, versus {c.pNot}% otherwise ({c.n} days).
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Monthly GitHub-Style Contribution Heatmap */}
              <div className={`${cardCls} space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base">Monthly Adherence Grid</h3>
                    <p className="text-xs text-slate-400">Click any day to jump to its daily view</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>0%</span>
                    <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 dark:bg-slate-800" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-amber-400/60" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500/50" />
                    <div className="w-3.5 h-3.5 rounded-sm bg-emerald-500" />
                    <span>100%</span>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-slate-400 py-1">{day}</div>
                  ))}

                  {(() => {
                    const [year, month] = selectedMonth.split('-').map(Number);
                    const firstDay = new Date(year, month - 1, 1).getDay();
                    const offset = (firstDay === 0 ? 7 : firstDay) - 1;
                    return Array.from({ length: offset }, (_, i) => (
                      <div key={`blank-${i}`} className="h-12" aria-hidden="true" />
                    ));
                  })()}

                  {Array.from({ length: monthlyMetrics.daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dKey = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                    const stats = getDayStats(dKey);
                    const isSelected = selectedDate === dKey;
                    const isToday = todayKey() === dKey;

                    let bgClass = 'bg-slate-100 dark:bg-slate-800/60 text-slate-400';
                    if (stats.percentage >= 80) bgClass = 'bg-emerald-500 text-white font-bold';
                    else if (stats.percentage >= 50) bgClass = 'bg-emerald-500/50 text-white font-bold';
                    else if (stats.percentage > 0) bgClass = 'bg-amber-400/60 text-slate-900 font-bold';

                    return (
                      <button
                        key={dKey}
                        onClick={() => { setSelectedDate(dKey); setActiveTab('daily'); }}
                        className={`h-12 rounded-xl flex flex-col items-center justify-center p-1 relative transition transform hover:scale-105 ${FOCUS_RING} ${bgClass} ${
                          isSelected ? 'ring-2 ring-emerald-400 ring-offset-2 dark:ring-offset-slate-900' : ''
                        }`}
                        title={`${dKey}: ${stats.completed}/${stats.total} habits completed (${stats.percentage}%)`}
                      >
                        <span className="text-xs">{dayNum}</span>
                        {stats.percentage > 0 && <span className="text-[10px] opacity-90">{stats.percentage}%</span>}
                        {isToday && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white dark:border-slate-900" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weekly Trend Breakdown (W1-W5) */}
              <div className={`${cardCls} space-y-4`}>
                <h3 className="font-bold text-base">Weekly Breakdown (W1 – W5)</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Week 1 (Days 1–7)', start: 1, end: 7 },
                    { label: 'Week 2 (Days 8–14)', start: 8, end: 14 },
                    { label: 'Week 3 (Days 15–21)', start: 15, end: 21 },
                    { label: 'Week 4 (Days 22–28)', start: 22, end: 28 },
                    { label: `Week 5 (Days 29–${monthlyMetrics.daysInMonth})`, start: 29, end: monthlyMetrics.daysInMonth }
                  ].filter(w => w.start <= monthlyMetrics.daysInMonth).map(w => {
                    let totalExp = 0;
                    let totalDone = 0;
                    for (let d = w.start; d <= Math.min(w.end, monthlyMetrics.daysInMonth); d++) {
                      const dKey = `${selectedMonth}-${String(d).padStart(2, '0')}`;
                      const dayData = logs[dKey];
                      if (hasEntries(dayData)) {
                        habits.forEach(h => {
                          totalExp++;
                          if (isDone(h, dayData)) totalDone++;
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
                            className={`h-full rounded-full transition-all duration-500 ${weekRate >= settings.targetRate ? 'bg-emerald-500' : 'bg-amber-400'}`}
                            style={{ width: `${weekRate}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Habit Details Adherence Table */}
              <div className={`${cardCls} overflow-x-auto`}>
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
                      const rate = monthlyMetrics.loggedDaysCount > 0 ? Math.round((count / monthlyMetrics.loggedDaysCount) * 100) : 0;
                      const streak = habitStreaks[h.id] || { current: 0, max: 0 };
                      const target = h.target ?? settings.targetRate;
                      const onTrack = rate >= target;

                      return (
                        <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                          <td className="py-3 pr-2">
                            <span className="font-semibold block">{h.name}</span>
                            <span className="text-xs text-slate-400">{h.type === 'number' ? goalLabel(h) : h.why}</span>
                          </td>
                          <td className="py-3 text-center text-xs">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">{h.category || 'General'}</span>
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
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${onTrack ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
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
                const currentReview = reviews[currentWeekKey] || { rating: 0, wentWell: '', interrupted: '', adjustment: '' };
                const summary = weekSummary(currentWeekKey);

                const updateReviewField = (field, val) => {
                  setReviews(prev => ({
                    ...prev,
                    [currentWeekKey]: {
                      rating: 0,
                      wentWell: '',
                      interrupted: '',
                      adjustment: '',
                      ...prev[currentWeekKey],
                      [field]: val,
                      updatedAt: todayKey()
                    }
                  }));
                };

                return (
                  <>
                    {/* Auto summary of the week */}
                    <div className={`${cardCls} space-y-3`}>
                      <h3 className="font-bold text-base">Week Summary: {currentWeekKey}</h3>
                      {summary.days === 0 ? (
                        <p className="text-xs text-slate-400">No logged days this week yet.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                            <div className="text-xs text-slate-400">Completion</div>
                            <div className="text-xl font-extrabold">{summary.rate}%</div>
                            <div className="text-[11px] text-slate-400">{summary.days} logged day{summary.days === 1 ? '' : 's'}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                            <div className="text-xs text-slate-400">Strongest</div>
                            <div className="font-bold truncate">{summary.best?.name}</div>
                            <div className="text-[11px] text-slate-400">{summary.best?.rate}% of days</div>
                          </div>
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60">
                            <div className="text-xs text-slate-400">Weakest</div>
                            <div className="font-bold truncate">{summary.worst?.name}</div>
                            <div className="text-[11px] text-slate-400">{summary.worst?.rate}% of days</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className={`${cardCls} space-y-6`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-2">
                        <div>
                          <h2 className="text-lg font-bold">Weekly Retrospective: {currentWeekKey}</h2>
                          <p className="text-xs text-slate-400">Saves automatically as you type</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500">Weekly Score:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(star => (
                              <button
                                key={star}
                                onClick={() => updateReviewField('rating', star)}
                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                                className={`p-1 hover:scale-110 transition rounded ${FOCUS_RING}`}
                              >
                                <Star className={`w-5 h-5 ${star <= (currentReview.rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
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
                            className={inputCls}
                          />
                        </div>

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
                            className={inputCls}
                          />
                        </div>

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
                            className={inputCls}
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <button
                            onClick={() => showToast('Weekly review saved.')}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-500/20 transition ${FOCUS_RING}`}
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Review</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Past Reviews History */}
              <div className={`${cardCls} space-y-4`}>
                <h3 className="font-bold text-base">Past Retrospective Logs</h3>
                {Object.keys(reviews).length === 0 ? (
                  <p className="text-xs text-slate-400">No past reviews logged yet.</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(reviews).sort(([a], [b]) => (a < b ? 1 : -1)).map(([wKey, rev]) => (
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

              {/* Target settings */}
              <div className={`${cardCls} space-y-4`}>
                <h2 className="text-lg font-bold">Tracker Target Settings</h2>
                <div>
                  <label htmlFor="target-rate" className="text-xs font-semibold text-slate-500 uppercase">Default Success Rate (%)</label>
                  <div className="flex items-center gap-3 mt-1.5">
                    <input
                      id="target-rate"
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
                  <p className="text-xs text-slate-400 mt-1">Used for the day and week colours. Each habit can override it below.</p>
                </div>
              </div>

              {/* Manage Habits */}
              <div className={`${cardCls} space-y-4`}>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <h3 className="text-base font-bold">Configured Habits ({habits.length})</h3>
                    <p className="text-xs text-slate-400">Reorder, edit, or add habits. Past logs are kept.</p>
                  </div>
                  <button
                    onClick={() => { setShowAddForm(true); setEditingId(null); }}
                    className={`flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition shadow-sm ${FOCUS_RING}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Habit</span>
                  </button>
                </div>

                {showAddForm && (
                  <HabitForm
                    defaultTarget={settings.targetRate}
                    onSave={addHabit}
                    onCancel={() => setShowAddForm(false)}
                  />
                )}

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {habits.map((habit, idx) => (
                    <div key={habit.id} className="py-3">
                      {editingId === habit.id ? (
                        <HabitForm
                          initial={habit}
                          defaultTarget={settings.targetRate}
                          onSave={updateHabit}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                              <span className="font-semibold text-sm">{habit.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">{habit.category || 'General'}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                                {habit.type === 'number' ? `Number · ${goalLabel(habit)}` : 'Yes / No'}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400">
                                Target {habit.target ?? settings.targetRate}%
                              </span>
                            </div>
                            {habit.why && <p className="text-xs text-slate-400 mt-0.5">{habit.why}</p>}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => moveHabit(idx, -1)} disabled={idx === 0} className={`p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded disabled:opacity-30 ${FOCUS_RING}`} title="Move up" aria-label={`Move ${habit.name} up`}>
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button onClick={() => moveHabit(idx, 1)} disabled={idx === habits.length - 1} className={`p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded disabled:opacity-30 ${FOCUS_RING}`} title="Move down" aria-label={`Move ${habit.name} down`}>
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditingId(habit.id); setShowAddForm(false); }} className={`p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded ${FOCUS_RING}`} title="Edit habit" aria-label={`Edit ${habit.name}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteHabit(habit)} className={`p-1.5 text-slate-400 hover:text-rose-500 rounded ${FOCUS_RING}`} title="Delete habit" aria-label={`Delete ${habit.name}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloud Sync */}
              <div className={`${cardCls} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      {session ? <Cloud className="w-4 h-4 text-emerald-500" /> : <CloudOff className="w-4 h-4 text-slate-400" />}
                      Cloud Sync
                    </h3>
                    <p className="text-xs text-slate-400">Keeps your habits in sync across phone and laptop using Supabase.</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">{syncLabel}</span>
                </div>

                {syncMessage && <p className="text-xs text-amber-500">{syncMessage}</p>}

                {!supabase ? (
                  <p className="text-xs text-slate-400">
                    Cloud sync is off. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file in your project and restart the dev server.
                  </p>
                ) : !session ? (
                  <form onSubmit={sendMagicLink} className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="sync-email" className="sr-only">Email address</label>
                    <input
                      id="sync-email"
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@example.com"
                      className={`flex-1 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm ${FOCUS_RING}`}
                    />
                    <button type="submit" className={`px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold ${FOCUS_RING}`}>
                      Email me a sign-in link
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">Signed in as <strong>{session.user.email}</strong></p>
                    <div className="flex gap-2">
                      <button onClick={() => syncFromCloud(session.user)} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition ${FOCUS_RING}`}>
                        <RefreshCw className="w-3.5 h-3.5" /> Sync now
                      </button>
                      <button onClick={signOut} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition ${FOCUS_RING}`}>
                        <LogOut className="w-3.5 h-3.5" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Data & Backup Center */}
              <div className={`${cardCls} space-y-4`}>
                <h3 className="text-base font-bold">Data & Persistence Management</h3>
                <p className="text-xs text-slate-400">
                  Data is saved to this browser instantly. Download a JSON backup any time, or sign in above to sync across devices.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <button onClick={handleExportData} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition ${FOCUS_RING}`}>
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span>Download JSON Backup</span>
                  </button>
                  <button onClick={handleResetToDefaults} className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition ${FOCUS_RING}`}>
                    <RefreshCw className="w-4 h-4" />
                    <span>Reset to Template Defaults</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </main>

        <footer className="py-4 text-center text-xs text-slate-400 border-t border-slate-200 dark:border-slate-800">
          Habit & Routine Tracker · Built for high consistency & offline freedom
        </footer>
      </div>
    </div>
  );
}

// ==========================================
// Inline form for adding and editing habits
// ==========================================
function HabitForm({ initial, defaultTarget, onSave, onCancel }) {
  const [f, setF] = useState(() => ({
    name: initial?.name || '',
    why: initial?.why || '',
    category: initial?.category || 'Custom',
    type: initial?.type || 'check',
    unit: initial?.unit || '',
    op: initial?.op || 'gte',
    goal: initial?.goal ?? 1,
    min: initial?.min ?? 6,
    max: initial?.max ?? 7,
    target: initial?.target ?? defaultTarget
  }));
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const habit = {
      id: initial?.id || `h_${Date.now()}`,
      name: f.name.trim(),
      why: f.why.trim(),
      category: f.category.trim() || 'Custom',
      type: f.type,
      target: Number(f.target) || defaultTarget
    };
    if (f.type === 'number') {
      habit.unit = f.unit.trim();
      habit.op = f.op;
      if (f.op === 'between') {
        habit.min = Number(f.min);
        habit.max = Number(f.max);
      } else {
        habit.goal = Number(f.goal);
      }
    }
    onSave(habit);
  };

  const inputCls = 'w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';
  const labelCls = 'text-xs font-semibold text-slate-500 space-y-1 block';

  return (
    <form onSubmit={submit} className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className={labelCls}>
        Habit name
        <input className={inputCls} value={f.name} onChange={(e) => set('name', e.target.value)} required autoFocus />
      </label>
      <label className={labelCls}>
        Why it matters
        <input className={inputCls} value={f.why} onChange={(e) => set('why', e.target.value)} />
      </label>
      <label className={labelCls}>
        Category
        <input className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)} />
      </label>
      <label className={labelCls}>
        Type
        <select className={inputCls} value={f.type} onChange={(e) => set('type', e.target.value)}>
          <option value="check">Yes / No checkbox</option>
          <option value="number">Number with a goal</option>
        </select>
      </label>

      {f.type === 'number' && (
        <>
          <label className={labelCls}>
            Unit
            <input className={inputCls} placeholder="pages, hrs, tasks" value={f.unit} onChange={(e) => set('unit', e.target.value)} />
          </label>
          <label className={labelCls}>
            Goal
            <select className={inputCls} value={f.op} onChange={(e) => set('op', e.target.value)}>
              <option value="gte">At least</option>
              <option value="lte">At most</option>
              <option value="between">Between</option>
            </select>
          </label>
          {f.op === 'between' ? (
            <div className="grid grid-cols-2 gap-2 md:col-span-2">
              <label className={labelCls}>
                Min
                <input type="number" step="0.5" className={inputCls} value={f.min} onChange={(e) => set('min', e.target.value)} />
              </label>
              <label className={labelCls}>
                Max
                <input type="number" step="0.5" className={inputCls} value={f.max} onChange={(e) => set('max', e.target.value)} />
              </label>
            </div>
          ) : (
            <label className={`${labelCls} md:col-span-2`}>
              Value
              <input type="number" step="0.5" className={inputCls} value={f.goal} onChange={(e) => set('goal', e.target.value)} />
            </label>
          )}
        </>
      )}

      <label className={`${labelCls} md:col-span-2`}>
        Target success rate (%)
        <input type="number" min="50" max="100" className={inputCls} value={f.target} onChange={(e) => set('target', e.target.value)} />
      </label>

      <div className="md:col-span-2 flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className={`px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 ${FOCUS_RING}`}>
          Cancel
        </button>
        <button type="submit" className={`px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white ${FOCUS_RING}`}>
          Save habit
        </button>
      </div>
    </form>
  );
}

// ==========================================
// PASSWORD GATE
// Set VITE_APP_PASSWORD_HASH in .env (SHA-256 hex of your password).
// The plain password is never stored in the app.
// ==========================================
const PASSWORD_HASH = (import.meta.env?.VITE_APP_PASSWORD_HASH || '').trim().toLowerCase();
const UNLOCK_KEY = 'habit_tracker_unlocked';

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function PasswordGate() {
  const [unlocked, setUnlocked] = useState(() => {
    try {
      return !!PASSWORD_HASH && sessionStorage.getItem(UNLOCK_KEY) === PASSWORD_HASH;
    } catch {
      return false;
    }
  });
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const lock = () => {
    try { sessionStorage.removeItem(UNLOCK_KEY); } catch { /* ignore */ }
    setPw('');
    setUnlocked(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!pw) return;
    setBusy(true);
    setError('');
    try {
      const hash = await sha256Hex(pw);
      if (hash === PASSWORD_HASH) {
        try { sessionStorage.setItem(UNLOCK_KEY, hash); } catch { /* ignore */ }
        setUnlocked(true);
      } else {
        setError('Wrong password.');
      }
    } catch (err) {
      setError('Could not check the password. Open the app over HTTPS or localhost.');
    } finally {
      setBusy(false);
      setPw('');
    }
  };

  if (unlocked) return <TrackerApp onLock={lock} />;

  if (!PASSWORD_HASH) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
        <div className="max-w-sm w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-sm">
          <p className="font-semibold">Password not set up</p>
          <p className="text-slate-400 text-xs">Add <code>VITE_APP_PASSWORD_HASH</code> to your <code>.env</code> file (and to Vercel's environment variables), then restart the app.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950 text-slate-100">
      <form onSubmit={submit} className="max-w-sm w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold">Habit Tracker</h1>
            <p className="text-xs text-slate-400">Enter your password to continue</p>
          </div>
        </div>

        <label htmlFor="app-password" className="sr-only">Password</label>
        <input
          id="app-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password"
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={busy || !pw}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {busy ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  return <PasswordGate />;
}
