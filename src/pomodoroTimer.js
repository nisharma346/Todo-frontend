export const TIMER_MODES = {
  focus: { label: 'Focus', durationMs: 25 * 60 * 1000 },
  shortBreak: { label: 'Short Break', durationMs: 5 * 60 * 1000 },
  longBreak: { label: 'Long Break', durationMs: 15 * 60 * 1000 },
};

export const createInitialTimerState = (sessionStats = {}) => ({
  mode: 'focus',
  status: 'idle',
  remainingMs: TIMER_MODES.focus.durationMs,
  deadline: null,
  completedFocusSessions:
    Number.isSafeInteger(sessionStats.completedFocusSessions) &&
    sessionStats.completedFocusSessions >= 0
      ? sessionStats.completedFocusSessions
      : 0,
  focusSessionsSinceLongBreak:
    Number.isSafeInteger(sessionStats.focusSessionsSinceLongBreak) &&
    sessionStats.focusSessionsSinceLongBreak >= 0
      ? sessionStats.focusSessionsSinceLongBreak
      : 0,
  shouldSuggestLongBreak: sessionStats.shouldSuggestLongBreak === true,
  completionCount: 0,
  lastCompletedMode: null,
});

const completeTimer = (state) => {
  const focusSessionsSinceLongBreak =
    state.mode === 'focus'
      ? state.focusSessionsSinceLongBreak + 1
      : state.mode === 'longBreak'
        ? 0
        : state.focusSessionsSinceLongBreak;

  return {
    ...state,
    status: 'completed',
    remainingMs: 0,
    deadline: null,
    completedFocusSessions:
      state.completedFocusSessions + (state.mode === 'focus' ? 1 : 0),
    focusSessionsSinceLongBreak,
    shouldSuggestLongBreak:
      state.mode === 'focus'
        ? focusSessionsSinceLongBreak >= 4
        : state.mode === 'longBreak'
          ? false
          : state.shouldSuggestLongBreak,
    completionCount: state.completionCount + 1,
    lastCompletedMode: state.mode,
  };
};

export function timerReducer(state, action) {
  switch (action.type) {
    case 'start':
      if (state.status !== 'idle' || state.remainingMs <= 0) return state;
      return {
        ...state,
        status: 'running',
        deadline: action.now + state.remainingMs,
      };
    case 'pause': {
      if (state.status !== 'running') return state;
      const remainingMs = Math.max(0, state.deadline - action.now);
      return remainingMs === 0
        ? completeTimer(state)
        : { ...state, status: 'paused', remainingMs, deadline: null };
    }
    case 'resume':
      if (state.status !== 'paused') return state;
      return {
        ...state,
        status: 'running',
        deadline: action.now + state.remainingMs,
      };
    case 'tick':
      if (state.status !== 'running') return state;
      if (state.deadline <= action.now) return completeTimer(state);
      return {
        ...state,
        remainingMs: state.deadline - action.now,
      };
    case 'reset':
      return {
        ...state,
        status: 'idle',
        remainingMs: TIMER_MODES[state.mode].durationMs,
        deadline: null,
      };
    case 'switch-mode':
      if (!TIMER_MODES[action.mode]) return state;
      return {
        ...state,
        mode: action.mode,
        status: 'idle',
        remainingMs: TIMER_MODES[action.mode].durationMs,
        deadline: null,
      };
    case 'dismiss-long-break':
      return {
        ...state,
        focusSessionsSinceLongBreak: 0,
        shouldSuggestLongBreak: false,
      };
    default:
      return state;
  }
}

export function formatTimerTime(milliseconds) {
  const totalSeconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
