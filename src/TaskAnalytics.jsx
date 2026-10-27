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

const priorityColors = { High: '#dc3545', Medium: '#e3a008', Low: '#198754' };

function TaskAnalytics({
  stats,
  completionPercentage,
  statusChartData,
  priorityChartData,
  categoryChartData,
}) {
  return (
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
                <Bar dataKey="tasks" name="Tasks" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((entry) => (
                    <Cell key={entry.priority} fill={priorityColors[entry.priority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="priority-legend">
            {priorityChartData.map((entry) => (
              <span key={entry.priority}>
                <i style={{ backgroundColor: priorityColors[entry.priority] }} />
                {entry.priority}: {entry.tasks}
              </span>
            ))}
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
  );
}

export default TaskAnalytics;
