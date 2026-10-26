import { useMemo, useState } from 'react';
import './CalendarView.css';

const WEEKDAYS = [
  { label: 'Sunday', short: 'Sun' },
  { label: 'Monday', short: 'Mon' },
  { label: 'Tuesday', short: 'Tue' },
  { label: 'Wednesday', short: 'Wed' },
  { label: 'Thursday', short: 'Thu' },
  { label: 'Friday', short: 'Fri' },
  { label: 'Saturday', short: 'Sat' },
];
const PRIORITY_CLASS = {
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};
const INITIAL_TODAY = new Date();

const toDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toDueDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const formatDate = (dateKey) =>
  new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

function CalendarView({ todos, isOverdue, onEdit }) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    return new Date(INITIAL_TODAY.getFullYear(), INITIAL_TODAY.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateKey(INITIAL_TODAY)
  );
  const [todayKey, setTodayKey] = useState(() => toDateKey(INITIAL_TODAY));

  const tasksByDate = useMemo(() => {
    const grouped = new Map();
    todos.forEach((todo) => {
      const dateKey = toDueDateKey(todo.dueDate);
      if (!dateKey) return;
      const tasks = grouped.get(dateKey) || [];
      tasks.push(todo);
      grouped.set(dateKey, tasks);
    });
    return grouped;
  }, [todos]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1
    );
    const gridStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - firstDay.getDay()
    );
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );
      const dateKey = toDateKey(date);
      return {
        date,
        dateKey,
        inMonth: date.getMonth() === visibleMonth.getMonth(),
        tasks: tasksByDate.get(dateKey) || [],
      };
    });
  }, [visibleMonth, tasksByDate]);

  const selectedTasks = tasksByDate.get(selectedDate) || [];
  const undatedTaskCount = todos.filter((todo) => !todo.dueDate).length;

  const moveMonth = (offset) => {
    const nextMonth = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth() + offset,
      1
    );
    setVisibleMonth(nextMonth);
    setSelectedDate(toDateKey(nextMonth));
  };

  const goToToday = () => {
    const today = new Date();
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    const dateKey = toDateKey(today);
    setTodayKey(dateKey);
    setSelectedDate(dateKey);
  };

  const selectDate = (date) => {
    if (date.getMonth() !== visibleMonth.getMonth()) {
      setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
    setSelectedDate(toDateKey(date));
  };

  const getTaskStatus = (todo) => {
    if (todo.isCompleted || todo.status === 'completed') return 'completed';
    return isOverdue(todo) ? 'overdue' : 'pending';
  };

  return (
    <section className="calendar-view" aria-label="Task calendar">
      <div className="calendar-toolbar">
        <div>
          <h3 className="calendar-heading">Calendar</h3>
          <p className="calendar-subtitle">
            See your tasks and deadlines at a glance.
          </p>
        </div>
        <div className="calendar-navigation" aria-label="Calendar navigation">
          <button
            type="button"
            className="calendar-nav-button calendar-today-button"
            onClick={goToToday}
          >
            Today
          </button>
          <button
            type="button"
            className="calendar-nav-button calendar-arrow-button"
            onClick={() => moveMonth(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <h4 className="calendar-month-label" aria-live="polite">
            {visibleMonth.toLocaleDateString(undefined, {
              month: 'long',
              year: 'numeric',
            })}
          </h4>
          <button
            type="button"
            className="calendar-nav-button calendar-arrow-button"
            onClick={() => moveMonth(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid" role="grid" aria-label="Monthly calendar">
        {WEEKDAYS.map(({ label, short }) => (
          <div className="calendar-weekday" role="columnheader" key={short}>
            <span className="calendar-weekday-long">{label}</span>
            <span className="calendar-weekday-short">{short}</span>
          </div>
        ))}
        {calendarDays.map(({ date, dateKey, inMonth, tasks }) => {
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          return (
            <button
              key={dateKey}
              type="button"
              role="gridcell"
              aria-label={`${formatDate(dateKey)}${tasks.length ? `, ${tasks.length} task${tasks.length === 1 ? '' : 's'}` : ', no tasks'}`}
              aria-pressed={isSelected}
              className={[
                'calendar-day',
                !inMonth && 'calendar-day-outside',
                isToday && 'calendar-day-today',
                isSelected && 'calendar-day-selected',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => selectDate(date)}
            >
              <span className="calendar-day-number">{date.getDate()}</span>
              <span className="calendar-day-tasks" aria-hidden="true">
                {tasks.map((todo) => (
                  <span
                    key={todo._id}
                    className={`calendar-task-chip calendar-task-${getTaskStatus(todo)}`}
                    title={`${todo.task} · ${getTaskStatus(todo)}`}
                  >
                    <span className="calendar-task-dot" />
                    <span className="calendar-task-title">{todo.task}</span>
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="calendar-legend" aria-label="Task status legend">
        <span><i className="legend-dot legend-completed" />Completed</span>
        <span><i className="legend-dot legend-pending" />Pending</span>
        <span><i className="legend-dot legend-overdue" />Overdue</span>
      </div>

      {undatedTaskCount > 0 && (
        <p className="calendar-undated-note">
          {undatedTaskCount} task{undatedTaskCount === 1 ? '' : 's'} without a due
          date {undatedTaskCount === 1 ? 'is' : 'are'} not shown on the calendar.
        </p>
      )}

      <section className="calendar-day-details" aria-live="polite">
        <div className="calendar-details-heading">
          <div>
            <h4>{formatDate(selectedDate)}</h4>
            <p>
              {selectedTasks.length
                ? `${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} scheduled`
                : 'No tasks scheduled for this date.'}
            </p>
          </div>
        </div>
        {selectedTasks.length > 0 && (
          <ul className="calendar-details-list">
            {selectedTasks.map((todo) => {
              const status = getTaskStatus(todo);
              return (
                <li className={`calendar-detail-card calendar-detail-${status}`} key={todo._id}>
                  <div className="calendar-detail-copy">
                    <strong className={todo.isCompleted ? 'calendar-task-complete' : ''}>
                      {todo.task}
                    </strong>
                    <div className="calendar-detail-meta">
                      <span className={`calendar-priority calendar-priority-${PRIORITY_CLASS[todo.priority] || 'medium'}`}>
                        {todo.priority || 'Medium'} priority
                      </span>
                      <span>{todo.category || 'Personal'}</span>
                      <span className={`calendar-status calendar-status-${status}`}>
                        {status === 'completed'
                          ? 'Completed'
                          : status === 'overdue'
                            ? 'Overdue'
                            : 'Pending'}
                      </span>
                      {todo.dueDate && (
                        <span>Due {formatDate(toDueDateKey(todo.dueDate))}</span>
                      )}
                      {todo.recurrence && todo.recurrence !== 'none' && (
                        <span>
                          Repeats {todo.recurrence.charAt(0).toUpperCase() + todo.recurrence.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="calendar-edit-button"
                    onClick={() => onEdit(todo)}
                  >
                    Edit task
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

export default CalendarView;
