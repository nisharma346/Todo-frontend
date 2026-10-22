
import React, { useState, useEffect } from 'react';
import Header from './Header';

const API_URL = 'http://localhost:3000/api';

function App() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('todoToken') || '');
  const [taskInput, setTaskInput] = useState('');
  const [todos, setTodos] = useState([]);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTask, setEditTask] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

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
          category: 'Personal',
        }),
      });

      setTaskInput('');
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
        }),
      });

      setEditingId(null);
      setEditTask('');
      setMessage('Task successfully update ho gaya!');
      await fetchTodos();
    } catch (error) {
      setMessage(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTask('');
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
    setMessage('Logout successful.');
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

  return (
    <div>
      <Header />

      <main style={{
        maxWidth: '440px',
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
                style={inputStyle}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
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

            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '6px' }}>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Yahan task likho..."
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />
              <button type="submit" style={buttonStyle}>Add</button>
            </form>

            <button
              type="button"
              onClick={handleLogout}
              style={{ ...buttonStyle, marginTop: '12px', background: '#555' }}
            >
              Logout
            </button>

            {/* Search and Filter Controls */}
            <div style={{ marginTop: '20px' }}>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search tasks..."
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                {['all', 'completed', 'pending'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFilterStatus(status)}
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
            </div>

            <ul style={{ listStyle: 'none', padding: 0, marginTop: '12px' }}>
              {filteredTodos.length === 0 ? (
                <li style={{ textAlign: 'center', color: '#888', padding: '20px 0' }}>
                  No tasks found.
                </li>
              ) : (
                filteredTodos.map((todo) => (
                  <li key={todo._id} style={todoStyle}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flex: 1
                    }}>
                      <input
                        type="checkbox"
                        checked={todo.isCompleted}
                        onChange={() => handleToggle(todo)}
                      />

                      {editingId === todo._id ? (
                        <input
                          type="text"
                          value={editTask}
                          onChange={(e) => setEditTask(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            minWidth: 0,
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            textDecoration: todo.isCompleted ? 'line-through' : 'none',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {todo.task}
                        </span>
                      )}

                    </label>

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
                  </li>
                ))
              )}
            </ul>
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

const todoStyle = {
  display: 'flex',
  alignItems: 'center',
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

export default App;

