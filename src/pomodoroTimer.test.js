import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createInitialTimerState,
  formatTimerTime,
  TIMER_MODES,
  timerReducer,
} from './pomodoroTimer.js';

const dispatch = (state, type, details = {}) =>
  timerReducer(state, { type, ...details });

test('start, pause, and resume preserve the deadline-based remaining duration', () => {
  let state = createInitialTimerState();
  state = dispatch(state, 'start', { now: 1000 });
  assert.equal(state.deadline, 1000 + TIMER_MODES.focus.durationMs);
  assert.equal(state.status, 'running');

  state = dispatch(state, 'pause', { now: 11_000 });
  assert.equal(state.status, 'paused');
  assert.equal(state.remainingMs, TIMER_MODES.focus.durationMs - 10_000);
  assert.equal(state.deadline, null);

  state = dispatch(state, 'resume', { now: 50_000 });
  assert.equal(state.status, 'running');
  assert.equal(state.deadline, 50_000 + state.remainingMs);
});

test('reset does not count an interrupted focus session', () => {
  let state = dispatch(createInitialTimerState(), 'start', { now: 0 });
  state = dispatch(state, 'reset');
  assert.equal(state.status, 'idle');
  assert.equal(state.remainingMs, TIMER_MODES.focus.durationMs);
  assert.equal(state.completedFocusSessions, 0);
  assert.equal(state.completionCount, 0);
});

test('switching modes stops the timer and loads the selected duration', () => {
  let state = dispatch(createInitialTimerState(), 'start', { now: 100 });
  state = dispatch(state, 'switch-mode', { mode: 'shortBreak' });
  assert.equal(state.status, 'idle');
  assert.equal(state.mode, 'shortBreak');
  assert.equal(state.remainingMs, TIMER_MODES.shortBreak.durationMs);
  assert.equal(state.deadline, null);
});

test('late background ticks complete once using the deadline, not tick count', () => {
  let state = dispatch(createInitialTimerState(), 'start', { now: 1000 });
  const deadline = state.deadline;
  state = dispatch(state, 'tick', { now: deadline + 60_000 });

  assert.equal(state.status, 'completed');
  assert.equal(state.remainingMs, 0);
  assert.equal(state.completedFocusSessions, 1);
  assert.equal(state.completionCount, 1);

  state = dispatch(state, 'tick', { now: deadline + 120_000 });
  assert.equal(state.completedFocusSessions, 1);
  assert.equal(state.completionCount, 1);
});

test('four completed focus sessions suggest a long break; completing it resets the streak', () => {
  let state = createInitialTimerState();

  for (let index = 0; index < 4; index += 1) {
    state = dispatch(state, 'start', { now: index * 2_000_000 });
    state = dispatch(state, 'tick', { now: state.deadline });
    if (index < 3) state = dispatch(state, 'reset');
  }

  assert.equal(state.completedFocusSessions, 4);
  assert.equal(state.shouldSuggestLongBreak, true);
  assert.equal(state.focusSessionsSinceLongBreak, 4);

  state = dispatch(state, 'switch-mode', { mode: 'longBreak' });
  state = dispatch(state, 'start', { now: 10_000_000 });
  state = dispatch(state, 'tick', { now: state.deadline });
  assert.equal(state.focusSessionsSinceLongBreak, 0);
  assert.equal(state.shouldSuggestLongBreak, false);
});

test('time display is nonnegative and uses MM:SS formatting', () => {
  assert.equal(formatTimerTime(25 * 60 * 1000), '25:00');
  assert.equal(formatTimerTime(61_001), '01:02');
  assert.equal(formatTimerTime(-1), '00:00');
});

test('current-session counts can be restored and invalid stored values are ignored', () => {
  const restored = createInitialTimerState({
    completedFocusSessions: 6,
    focusSessionsSinceLongBreak: 2,
    shouldSuggestLongBreak: true,
  });
  assert.equal(restored.completedFocusSessions, 6);
  assert.equal(restored.focusSessionsSinceLongBreak, 2);
  assert.equal(restored.shouldSuggestLongBreak, true);

  const invalid = createInitialTimerState({
    completedFocusSessions: -1,
    focusSessionsSinceLongBreak: '4',
    shouldSuggestLongBreak: 'true',
  });
  assert.equal(invalid.completedFocusSessions, 0);
  assert.equal(invalid.focusSessionsSinceLongBreak, 0);
  assert.equal(invalid.shouldSuggestLongBreak, false);
});
