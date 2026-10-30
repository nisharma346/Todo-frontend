
import React, { lazy, Suspense, useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import './theme.css';

const CalendarView = lazy(() => import('./CalendarView.jsx'));
const KanbanBoard = lazy(() => import('./KanbanBoard.jsx'));
const PomodoroTimer = lazy(() => import('./PomodoroTimer.jsx'));
const ProductivityDashboard = lazy(() => import('./ProductivityDashboard.jsx'));
const TaskAnalytics = lazy(() => import('./TaskAnalytics.jsx'));

const API_URL = 'https://todo-miniproject-agef.vercel.app/api';
const recurrenceOptions = [
  { value: 'none', label: 'Does Not Repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const recurrenceLabel = (value) =>
  recurrenceOptions.find((option) => option.value === value)?.label || 'Does Not Repeat';

function App() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('todoToken') || '');
  const [todayStr, setTodayStr] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [taskInput, setTaskInput] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskRecurrence, setTaskRecurrence] = useState('none');
  const [todos, setTodos] = useState([]);
  const [productivity, setProductivity] = useState(null);
  const [productivityLoading, setProductivityLoading] = useState(() => Boolean(token));
  const [productivityError, setProductivityError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTask, setEditTask] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');
  const [editPriority, setEditPriority] = useState('Medium');
  const [editRecurrence, setEditRecurrence] = useState('none');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('todoDark') === 'true'
  );
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [activeView, setActiveView] = useState('tasks');
  const [hasVisitedFocus, setHasVisitedFocus] = useState(false);
  const [updatingTaskIds, setUpdatingTaskIds] = useState(() => new Set());
  const updatingTaskIdsRef = useRef(new Set());

  // ── Profile / Change-Password panel state ────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const [profileUsername, setProfileUsername] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Apply / remove the body class whenever darkMode changes and persist it
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('todoDark', darkMode);
  }, [darkMode]);

  const handleToggleDark = () => setDarkMode((prev) => !prev);

  const request = useCallback(async (path, options = {}) => {
    const url = `${API_URL}${path}`;
    const method = options.method || 'GET';
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });

    const responseText = await response.text();
    let data = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        data = { message: responseText };
      }
    }

    if (!response.ok) {
      const detail = data.message ? `: ${data.message}` : '';
      throw new Error(`Request failed: ${method} ${url} (${response.status})${detail}`);
    }

    return data;
  }, [token]);

  // Timezone-safe overdue check: compare YYYY-MM-DD strings so same-day tasks
  // are never wrongly flagged as overdue due to time-of-day differences.
  const isOverdue = (todo) => {
    if (!todo.dueDate || todo.isCompleted || todo.status === 'completed') return false;
    const dueStr = new Date(todo.dueDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return dueStr < todayStr;
  };

  const fetchTodos = useCallback(async () => {
    try {
      const data = await request('/todos');
      setTodos(Array.isArray(data) ? data : []);
      setMessage('');
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    }
  }, [request]);

  const fetchProductivity = useCallback(async () => {
    setProductivityLoading(true);
    setProductivityError('');
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const data = await request(`/productivity?timeZone=${encodeURIComponent(timeZone)}`);
      setProductivity(data);
      return true;
    } catch (error) {
      setProductivityError(error.message);
      return false;
    } finally {
      setProductivityLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    request('/todos')
      .then((data) => {
        if (cancelled) return;
        setTodos(Array.isArray(data) ? data : []);
        setMessage('');
      })
      .catch((error) => {
        if (!cancelled) setMessage(error.message);
      });

    request(`/productivity?timeZone=${encodeURIComponent(timeZone)}`)
      .then((data) => {
        if (!cancelled) setProductivity(data);
      })
      .catch((error) => {
        if (!cancelled) setProductivityError(error.message);
      })
      .finally(() => {
        if (!cancelled) setProductivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, request]);

  useEffect(() => {
    if (!token) return undefined;

    let midnightTimeout;
    let utcMidnightTimeout;
    const scheduleNextDayRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      midnightTimeout = window.setTimeout(() => {
        fetchProductivity();
        scheduleNextDayRefresh();
      }, nextMidnight.getTime() - now.getTime() + 250);
    };
    const scheduleUtcDateRefresh = () => {
      const now = new Date();
      const nextUtcMidnight = Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1
      );
      utcMidnightTimeout = window.setTimeout(() => {
        setTodayStr(new Date().toISOString().slice(0, 10));
        scheduleUtcDateRefresh();
      }, nextUtcMidnight - now.getTime() + 250);
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        setTodayStr(new Date().toISOString().slice(0, 10));
        fetchProductivity();
      }
    };

    scheduleNextDayRefresh();
    scheduleUtcDateRefresh();
    window.addEventListener('focus', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearTimeout(midnightTimeout);
      window.clearTimeout(utcMidnightTimeout);
      window.removeEventListener('focus', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [token, fetchProductivity]);

  const handleSaveDailyGoal = async (dailyGoal) => {
    const data = await request('/productivity/goal', {
      method: 'PUT',
      body: JSON.stringify({ dailyGoal }),
    });
    setProductivity((current) =>
      current ? { ...current, dailyGoal: data.dailyGoal } : current
    );
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');

    // Confirm password check for signup
    if (mode === 'signup') {
      if (!signupConfirmPassword) {
        setMessage('Please fill in the Confirm Password field!');
        return;
      }
      if (password !== signupConfirmPassword) {
        setMessage('Password and Confirm Password do not match!');
        return;
      }
    }

    try {
      const data = await request(
        mode === 'signup' ? '/auth/signup' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      );

      if (mode === 'signup') {
        setMessage('Signup successful! Please click Login to sign in.');
        setSignupConfirmPassword('');
        setMode('login');
      } else {
        localStorage.setItem('todoToken', data.token);
        setProductivityLoading(true);
        setProductivityError('');
        setToken(data.token);
        setMessage('Login successful!');
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();

    if (!taskInput.trim()) {
      setMessage('Please enter a task first.');
      return;
    }

    try {
      await request('/todos', {
        method: 'POST',
        body: JSON.stringify({
          task: taskInput.trim(),
          description: taskDescription.trim(),
          category: taskCategory,
          priority: taskPriority,
          dueDate: taskDueDate || undefined,
          recurrence: taskRecurrence,
        }),
      });

      setTaskInput('');
      setTaskDescription('');
      setTaskCategory('Personal');
      setTaskPriority('Medium');
      setTaskDueDate('');
      setTaskRecurrence('none');
      setMessage('Task added successfully!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleToggle = async (todo) => {
    const isCompleted = !(todo.isCompleted || todo.status === 'completed');
    try {
      await request(`/todos/${todo._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          isCompleted,
          status: isCompleted ? 'completed' : 'todo',
        }),
      });
      const createsNextOccurrence =
        isCompleted && todo.recurrence && todo.recurrence !== 'none';
      if (createsNextOccurrence) {
        setFilterStatus('all');
        setSortBy('newest');
        setCurrentPage(1);
      }
      const refreshed = await fetchTodos();
      if (isCompleted) await fetchProductivity();
      if (createsNextOccurrence && refreshed) {
        setMessage(
          `Task completed. Next ${recurrenceLabel(todo.recurrence).toLowerCase()} occurrence added.`
        );
      }
    } catch (error) {
      await fetchTodos();
      setMessage(error.message);
    }
  };

  const handleKanbanStatusChange = async (id, status) => {
    const permittedStatuses = ['todo', 'inProgress', 'completed'];
    if (!permittedStatuses.includes(status) || updatingTaskIdsRef.current.has(id)) {
      return;
    }

    const previousTodo = todos.find((todo) => todo._id === id);
    if (!previousTodo) return;
    const previousStatus = previousTodo.isCompleted || previousTodo.status === 'completed'
      ? 'completed'
      : previousTodo.status === 'inProgress'
        ? 'inProgress'
        : 'todo';
    if (previousStatus === status) return;

    updatingTaskIdsRef.current.add(id);
    setUpdatingTaskIds(new Set(updatingTaskIdsRef.current));
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo._id === id
          ? { ...todo, status, isCompleted: status === 'completed' }
          : todo
      )
    );

    try {
      await request(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status,
          isCompleted: status === 'completed',
        }),
      });
      const updatedTodos = await request('/todos');
      const savedTodo = Array.isArray(updatedTodos)
        ? updatedTodos.find((todo) => todo._id === id)
        : null;
      const savedStatus = savedTodo
        ? savedTodo.isCompleted || savedTodo.status === 'completed'
          ? 'completed'
          : savedTodo.status === 'inProgress'
            ? 'inProgress'
            : 'todo'
        : null;
      if (savedStatus !== status) {
        throw new Error('The server did not save this status. Please try again.');
      }
      setTodos(updatedTodos);
      if (status === 'completed') await fetchProductivity();
    } catch (error) {
      setTodos((currentTodos) =>
        currentTodos.map((todo) => (todo._id === id ? previousTodo : todo))
      );
      await fetchTodos();
      setMessage(`Could not update task status: ${error.message}`);
    } finally {
      updatingTaskIdsRef.current.delete(id);
      setUpdatingTaskIds(new Set(updatingTaskIdsRef.current));
    }
  };

  const handleDelete = async (id) => {
    try {
      await request(`/todos/${id}`, { method: 'DELETE' });
      setMessage('Task deleted successfully!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleEdit = (todo) => {
    setEditingId(todo._id);
    setEditTask(todo.task);
    setEditDescription(todo.description || '');
    setEditCategory(todo.category || 'Personal');
    setEditPriority(todo.priority || 'Medium');
    setEditRecurrence(todo.recurrence || 'none');
    // Convert stored ISO date → 'YYYY-MM-DD' for the date input value
    setEditDueDate(
      todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : ''
    );
    setMessage('');
  };

  const handleSaveEdit = async (id) => {
    if (!editTask.trim()) {
      setMessage('Task name cannot be empty.');
      return;
    }

    try {
      await request(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          task: editTask.trim(),
          description: editDescription.trim(),
          category: editCategory,
          priority: editPriority,
          dueDate: editDueDate || null,   // null clears a previously set date
          recurrence: editRecurrence,
        }),
      });

      setEditingId(null);
      setEditTask('');
      setEditDescription('');
      setEditCategory('Personal');
      setEditPriority('Medium');
      setEditDueDate('');
      setEditRecurrence('none');
      setMessage('Task updated successfully!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
    setEditDescription('');
    setEditCategory('Personal');
    setEditPriority('Medium');
    setEditDueDate('');
    setEditRecurrence('none');
    setMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('todoToken');
    setToken('');
    setTodos([]);
    setProductivity(null);
    setProductivityLoading(false);
    setProductivityError('');
    setUsername('');
    setPassword('');
    setSignupConfirmPassword('');
    setSearchText('');
    setFilterStatus('all');
    setTaskDescription('');
    setTaskDueDate('');
    setTaskRecurrence('none');
    setEditDescription('');
    setEditRecurrence('none');
    setEditDueDate('');
    setSortBy('newest');
    setCurrentPage(1);
    setPageSize(5);
    setActiveView('tasks');
    // Reset profile panel too
    setShowProfile(false);
    setProfileUsername('');
    setProfileMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Logged out successfully.');
  };

  // ── Profile helpers ───────────────────────────────────────────────────────
  const handleOpenProfile = async () => {
    setProfileMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    try {
      const data = await request('/auth/me');
      setProfileUsername(data.username);
    } catch (error) {
      setProfileUsername('');
      setProfileMessage(error.message);
    }
    setShowProfile(true);
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
    setProfileMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setProfileMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setProfileMessage('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMessage('New password and confirm password do not match!');
      return;
    }
    if (newPassword.length < 6) {
      setProfileMessage('New password must be at least 6 characters long.');
      return;
    }

    try {
      const data = await request('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setProfileMessage(data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Force re-login after password change for security
      setTimeout(() => {
        handleLogout();
      }, 2500);
    } catch (error) {
      setProfileMessage(error.message);
    }
  };

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.task
      .toLowerCase()
      .includes(searchText.toLowerCase());
    const matchesFilter =
      filterStatus === 'all'
        ? true
        : filterStatus === 'completed'
          ? todo.isCompleted === true || todo.status === 'completed'
          : todo.isCompleted !== true && todo.status !== 'completed';
    return matchesSearch && matchesFilter;
  });

  // ── Sorting ──────────────────────────────────────────────────────────────
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || a._id) - new Date(b.createdAt || b._id);
    }
    if (sortBy === 'priority') {
      return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    }
    if (sortBy === 'dueDate') {
      // Tasks without a due date go to the end
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    // Default: newest first
    return new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id);
  });

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(sortedTodos.length / pageSize));
  // Clamp currentPage in case items were deleted
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pagedTodos = sortedTodos.slice(startIdx, startIdx + pageSize);

  // Helper that resets page to 1 before applying any control change
  const changeAndReset = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  // Derived stats — recalculated whenever todos changes, zero new state needed
  const stats = {
    total: todos.length,
    completed: todos.filter((t) => t.isCompleted || t.status === 'completed').length,
    pending: todos.filter((t) => !t.isCompleted && t.status !== 'completed').length,
    overdue: todos.filter((t) => isOverdue(t)).length,
  };
  const completionPercentage = stats.total
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;
  const statusChartData = [
    { name: 'Completed', value: stats.completed, color: '#198754' },
    { name: 'Pending', value: stats.pending, color: '#ffc107' },
  ];
  const priorityChartData = priorityOptions.map((priority) => ({
    priority,
    tasks: todos.filter((todo) => (todo.priority || 'Medium') === priority).length,
  }));
  const categoryCounts = todos.reduce((counts, todo) => {
    const category = todo.category || 'Personal';
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
  const categoryChartData = Object.entries(categoryCounts).map(([category, tasks]) => ({
    category,
    tasks,
  }));

  // ── Reminder tasks: incomplete tasks that are overdue OR due within 24 hours ──
  // Uses the same YYYY-MM-DD string comparison as isOverdue() for consistency.
  const reminderTasks = (() => {
    const next24hStr = new Date(
      Date.parse(`${todayStr}T00:00:00.000Z`) + 24 * 60 * 60 * 1000
    )
      .toISOString()
      .slice(0, 10);

    return todos
      .filter((t) => {
        if (t.isCompleted || t.status === 'completed' || !t.dueDate) return false;
        const dueStr = new Date(t.dueDate).toISOString().slice(0, 10);
        // Include if overdue (past today) OR due today OR due within next 24h
        return dueStr <= next24hStr;
      })
      .map((t) => {
        const dueStr = new Date(t.dueDate).toISOString().slice(0, 10);
        return {
          _id: t._id,
          task: t.task,
          dueStr,
          // 'overdue' = strictly before today; 'today' = today; 'soon' = tomorrow window
          status: dueStr < todayStr ? 'overdue' : dueStr === todayStr ? 'today' : 'soon',
        };
      })
      // Sort: overdue first, then today, then soon; within each group by date asc
      .sort((a, b) => {
        const rank = { overdue: 0, today: 1, soon: 2 };
        return rank[a.status] - rank[b.status] || a.dueStr.localeCompare(b.dueStr);
      });
  })();

  const handleCalendarEdit = (todo) => {
    const newestFirst = [...todos].sort(
      (a, b) => new Date(b.createdAt || b._id) - new Date(a.createdAt || a._id)
    );
    const taskIndex = newestFirst.findIndex((task) => task._id === todo._id);
    setActiveView('tasks');
    setSearchText('');
    setFilterStatus('all');
    setSortBy('newest');
    setCurrentPage(taskIndex >= 0 ? Math.floor(taskIndex / pageSize) + 1 : 1);
    handleEdit(todo);
  };

  return (
    <div>
      <Header darkMode={darkMode} onToggle={handleToggleDark} reminderTasks={reminderTasks} />

      <main className="app-main" style={{
        maxWidth: token ? '1100px' : '440px',
        margin: '35px auto',
        padding: '16px',
        fontFamily: 'Arial, sans-serif'
      }}>
        {!token ? (
          <>
            {/* ── Auth Card ─────────────────────────────────────────────── */}
            <div style={{
              background: 'var(--card-bg, #fff)',
              borderRadius: '12px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              padding: '36px 32px 28px',
              maxWidth: '420px',
              margin: '0 auto',
            }}>
              {/* Tab switcher */}
              <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', marginBottom: '28px', border: '1.5px solid #3730a3' }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setMessage(''); setSignupConfirmPassword(''); }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: mode === 'login' ? '#3730a3' : 'transparent',
                    color: mode === 'login' ? '#fff' : '#3730a3',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  🔑 Login
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setMessage(''); setPassword(''); setSignupConfirmPassword(''); }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: mode === 'signup' ? '#3730a3' : 'transparent',
                    color: mode === 'signup' ? '#fff' : '#3730a3',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '15px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  📝 Sign Up
                </button>
              </div>

              <h2 style={{ textAlign: 'center', marginTop: 0, marginBottom: '22px', fontSize: '22px', color: 'var(--text, #1e293b)' }}>
                {mode === 'login' ? 'Welcome Back! 👋' : 'Create Account ✨'}
              </h2>

              <form onSubmit={handleAuth}>
                {/* Username */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: 'var(--text-muted, #475569)' }}>
                    Username
                  </label>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    required
                    className="todo-input"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: 'var(--text-muted, #475569)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    required
                    className="todo-input"
                    style={{ ...inputStyle, marginBottom: 0 }}
                  />
                </div>

                {/* Confirm Password — shown only on Signup */}
                {mode === 'signup' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '5px', color: 'var(--text-muted, #475569)' }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      className="todo-input"
                      style={{
                        ...inputStyle,
                        marginBottom: 0,
                        borderColor: signupConfirmPassword && password !== signupConfirmPassword ? '#ef4444' : undefined,
                      }}
                    />
                    {signupConfirmPassword && password !== signupConfirmPassword && (
                      <p style={{ color: '#ef4444', fontSize: '12px', margin: '4px 0 0 2px' }}>
                        ⚠️ Passwords do not match!
                      </p>
                    )}
                    {signupConfirmPassword && password === signupConfirmPassword && (
                      <p style={{ color: '#22c55e', fontSize: '12px', margin: '4px 0 0 2px' }}>
                        ✅ Passwords match!
                      </p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  style={{ ...buttonStyle, width: '100%', marginTop: '8px', padding: '11px', fontSize: '15px', borderRadius: '8px' }}
                >
                  {mode === 'login' ? '🔑 Login' : '📝 Create Account'}
                </button>
              </form>

              {/* Switch mode link */}
              <p style={{ textAlign: 'center', marginTop: '18px', fontSize: '14px', color: 'var(--text-muted, #64748b)' }}>
                {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login');
                    setMessage('');
                    setPassword('');
                    setSignupConfirmPassword('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#3730a3', fontWeight: '700', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline', padding: 0 }}
                >
                  {mode === 'login' ? 'Sign Up' : 'Log In'}
                </button>
              </p>

              {/* Message display inside card */}
              {message && (
                <p role="status" style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  background: message.toLowerCase().includes('successful') ? '#dcfce7' : '#fee2e2',
                  color: message.toLowerCase().includes('successful') ? '#166534' : '#991b1b',
                  border: `1px solid ${message.toLowerCase().includes('successful') ? '#86efac' : '#fca5a5'}`,
                  overflowWrap: 'anywhere',
                  margin: '12px 0 0 0',
                }}>
                  {message.toLowerCase().includes('successful') ? '✅ ' : '⚠️ '}{message}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <h3 className="task-section-heading">Add New Task</h3>

            <form onSubmit={handleAddTask} className="task-form">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Enter task here..."
                className="todo-input"
                style={{ ...inputStyle, flex: '1 1 160px', marginBottom: 0 }}
              />
              <input
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Description (optional)"
                aria-label="Task description"
                className="todo-input"
                style={{ ...inputStyle, flex: '1 1 160px', marginBottom: 0 }}
              />
              <label className="task-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#555', fontSize: '13px' }}>
                Category
                <select
                  aria-label="Task category"
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value)}
                  className="todo-select"
                  style={{ ...selectStyle, marginBottom: 0 }}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="task-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#555', fontSize: '13px' }}>
                Priority
                <select
                  aria-label="Task priority"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="todo-select"
                  style={{ ...selectStyle, marginBottom: 0 }}
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </label>
              <label className="task-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#555', fontSize: '13px' }}>
                Due
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="todo-select"
                  style={{ ...selectStyle, marginBottom: 0 }}
                />
              </label>
              <label className="task-field" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#555', fontSize: '13px' }}>
                Repeat
                <select
                  aria-label="Task recurrence"
                  value={taskRecurrence}
                  onChange={(e) => setTaskRecurrence(e.target.value)}
                  className="todo-select"
                  style={{ ...selectStyle, marginBottom: 0 }}
                >
                  {recurrenceOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button type="submit" className="task-add-button" style={buttonStyle}>Add</button>
            </form>

            {/* ── Action button row: Profile + Logout ── */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={handleOpenProfile}
                className="btn-profile"
                style={{ ...buttonStyle, background: '#6c3483', flex: 1 }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
                </svg>
                Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                style={{ ...buttonStyle, background: '#555', flex: 1 }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M10 17l5-5-5-5M15 12H3" />
                  <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                </svg>
                Logout
              </button>
            </div>

            {/* ── Profile / Change Password Panel ── */}
            {showProfile && (
              <div style={profilePanelStyle} className="profile-panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>👤 My Profile</h3>
                  <button
                    type="button"
                    onClick={handleCloseProfile}
                    style={{ background: 'transparent', border: 'none', fontSize: '18px', cursor: 'pointer', lineHeight: 1 }}
                    aria-label="Close profile"
                  >
                    ✕
                  </button>
                </div>

                {/* Account Info */}
                <div style={profileRowStyle} className="profile-info-row">
                  <span style={{ fontSize: '13px', color: '#888' }}>Username</span>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>{profileUsername || '—'}</span>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid #dee2e6', margin: '12px 0' }} className="profile-divider" />

                {/* Change Password Form */}
                <h4 style={{ margin: '0 0 10px', fontSize: '14px' }}>🔒 Change Password</h4>
                <form onSubmit={handleChangePassword}>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    autoComplete="current-password"
                    className="todo-input"
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password (min 6 chars)"
                    autoComplete="new-password"
                    className="todo-input"
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    className="todo-input"
                    style={{ ...inputStyle, marginBottom: '8px' }}
                  />
                  <button
                    type="submit"
                    style={{ ...buttonStyle, width: '100%', background: '#6c3483' }}
                  >
                    Change Password
                  </button>
                </form>

                {profileMessage && (
                  <p style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    color: profileMessage.includes('successfully') ? '#198754' : '#dc3545',
                    wordBreak: 'break-word',
                  }} role="status">
                    {profileMessage}
                  </p>
                )}
              </div>
            )}

            {/* ── Stats Dashboard ── */}
            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              margin: '16px 0',
            }}>
              <div style={{ ...statCardStyle, borderTop: '3px solid #007bff' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#007bff' }}>
                  {stats.total}
                </div>
                <div className="summary-label" style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Total Tasks</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #198754' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#198754' }}>
                  {stats.completed}
                </div>
                <div className="summary-label" style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Completed Tasks</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #ffc107' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#b38600' }}>
                  {stats.pending}
                </div>
                <div className="summary-label" style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Pending Tasks</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #dc3545' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc3545' }}>
                  {stats.overdue}
                </div>
                <div className="summary-label" style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Overdue Tasks</div>
              </div>
            </div>

            <Suspense
              fallback={
                <section className="analytics-section" aria-labelledby="analytics-heading">
                  <h3 id="analytics-heading">Task Analytics</h3>
                  <p role="status">Loading task analytics…</p>
                </section>
              }
            >
              <TaskAnalytics
                stats={stats}
                completionPercentage={completionPercentage}
                statusChartData={statusChartData}
                priorityChartData={priorityChartData}
                categoryChartData={categoryChartData}
              />
            </Suspense>

            <nav className="dashboard-view-nav" aria-label="Dashboard views">
              <button
                type="button"
                className={`dashboard-view-button${activeView === 'tasks' ? ' active' : ''}`}
                aria-current={activeView === 'tasks' ? 'page' : undefined}
                onClick={() => setActiveView('tasks')}
              >
                Task List
              </button>
              <button
                type="button"
                className={`dashboard-view-button${activeView === 'kanban' ? ' active' : ''}`}
                aria-current={activeView === 'kanban' ? 'page' : undefined}
                onClick={() => setActiveView('kanban')}
              >
                Kanban Board
              </button>
              <button
                type="button"
                className={`dashboard-view-button${activeView === 'calendar' ? ' active' : ''}`}
                aria-current={activeView === 'calendar' ? 'page' : undefined}
                onClick={() => setActiveView('calendar')}
              >
                Calendar
              </button>
              <button
                type="button"
                className={`dashboard-view-button${activeView === 'focus' ? ' active' : ''}`}
                aria-current={activeView === 'focus' ? 'page' : undefined}
                onClick={() => {
                  setHasVisitedFocus(true);
                  setActiveView('focus');
                }}
              >
                Focus Timer
              </button>
              <button
                type="button"
                className={`dashboard-view-button${activeView === 'productivity' ? ' active' : ''}`}
                aria-current={activeView === 'productivity' ? 'page' : undefined}
                onClick={() => setActiveView('productivity')}
              >
                Productivity
              </button>
            </nav>

            <div hidden={activeView !== 'focus'}>
              {hasVisitedFocus && (
                <Suspense fallback={<p role="status">Loading focus timer…</p>}>
                  <PomodoroTimer todos={todos} />
                </Suspense>
              )}
            </div>

            {activeView === 'focus' || activeView === 'productivity' ? (
              activeView === 'productivity' ? (
                <Suspense fallback={<p role="status">Loading productivity…</p>}>
                  <ProductivityDashboard
                    stats={productivity}
                    loading={productivityLoading}
                    error={productivityError}
                    onSaveGoal={handleSaveDailyGoal}
                  />
                </Suspense>
              ) : null
            ) : activeView === 'calendar' ? (
              <Suspense fallback={<p role="status">Loading calendar…</p>}>
                <CalendarView
                  todos={todos}
                  isOverdue={isOverdue}
                  onEdit={handleCalendarEdit}
                />
              </Suspense>
            ) : activeView === 'kanban' ? (
              <Suspense fallback={<p role="status">Loading Kanban board…</p>}>
                <KanbanBoard
                  todos={todos}
                  isOverdue={isOverdue}
                  updatingIds={updatingTaskIds}
                  onStatusChange={handleKanbanStatusChange}
                  onEdit={handleCalendarEdit}
                  onDelete={handleDelete}
                />
              </Suspense>
            ) : (
              <>
                {/* Search, Sort and Filter Controls */}
                <div style={{ marginTop: '20px' }}>
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => changeAndReset(setSearchText)(e.target.value)}
                    placeholder="Search tasks..."
                    className="todo-input"
                    style={inputStyle}
                  />
                  <div className="filters-row" style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {['all', 'completed', 'pending'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => changeAndReset(setFilterStatus)(status)}
                        className={`filter-btn${filterStatus === status ? ' active' : ''}`}
                        style={{
                          ...filterBtnStyle,
                          background: filterStatus === status ? '#007bff' : '#e9ecef',
                          color: filterStatus === status ? '#fff' : '#333',
                          fontWeight: filterStatus === status ? '600' : '400',
                        }}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Sort + Page-size row */}
                  <div className="controls-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#555' }}>
                      Sort:
                      <select
                        aria-label="Sort tasks"
                        value={sortBy}
                        onChange={(e) => changeAndReset(setSortBy)(e.target.value)}
                        className="todo-select"
                        style={{ ...selectStyle, fontSize: '13px' }}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="priority">Priority: High → Low</option>
                        <option value="dueDate">Due Date: Earliest First</option>
                      </select>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#555' }}>
                      Per page:
                      <select
                        aria-label="Tasks per page"
                        value={pageSize}
                        onChange={(e) => changeAndReset(setPageSize)(Number(e.target.value))}
                        className="todo-select"
                        style={{ ...selectStyle, fontSize: '13px' }}
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                      </select>
                    </label>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px' }}>
                  {pagedTodos.length === 0 ? (
                    <li style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
                      No tasks found.
                    </li>
                  ) : (
                    pagedTodos.map((todo) => (
                      <li key={todo._id} style={todoStyle} className="todo-item task-item-card">

                        {/* Checkbox — standalone flex item */}
                        <input
                          type="checkbox"
                          checked={todo.isCompleted || todo.status === 'completed'}
                          onChange={() => handleToggle(todo)}
                          style={{ flexShrink: 0, marginTop: '2px', cursor: 'pointer' }}
                        />

                        {/* Task content — takes all remaining width */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {editingId === todo._id ? (
                            <>
                              <input
                                type="text"
                                value={editTask}
                                onChange={(e) => setEditTask(e.target.value)}
                                autoFocus
                                style={{
                                  width: '100%',
                                  boxSizing: 'border-box',
                                  padding: '6px 8px',
                                  border: '1px solid #ccc',
                                  borderRadius: '4px',
                                  marginBottom: '6px',
                                }}
                              />
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Description (optional)"
                                aria-label="Edit task description"
                                className="todo-input"
                                style={{ ...inputStyle, marginBottom: '6px' }}
                              />
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                <select
                                  aria-label="Edit task category"
                                  value={editCategory}
                                  onChange={(e) => setEditCategory(e.target.value)}
                                  className="todo-select"
                                  style={selectStyle}
                                >
                                  {categoryOptions.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                                <select
                                  aria-label="Edit task priority"
                                  value={editPriority}
                                  onChange={(e) => setEditPriority(e.target.value)}
                                  className="todo-select"
                                  style={selectStyle}
                                >
                                  {priorityOptions.map((p) => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                                <input
                                  type="date"
                                  value={editDueDate}
                                  onChange={(e) => setEditDueDate(e.target.value)}
                                  className="todo-select"
                                  style={selectStyle}
                                  aria-label="Edit due date"
                                />
                                <select
                                  aria-label="Edit task recurrence"
                                  value={editRecurrence}
                                  onChange={(e) => setEditRecurrence(e.target.value)}
                                  className="todo-select"
                                  style={selectStyle}
                                >
                                  {recurrenceOptions.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  textDecoration: todo.isCompleted || todo.status === 'completed' ? 'line-through' : 'none',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                  marginBottom: '4px',
                                }}
                              >
                                {todo.task}
                              </div>
                              {todo.description && (
                                <p className="task-description">{todo.description}</p>
                              )}
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={categoryStyle} className="badge badge-meta">Category: {todo.category || 'Personal'}</span>
                                <span style={priorityStyle} className="badge badge-meta">Priority: {todo.priority || 'Medium'}</span>
                                {todo.recurrence && todo.recurrence !== 'none' && (
                                  <span style={categoryStyle} className="badge badge-meta">
                                    Repeats: {recurrenceLabel(todo.recurrence)}
                                  </span>
                                )}
                                {todo.dueDate && (
                                  <span style={dueDateStyle}>
                                    Due: {new Date(todo.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                                {isOverdue(todo) && (
                                  <span style={overdueStyle}>Overdue</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Action buttons — shrink-proof */}
                        <div className="task-actions" style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                          {editingId === todo._id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(todo._id)}
                                style={{ ...buttonStyle, background: '#198754' }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                style={{ ...buttonStyle, background: '#6c757d' }}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleEdit(todo)}
                              style={{ ...buttonStyle, background: '#ffc107', color: '#222' }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(todo._id)}
                            style={{ ...buttonStyle, background: '#dc3545' }}
                          >
                            Delete
                          </button>
                        </div>

                      </li>
                    ))
                  )}
                </ul>

                {/* ── Pagination Controls ── */}
                {sortedTodos.length > 0 && (
                  <div className="pagination-controls" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    marginTop: '12px',
                    flexWrap: 'wrap',
                  }}>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="page-btn"
                      style={{
                        ...paginationBtnStyle,
                        opacity: safePage === 1 ? 0.4 : 1,
                        cursor: safePage === 1 ? 'default' : 'pointer',
                      }}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: '13px', color: '#555' }} className="page-indicator">
                      Page {safePage} of {totalPages}
                      &nbsp;·&nbsp;
                      {sortedTodos.length} task{sortedTodos.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="page-btn"
                      style={{
                        ...paginationBtnStyle,
                        opacity: safePage === totalPages ? 0.4 : 1,
                        cursor: safePage === totalPages ? 'default' : 'pointer',
                      }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {message && token && (
          <p role="status" style={{ marginTop: '16px', overflowWrap: 'anywhere' }}>
            {message}
          </p>
        )}
      </main>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px',
  marginBottom: '10px',
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const buttonStyle = {
  padding: '10px 14px',
  background: '#007bff',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
};

const priorityOptions = ['High', 'Medium', 'Low'];
const categoryOptions = ['Personal', 'Work', 'Shopping', 'Others'];
const selectStyle = {
  boxSizing: 'border-box',
  padding: '8px',
  border: '1px solid #ccc',
  borderRadius: '4px',
  background: '#fff',
};

const priorityStyle = {
  flexShrink: 0,
  padding: '3px 7px',
  borderRadius: '10px',
  background: '#e9ecef',
  color: '#333',
  fontSize: '12px',
  fontWeight: '600',
};

const categoryStyle = {
  flexShrink: 0,
  padding: '3px 7px',
  borderRadius: '10px',
  background: '#e9ecef',
  color: '#333',
  fontSize: '12px',
  fontWeight: '600',
};

const todoStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  flexWrap: 'nowrap',
  gap: '10px',
  padding: '10px',
  background: '#f8f9fa',
  borderLeft: '4px solid #007bff',
  marginBottom: '8px',
  borderRadius: '4px',
};

const filterBtnStyle = {
  flex: 1,
  padding: '8px 0',
  border: '1px solid #ccc',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: 'background 0.2s, color 0.2s',
  fontSize: '14px',
};

const dueDateStyle = {
  flexShrink: 0,
  padding: '3px 7px',
  borderRadius: '10px',
  background: '#343a40',
  color: '#fff',
  fontSize: '12px',
  fontWeight: '600',
};

const overdueStyle = {
  flexShrink: 0,
  padding: '3px 7px',
  borderRadius: '10px',
  background: '#dc3545',
  color: '#fff',
  fontSize: '12px',
  fontWeight: '700',
};

const statCardStyle = {
  background: '#fff',
  border: '1px solid #dee2e6',
  borderRadius: '6px',
  padding: '10px 6px',
  textAlign: 'center',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
};

const paginationBtnStyle = {
  padding: '7px 14px',
  background: '#007bff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: 'pointer',
};

const profilePanelStyle = {
  background: '#f8f9fa',
  border: '1px solid #dee2e6',
  borderRadius: '8px',
  padding: '16px',
  marginTop: '14px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
};

const profileRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6px 0',
};

export default App;
