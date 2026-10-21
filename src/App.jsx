import React, { useState, useEffect } from 'react'
import Header from './Header'

function App() {
  const [taskInput, setTaskInput] = useState("");
  const [todos, setTodos] = useState([]);

  const BACKEND_URL = 'http://localhost:3000/api/todos';

  const fetchTodos = async () => {
    try {
      const res = await fetch(BACKEND_URL);
      const data = await res.json();
      setTodos(data);
    } catch (error) {
      console.error("Data laane mein error aaya:", error);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const handleAddTask = async () => {
    if (!taskInput) return;

    try {
      await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput })
      });
      setTaskInput("");
      fetchTodos();
    } catch (error) {
      console.error("Task add karne mein error aaya:", error);
    }
  };

  return (
    <div>
      <Header />

      <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center', fontFamily: 'Arial' }}>
        <h3>Naya Task Jodein (Live MongoDB DB)</h3>

        <input
          type="text"
          placeholder="Yahan task likho..."
          style={{ width: '70%', padding: '10px', marginRight: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
        />

        <button
          style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          onClick={handleAddTask}
        >
          Add
        </button>

        <ul style={{ listStyle: 'none', padding: '0', marginTop: '20px', textAlign: 'left' }}>
          {todos.map((todo) => (
            <li key={todo._id} style={{ padding: '10px', background: '#f8f9fa', marginBottom: '5px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
              {todo.task}
            </li>
          ))}
        </ul>

      </div>
    </div>
  )
}

export default App
