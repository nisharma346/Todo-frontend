
import React, { useState, useEffect } from 'react';
import Header from './Header';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './theme.css';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('todoToken') || '');
  const [taskInput, setTaskInput] = useState('');
  const [taskCategory, setTaskCategory] = useState('Personal');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [todos, setTodos] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTask, setEditTask] = useState('');
  const [editCategory, setEditCategory] = useState('Personal');
  const [editPriority, setEditPriority] = useState('Medium');
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

  const request = async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  };

  // Timezone-safe overdue check: compare YYYY-MM-DD strings so same-day tasks
  // are never wrongly flagged as overdue due to time-of-day differences.
  const isOverdue = (todo) => {
    if (!todo.dueDate || todo.isCompleted) return false;
    const todayStr = new Date().toISOString().slice(0, 10);       // 'YYYY-MM-DD'
    const dueStr = new Date(todo.dueDate).toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return dueStr < todayStr;
  };

  const fetchTodos = async () => {
    try {
      const data = await request('/todos');
      setTodos(Array.isArray(data) ? data : []);
      setMessage('');
    } catch (error) {
      setMessage(error.message);
    }
  };

  useEffect(() => {
    if (token) fetchTodos();
  }, [token]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const data = await request(
        mode === 'signup' ? '/auth/signup' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ username, password }),
        }
      );

      if (mode === 'signup') {
        setMessage('Signup successful! Ab Login par click karke login karo.');
        setMode('login');
      } else {
        localStorage.setItem('todoToken', data.token);
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
      setMessage('Pehle task likho.');
      return;
    }

    try {
      await request('/todos', {
        method: 'POST',
        body: JSON.stringify({
          task: taskInput.trim(),
          category: taskCategory,
          priority: taskPriority,
          dueDate: taskDueDate || undefined,
        }),
      });

      setTaskInput('');
      setTaskCategory('Personal');
      setTaskPriority('Medium');
      setTaskDueDate('');
      setMessage('Task successfully add ho gaya!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleToggle = async (todo) => {
    try {
      await request(`/todos/${todo._id}`, {
        method: 'PUT',
        body: JSON.stringify({ isCompleted: !todo.isCompleted }),
      });
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await request(`/todos/${id}`, { method: 'DELETE' });
      setMessage('Task delete ho gaya!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleEdit = (todo) => {
    setEditingId(todo._id);
    setEditTask(todo.task);
    setEditCategory(todo.category || 'Personal');
    setEditPriority(todo.priority || 'Medium');
    // Convert stored ISO date → 'YYYY-MM-DD' for the date input value
    setEditDueDate(
      todo.dueDate ? new Date(todo.dueDate).toISOString().slice(0, 10) : ''
    );
    setMessage('');
  };

  const handleSaveEdit = async (id) => {
    if (!editTask.trim()) {
      setMessage('Task ka naam khaali nahi ho sakta.');
      return;
    }

    try {
      await request(`/todos/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          task: editTask.trim(),
          category: editCategory,
          priority: editPriority,
          dueDate: editDueDate || null,   // null clears a previously set date
        }),
      });

      setEditingId(null);
      setEditTask('');
      setEditCategory('Personal');
      setEditPriority('Medium');
      setEditDueDate('');
      setMessage('Task successfully update ho gaya!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
    setEditCategory('Personal');
    setEditPriority('Medium');
    setEditDueDate('');
    setMessage('');
  };

  const handleLogout = () => {
    localStorage.removeItem('todoToken');
    setToken('');
    setTodos([]);
    setUsername('');
    setPassword('');
    setSearchText('');
    setFilterStatus('all');
    setTaskDueDate('');
    setEditDueDate('');
    setSortBy('newest');
    setCurrentPage(1);
    setPageSize(5);
    // Reset profile panel too
    setShowProfile(false);
    setProfileUsername('');
    setProfileMessage('');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setMessage('Logout successful.');
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
      setProfileMessage('Sabhi fields bharein.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setProfileMessage('Naya password aur confirm password match nahi karte!');
      return;
    }
    if (newPassword.length < 6) {
      setProfileMessage('Naya password kam se kam 6 characters ka hona chahiye.');
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
        ? todo.isCompleted === true
        : todo.isCompleted === false;
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
    total:     todos.length,
    completed: todos.filter((t) => t.isCompleted).length,
    pending:   todos.filter((t) => !t.isCompleted).length,
    overdue:   todos.filter((t) => isOverdue(t)).length,
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
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    // "next 24 hours" ceiling: the calendar date 24h from now
    const next24hStr = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    return todos
      .filter((t) => {
        if (t.isCompleted || !t.dueDate) return false;
        const dueStr = new Date(t.dueDate).toISOString().slice(0, 10);
        // Include if overdue (past today) OR due today OR due within next 24h
        return dueStr <= next24hStr;
      })
      .map((t) => {
        const dueStr = new Date(t.dueDate).toISOString().slice(0, 10);
        return {
          _id:     t._id,
          task:    t.task,
          dueStr,
          // 'overdue' = strictly before today; 'today' = today; 'soon' = tomorrow window
          status:  dueStr < todayStr ? 'overdue' : dueStr === todayStr ? 'today' : 'soon',
        };
      })
      // Sort: overdue first, then today, then soon; within each group by date asc
      .sort((a, b) => {
        const rank = { overdue: 0, today: 1, soon: 2 };
        return rank[a.status] - rank[b.status] || a.dueStr.localeCompare(b.dueStr);
      });
  })();

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
            <h2 style={{ textAlign: 'center' }}>
              {mode === 'login' ? 'Login' : 'Create Account'}
            </h2>

            <form onSubmit={handleAuth}>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                autoComplete="username"
                required
                className="todo-input"
                style={inputStyle}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="todo-input"
                style={inputStyle}
              />

              <button type="submit" style={buttonStyle}>
                {mode === 'login' ? 'Login' : 'Sign Up'}
              </button>
            </form>

            <p style={{ textAlign: 'center' }}>
              {mode === 'login' ? 'Account nahi hai?' : 'Pehle se account hai?'}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'login' ? 'signup' : 'login');
                  setMessage('');
                }}
              >
                {mode === 'login' ? 'Sign Up' : 'Login'}
              </button>
            </p>
          </>
        ) : (
          <>
            <h3>Naya Task Jodein</h3>

            <form onSubmit={handleAddTask} className="task-form">
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Yahan task likho..."
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
                👤 Profile
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="btn-logout"
                style={{ ...buttonStyle, background: '#555', flex: 1 }}
              >
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
                    color: profileMessage.includes('safal') || profileMessage.includes('successfully') ? '#198754' : '#dc3545',
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
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Total</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #198754' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#198754' }}>
                  {stats.completed}
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Completed</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #ffc107' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#b38600' }}>
                  {stats.pending}
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Pending</div>
              </div>
              <div style={{ ...statCardStyle, borderTop: '3px solid #dc3545' }} className="stat-card">
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc3545' }}>
                  {stats.overdue}
                </div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>Overdue</div>
              </div>
            </div>

            <section className="analytics-section" aria-labelledby="analytics-heading">
              <h3 id="analytics-heading">Task Analytics</h3>
              <div className="analytics-grid">
                <article className="analytics-card">
                  <h4>Completed vs Pending</h4>
                  {stats.total > 0 ? (
                    <div className="analytics-plot">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={48}
                            outerRadius={76}
                            paddingAngle={3}
                          >
                            {statusChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="analytics-plot analytics-empty">Add tasks to see this chart.</div>
                  )}
                  <div className="analytics-legend">
                    {statusChartData.map((entry) => (
                      <span key={entry.name}>
                        <i style={{ backgroundColor: entry.color }} />
                        {entry.name}: {entry.value}
                      </span>
                    ))}
                  </div>
                </article>

                <article className="analytics-card">
                  <h4>Tasks by Priority</h4>
                  <div className="analytics-plot">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityChartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="priority"
                          interval={0}
                          tick={{ fill: 'var(--analytics-text)', fontSize: 12 }}
                          tickMargin={8}
                        />
                        <YAxis
                          allowDecimals={false}
                          width={36}
                          tick={{ fill: 'var(--analytics-text)', fontSize: 12 }}
                        />
                        <Tooltip />
                        <Bar dataKey="tasks" name="Tasks" fill="#007bff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </article>

                <article className="analytics-card">
                  <h4>Tasks by Category</h4>
                  {categoryChartData.length > 0 ? (
                    <div className="analytics-plot">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={categoryChartData}
                          layout="vertical"
                          margin={{ top: 8, right: 12, bottom: 8, left: 8 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" allowDecimals={false} tick={{ fill: 'var(--analytics-text)' }} />
                          <YAxis
                            dataKey="category"
                            type="category"
                            width={96}
                            tick={{ fill: 'var(--analytics-text)', fontSize: 12 }}
                          />
                          <Tooltip />
                          <Bar dataKey="tasks" name="Tasks" fill="#6f42c1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="analytics-plot analytics-empty">Add tasks to see this chart.</div>
                  )}
                </article>

                <article className="analytics-card completion-card">
                  <h4>Task Completion</h4>
                  <div className="analytics-plot">
                    <div
                      className="completion-chart"
                      role="img"
                      aria-label={`${completionPercentage}% complete: ${stats.completed} of ${stats.total} tasks`}
                    >
                      <svg viewBox="0 0 120 120" aria-hidden="true">
                        <circle className="completion-track" cx="60" cy="60" r="48" />
                        <circle
                          className="completion-progress"
                          cx="60"
                          cy="60"
                          r="48"
                          style={{
                            strokeDasharray: 2 * Math.PI * 48,
                            strokeDashoffset: 2 * Math.PI * 48 * (1 - completionPercentage / 100),
                          }}
                        />
                      </svg>
                      <div className="completion-label">
                        <strong>{completionPercentage}%</strong>
                        <span>{stats.completed} of {stats.total}</span>
                      </div>
                    </div>
                  </div>
                </article>
              </div>
            </section>

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
                  <li key={todo._id} style={todoStyle} className="todo-item">

                    {/* Checkbox — standalone flex item */}
                    <input
                      type="checkbox"
                      checked={todo.isCompleted}
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
                          </div>
                        </>
                      ) : (
                        <>
                          <div
                            style={{
                              textDecoration: todo.isCompleted ? 'line-through' : 'none',
                              wordBreak: 'break-word',
                              overflowWrap: 'anywhere',
                              marginBottom: '4px',
                            }}
                          >
                            {todo.task}
                          </div>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span style={categoryStyle} className="badge badge-meta">Category: {todo.category || 'Personal'}</span>
                            <span style={priorityStyle} className="badge badge-meta">Priority: {todo.priority || 'Medium'}</span>
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

        {message && (
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
