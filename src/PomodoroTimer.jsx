import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  createInitialTimerState,
  formatTimerTime,
  TIMER_MODES,
  timerReducer,
} from './pomodoroTimer';
import './PomodoroTimer.css';

const SESSION_STATS_KEY = 'todoPomodoroSessionStats';

function readSessionStats() {
  try {
    const storedStats = window.sessionStorage.getItem(SESSION_STATS_KEY);
    if (!storedStats) return {};
    const parsedStats = JSON.parse(storedStats);
    return parsedStats && typeof parsedStats === 'object' && !Array.isArray(parsedStats)
      ? parsedStats
      : {};
  } catch (error) {
    console.warn('Could not restore Pomodoro session counts.', error);
    return {};
  }
}

function PomodoroTimer({ todos }) {
  const [timer, dispatch] = useReducer(
    timerReducer,
    undefined,
    () => createInitialTimerState(readSessionStats())
  );
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(false);

  const selectedTask = useMemo(
    () => todos.find((todo) => todo._id === selectedTaskId),
    [selectedTaskId, todos]
  );
  const modeDuration = TIMER_MODES[timer.mode].durationMs;
  const progress = Math.min(1, Math.max(0, 1 - timer.remainingMs / modeDuration));
  const circumference = 2 * Math.PI * 88;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SESSION_STATS_KEY,
        JSON.stringify({
          completedFocusSessions: timer.completedFocusSessions,
          focusSessionsSinceLongBreak: timer.focusSessionsSinceLongBreak,
          shouldSuggestLongBreak: timer.shouldSuggestLongBreak,
        })
      );
    } catch (error) {
      console.warn('Could not save Pomodoro session counts.', error);
    }
  }, [
    timer.completedFocusSessions,
    timer.focusSessionsSinceLongBreak,
    timer.shouldSuggestLongBreak,
  ]);

  useEffect(() => {
    if (timer.status !== 'running') return undefined;

    const updateTimer = () => dispatch({ type: 'tick', now: Date.now() });
    const intervalId = window.setInterval(updateTimer, 1000);
    document.addEventListener('visibilitychange', updateTimer);
    updateTimer();

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', updateTimer);
    };
  }, [timer.status, timer.deadline]);

  useEffect(() => {
    if (!soundEnabled || timer.completionCount === 0) return;
    if (typeof window.AudioContext !== 'function') return;

    try {
      const audioContext = new window.AudioContext();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.frequency.value = 660;
      gain.gain.setValueAtTime(0.12, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      oscillator.addEventListener('ended', () => audioContext.close(), { once: true });
    } catch {
      // Audio is optional; browser restrictions must not interrupt the timer.
    }
  }, [soundEnabled, timer.completionCount]);

  const switchMode = (mode) => dispatch({ type: 'switch-mode', mode });

  const startSuggestedLongBreak = () => {
    dispatch({ type: 'switch-mode', mode: 'longBreak' });
    dispatch({ type: 'start', now: Date.now() });
  };

  return (
    <section className="pomodoro-page" aria-labelledby="pomodoro-heading">
      <header className="pomodoro-header">
        <div>
          <p className="pomodoro-eyebrow">FOCUS MODE</p>
          <h2 id="pomodoro-heading">Pomodoro Timer</h2>
          <p>Work in focused intervals and give yourself time to recharge.</p>
        </div>
        <label className="pomodoro-sound-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(event) => setSoundEnabled(event.target.checked)}
          />
          <span>Completion sound</span>
        </label>
      </header>

      <div className="pomodoro-layout">
        <div className={`pomodoro-clock pomodoro-clock-${timer.mode}`}>
          <div className="pomodoro-mode-switcher" role="group" aria-label="Timer mode">
            {Object.entries(TIMER_MODES).map(([mode, config]) => (
              <button
                key={mode}
                type="button"
                className={timer.mode === mode ? 'active' : ''}
                aria-pressed={timer.mode === mode}
                onClick={() => switchMode(mode)}
              >
                {config.label}
              </button>
            ))}
          </div>

          <div className="pomodoro-dial">
            <svg viewBox="0 0 200 200" role="img" aria-label={`${TIMER_MODES[timer.mode].label} progress`}>
              <circle className="pomodoro-dial-track" cx="100" cy="100" r="88" />
              <circle
                className="pomodoro-dial-progress"
                cx="100"
                cy="100"
                r="88"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference * (1 - progress),
                }}
              />
            </svg>
            <div className="pomodoro-time">
              <span className="pomodoro-current-mode">{TIMER_MODES[timer.mode].label}</span>
              <strong aria-live="off">{formatTimerTime(timer.remainingMs)}</strong>
              <span className="pomodoro-status">
                {timer.status === 'running'
                  ? 'In progress'
                  : timer.status === 'paused'
                    ? 'Paused'
                    : timer.status === 'completed'
                      ? 'Complete'
                      : 'Ready when you are'}
              </span>
            </div>
          </div>

          <div className="pomodoro-controls">
            {timer.status === 'running' ? (
              <button
                type="button"
                className="pomodoro-primary-button"
                onClick={() => dispatch({ type: 'pause', now: Date.now() })}
                aria-label="Pause timer"
              >
                Pause
              </button>
            ) : timer.status === 'paused' ? (
              <button
                type="button"
                className="pomodoro-primary-button"
                onClick={() => dispatch({ type: 'resume', now: Date.now() })}
                aria-label="Resume timer"
              >
                Resume
              </button>
            ) : timer.status === 'idle' ? (
              <button
                type="button"
                className="pomodoro-primary-button"
                onClick={() => dispatch({ type: 'start', now: Date.now() })}
                aria-label="Start timer"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                className="pomodoro-primary-button"
                onClick={() => dispatch({ type: 'reset' })}
                aria-label="Reset completed timer"
              >
                Start again
              </button>
            )}
            <button
              type="button"
              className="pomodoro-reset-button"
              onClick={() => dispatch({ type: 'reset' })}
              aria-label="Reset timer"
            >
              Reset
            </button>
          </div>
        </div>

        <aside className="pomodoro-details">
          <section className="pomodoro-card">
            <h3>Focus on a task</h3>
            <p>Choose one of your tasks, or leave it blank for a general focus session.</p>
            <label htmlFor="pomodoro-task">Task for this session</label>
            <select
              id="pomodoro-task"
              value={selectedTask ? selectedTaskId : ''}
              onChange={(event) => setSelectedTaskId(event.target.value)}
              className="todo-select"
            >
              <option value="">General focus session</option>
              {todos.map((todo) => (
                <option key={todo._id} value={todo._id}>{todo.task}</option>
              ))}
            </select>
            <div className="pomodoro-selected-task" aria-live="polite">
              {selectedTask ? (
                <>
                  <span>Working on</span>
                  <strong>{selectedTask.task}</strong>
                </>
              ) : (
                <span>No task selected</span>
              )}
            </div>
          </section>

          <section className="pomodoro-card pomodoro-session-card">
            <h3>This browser session</h3>
            <div className="pomodoro-session-count">
              <strong>{timer.completedFocusSessions}</strong>
              <span>completed focus {timer.completedFocusSessions === 1 ? 'session' : 'sessions'}</span>
            </div>
            <p>Kept only in this browser tab session; it is not permanent or synced history.</p>
          </section>

          {timer.shouldSuggestLongBreak && timer.mode !== 'longBreak' && (
            <section className="pomodoro-suggestion" aria-live="polite">
              <strong>Four focus sessions complete. Ready for a long break?</strong>
              <div>
                <button type="button" onClick={startSuggestedLongBreak}>
                  Start long break
                </button>
                <button
                  type="button"
                  className="pomodoro-suggestion-dismiss"
                  onClick={() => dispatch({ type: 'dismiss-long-break' })}
                >
                  Not now
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>

      <p className="pomodoro-completion" role="status" aria-live="polite">
        {timer.status === 'completed'
          ? `${TIMER_MODES[timer.lastCompletedMode].label} session complete. Take a moment before choosing what’s next.`
          : ''}
      </p>
    </section>
  );
}

export default PomodoroTimer;
