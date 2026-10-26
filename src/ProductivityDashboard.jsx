import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import './ProductivityDashboard.css';

function ProductivityDashboard({
  stats,
  loading,
  error,
  onSaveGoal,
}) {
  const [goalInput, setGoalInput] = useState(null);
  const [goalError, setGoalError] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);

  const saveGoal = async (event) => {
    event.preventDefault();
    const goal = Number(goalInput ?? stats?.dailyGoal ?? 5);
    if (!Number.isInteger(goal) || goal < 1 || goal > 100) {
      setGoalError('Choose a whole number from 1 to 100.');
      return;
    }

    setSavingGoal(true);
    setGoalError('');
    try {
      await onSaveGoal(goal);
      setGoalInput(null);
    } catch (saveError) {
      setGoalError(saveError.message);
    } finally {
      setSavingGoal(false);
    }
  };

  const completedToday = stats?.completedToday || 0;
  const dailyGoal = stats?.dailyGoal || 5;
  const goalProgress = Math.min(100, Math.round((completedToday / dailyGoal) * 100));
  const weeklyDays = stats?.weekly?.days || [];

  return (
    <section className="productivity-page" aria-labelledby="productivity-heading">
      <header className="productivity-header">
        <div>
          <p className="productivity-eyebrow">YOUR MOMENTUM</p>
          <h2 id="productivity-heading">Productivity</h2>
          <p>Build steady habits, celebrate progress, and plan your week.</p>
        </div>
        {loading && <span className="productivity-loading" role="status">Refreshing progress…</span>}
      </header>

      {error && <p className="productivity-error" role="alert">{error}</p>}

      <div className="productivity-stat-grid">
        <article className="productivity-stat-card">
          <span className="productivity-stat-icon" aria-hidden="true">🔥</span>
          <div><strong>{stats?.currentStreak ?? '—'}</strong><span>Current streak</span></div>
          <small>consecutive days</small>
        </article>
        <article className="productivity-stat-card">
          <span className="productivity-stat-icon" aria-hidden="true">🏆</span>
          <div><strong>{stats?.longestStreak ?? '—'}</strong><span>Longest streak</span></div>
          <small>consecutive days</small>
        </article>
        <article className="productivity-stat-card">
          <span className="productivity-stat-icon" aria-hidden="true">✓</span>
          <div><strong>{stats?.totalCompleted ?? '—'}</strong><span>Verified completions</span></div>
          <small>recorded by the server</small>
        </article>
      </div>

      <div className="productivity-content-grid">
        <section className="productivity-panel daily-goal-panel" aria-labelledby="daily-goal-heading">
          <div className="productivity-panel-heading">
            <div>
              <h3 id="daily-goal-heading">Daily goal</h3>
              <p>Completed tasks today compared with your target.</p>
            </div>
            <span className="daily-goal-count">{completedToday} <i>/</i> {dailyGoal}</span>
          </div>
          <div
            className="daily-goal-progress-track"
            role="progressbar"
            aria-label="Daily task goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={goalProgress}
          >
            <span style={{ width: `${goalProgress}%` }} />
          </div>
          <p className="daily-goal-message">
            {completedToday >= dailyGoal
              ? `Daily goal reached! ${completedToday} task${completedToday === 1 ? '' : 's'} completed. Keep going if you like.`
              : `${dailyGoal - completedToday} more task${dailyGoal - completedToday === 1 ? '' : 's'} to reach today's goal.`}
          </p>
          <form className="daily-goal-form" onSubmit={saveGoal}>
            <label htmlFor="daily-task-goal">Set a new daily goal</label>
            <div>
              <input
                id="daily-task-goal"
                type="number"
                min="1"
                max="100"
                step="1"
                required
                value={goalInput ?? String(stats?.dailyGoal ?? 5)}
                onChange={(event) => setGoalInput(event.target.value)}
              />
              <button type="submit" disabled={savingGoal || loading}>
                {savingGoal ? 'Saving…' : 'Save goal'}
              </button>
            </div>
            <small>Choose 1–100 tasks. Progress caps at 100%; extra completions still count.</small>
            {goalError && <span className="productivity-error" role="alert">{goalError}</span>}
          </form>
        </section>

        <section className="productivity-panel weekly-summary-panel" aria-labelledby="weekly-summary-heading">
          <div className="productivity-panel-heading">
            <div>
              <h3 id="weekly-summary-heading">This week</h3>
              <p>{stats?.weekly?.completed || 0} task completions this local calendar week</p>
            </div>
            <span className="weekly-summary-total">{stats?.weekly?.completed || 0}</span>
          </div>
          <div className="weekly-chart">
            {weeklyDays.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyDays} margin={{ top: 8, right: 6, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'var(--productivity-chart-text)', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    width={38}
                    tick={{ fill: 'var(--productivity-chart-text)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}`, 'Completions']}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.date || label
                    }
                  />
                  <Bar dataKey="count" name="Completions" fill="#5268c7" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="productivity-empty">Your weekly summary will appear here.</p>
            )}
          </div>
        </section>
      </div>

      <section className="productivity-panel achievements-panel" aria-labelledby="achievements-heading">
        <div className="productivity-panel-heading">
          <div>
            <h3 id="achievements-heading">Achievements</h3>
            <p>Badges unlock from completion and streak records stored by the server.</p>
          </div>
        </div>
        {stats?.achievements?.some((achievement) => achievement.unlocked) ? (
          <div className="achievement-grid">
            {stats.achievements.map((achievement) => (
              <article
                className={`achievement-card${achievement.unlocked ? ' unlocked' : ' locked'}`}
                key={achievement.id}
              >
                <span className="achievement-mark" aria-hidden="true">
                  {achievement.unlocked ? '✦' : '◇'}
                </span>
                <div>
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                  <small>{achievement.unlocked ? 'Unlocked' : 'Locked'}</small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="productivity-empty achievement-empty">
            {stats?.achievements
              ? 'Complete a task to start earning your first achievement.'
              : 'Achievement progress will appear when verified completion data is available.'}
          </div>
        )}
        {stats?.achievements?.length > 0 && !stats.achievements.some((achievement) => achievement.unlocked) && (
          <div className="achievement-grid achievement-locked-grid">
            {stats.achievements.map((achievement) => (
              <article className="achievement-card locked" key={achievement.id}>
                <span className="achievement-mark" aria-hidden="true">◇</span>
                <div>
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                  <small>Locked</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="productivity-footnote">
        Streak days and weekly totals use your browser’s local time zone; the week runs Monday through Sunday, and yesterday’s streak stays current until today ends.
        {' '}
        Productivity records start when server-side completion timestamps are introduced. Older completed tasks without verifiable timestamps are not counted.
        {' '}Pomodoro focus-session badges are deferred because those counts are currently browser-session only.
      </p>
    </section>
  );
}

export default ProductivityDashboard;
