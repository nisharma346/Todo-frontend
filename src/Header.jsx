import React, { useState, useRef, useEffect } from 'react';

// Label config for each reminder status
const STATUS_CONFIG = {
  overdue: { label: 'Overdue',  bg: '#dc3545', color: '#fff' },
  today:   { label: 'Due Today', bg: '#fd7e14', color: '#fff' },
  soon:    { label: 'Due Soon',  bg: '#ffc107', color: '#212529' },
};

function Header({ darkMode, onToggle, reminderTasks = [] }) {
  const [showReminder, setShowReminder] = useState(false);
  const panelRef = useRef(null);
  const bellRef  = useRef(null);

  // Close reminder panel when clicking outside of it
  useEffect(() => {
    if (!showReminder) return;
    const handleClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setShowReminder(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReminder]);

  const count = reminderTasks.length;

  return (
    <div
      className="app-header"
      style={{
        background: '#007bff',
        color: 'white',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'background 0.25s ease',
        position: 'relative',   // anchor for the dropdown panel
      }}
    >
      <h2 style={{ margin: 0, fontSize: '20px' }}>📝 My Secure Todo Application</h2>

      {/* Right-side controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

        {/* ── Bell / Reminder indicator ── */}
        <div style={{ position: 'relative' }} ref={bellRef}>
          <button
            className="reminder-bell"
            onClick={() => setShowReminder((v) => !v)}
            title={count > 0 ? `${count} task reminder${count > 1 ? 's' : ''}` : 'No upcoming reminders'}
            aria-label="Task reminders"
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderRadius: '20px',
              padding: '4px 10px',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '13px',
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            🔔
            {count > 0 && (
              <span
                className="reminder-badge"
                style={{
                  background: '#dc3545',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  lineHeight: '1.4',
                  minWidth: '18px',
                  textAlign: 'center',
                }}
              >
                {count}
              </span>
            )}
          </button>

          {/* ── Reminder dropdown panel ── */}
          {showReminder && (
            <div
              ref={panelRef}
              className="reminder-panel"
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '300px',
                background: '#fff',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                zIndex: 9999,
                overflow: 'hidden',
              }}
            >
              {/* Panel header */}
              <div
                className="reminder-panel-header"
                style={{
                  background: '#007bff',
                  color: '#fff',
                  padding: '10px 14px',
                  fontWeight: '600',
                  fontSize: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>🔔 Task Reminders</span>
                <button
                  onClick={() => setShowReminder(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '16px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '0 2px',
                  }}
                  aria-label="Close reminders"
                >
                  ✕
                </button>
              </div>

              {/* Panel body */}
              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                {count === 0 ? (
                  <p
                    className="reminder-empty"
                    style={{
                      textAlign: 'center',
                      color: '#888',
                      padding: '20px 14px',
                      margin: 0,
                      fontSize: '13px',
                    }}
                  >
                    ✅ No overdue or upcoming tasks!
                  </p>
                ) : (
                  reminderTasks.map((t) => {
                    const cfg = STATUS_CONFIG[t.status];
                    return (
                      <div
                        key={t._id}
                        className="reminder-item"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          padding: '9px 14px',
                          borderBottom: '1px solid #f0f0f0',
                          gap: '8px',
                        }}
                      >
                        <span
                          className="reminder-task-name"
                          style={{
                            fontSize: '13px',
                            color: '#333',
                            flex: 1,
                            wordBreak: 'break-word',
                          }}
                        >
                          {t.task}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                          <span
                            style={{
                              background: cfg.bg,
                              color: cfg.color,
                              borderRadius: '8px',
                              padding: '2px 7px',
                              fontSize: '11px',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: '11px', color: '#888' }}>
                            {t.dueStr}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Dark / Light toggle ── */}
        <button
          className="theme-toggle"
          onClick={onToggle}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle dark mode"
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </div>
  );
}

export default Header;
