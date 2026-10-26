import { useState } from 'react';
import './KanbanBoard.css';

const COLUMNS = [
  { id: 'todo', title: 'To Do', description: 'Ready to get started' },
  { id: 'inProgress', title: 'In Progress', description: 'Work underway' },
  { id: 'completed', title: 'Completed', description: 'Finished tasks' },
];

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const recurrenceLabel = (value) =>
  ({ daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' })[value] || '';

const getTaskStatus = (todo) => {
  if (todo.isCompleted || todo.status === 'completed') return 'completed';
  return todo.status === 'inProgress' ? 'inProgress' : 'todo';
};

function KanbanBoard({ todos, isOverdue, updatingIds, onStatusChange, onEdit, onDelete }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const handleDrop = (event, status) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggedId;
    setDropTarget(null);
    setDraggedId(null);
    if (taskId) onStatusChange(taskId, status);
  };

  return (
    <section className="kanban-board" aria-label="Kanban board">
      <header className="kanban-header">
        <div>
          <h3 className="kanban-heading">Kanban Board</h3>
          <p className="kanban-subtitle">
            Move tasks through your workflow. Drag cards or use the status menu.
          </p>
        </div>
      </header>
      <div className="kanban-columns">
        {COLUMNS.map((column) => {
          const columnTasks = todos.filter(
            (todo) => getTaskStatus(todo) === column.id
          );
          const isActiveDropTarget = dropTarget === column.id;
          return (
            <section
              className={`kanban-column${isActiveDropTarget ? ' kanban-column-drop-target' : ''}`}
              key={column.id}
              aria-labelledby={`kanban-${column.id}-heading`}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                setDropTarget(column.id);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setDropTarget(null);
                }
              }}
              onDrop={(event) => handleDrop(event, column.id)}
            >
              <header className="kanban-column-header">
                <div className="kanban-column-title-wrap">
                  <span className={`kanban-column-marker kanban-marker-${column.id}`} />
                  <div>
                    <h4 id={`kanban-${column.id}-heading`}>{column.title}</h4>
                    <p>{column.description}</p>
                  </div>
                </div>
                <span className="kanban-count" aria-label={`${columnTasks.length} tasks`}>
                  {columnTasks.length}
                </span>
              </header>
              <div className="kanban-card-list">
                {columnTasks.length === 0 ? (
                  <div className="kanban-empty-state">
                    <span aria-hidden="true">＋</span>
                    <p>No tasks here yet</p>
                    <small>Drop a task in this column</small>
                  </div>
                ) : (
                  columnTasks.map((todo) => {
                    const status = getTaskStatus(todo);
                    const isSaving = updatingIds.has(todo._id);
                    const overdue = status !== 'completed' && isOverdue(todo);
                    return (
                      <article
                        className={`kanban-card${draggedId === todo._id ? ' kanban-card-dragging' : ''}${isSaving ? ' kanban-card-saving' : ''}`}
                        key={todo._id}
                        draggable={!isSaving}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/plain', todo._id);
                          setDraggedId(todo._id);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDropTarget(null);
                        }}
                      >
                        <div className="kanban-card-topline">
                          <span className={`kanban-priority kanban-priority-${(todo.priority || 'Medium').toLowerCase()}`}>
                            {todo.priority || 'Medium'}
                          </span>
                          {status === 'completed' ? (
                            <span className="kanban-task-status kanban-completed-status">Completed</span>
                          ) : overdue ? (
                            <span className="kanban-task-status kanban-overdue-status">Overdue</span>
                          ) : null}
                        </div>
                        <h5 className={status === 'completed' ? 'kanban-card-title-completed' : ''}>
                          {todo.task}
                        </h5>
                        {todo.description && (
                          <p className="kanban-card-description">{todo.description}</p>
                        )}
                        <div className="kanban-card-meta">
                          {todo.category && <span>{todo.category}</span>}
                          {todo.dueDate && (
                            <span className={overdue ? 'kanban-due-overdue' : ''}>
                              Due {formatDate(todo.dueDate)}
                            </span>
                          )}
                          {todo.recurrence && todo.recurrence !== 'none' && (
                            <span>Repeats {recurrenceLabel(todo.recurrence)}</span>
                          )}
                        </div>
                        <div className="kanban-card-actions">
                          <label className="kanban-status-control">
                            <span className="visually-hidden">Move {todo.task} to</span>
                            <select
                              aria-label={`Move ${todo.task} to`}
                              value={status}
                              disabled={isSaving}
                              onChange={(event) => onStatusChange(todo._id, event.target.value)}
                            >
                              {COLUMNS.map((option) => (
                                <option value={option.id} key={option.id}>{option.title}</option>
                              ))}
                            </select>
                          </label>
                          {isSaving ? (
                            <span className="kanban-saving" role="status">
                              <span className="kanban-spinner" /> Saving
                            </span>
                          ) : (
                            <div className="kanban-card-buttons">
                              <button type="button" onClick={() => onEdit(todo)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="kanban-delete-button"
                                onClick={() => onDelete(todo._id)}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default KanbanBoard;
