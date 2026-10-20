import React, { useState } from 'react'
import Header from './Header'

function App() {
  // 1. State banayi text box ke text ko live save karne ke liye
  const [taskInput, setTaskInput] = useState("");

  // 2. State banayi todos ki list ko array form mein save karne ke liye
  const [todos, setTodos] = useState([
    { id: 1, text: "React basics seekhna hai" },
    { id: 2, text: "MongoDB se jodhna hai" }
  ]);

  // 3. Naya todo list mein add karne ka function
  const handleAddTask = () => {
    if (!taskInput) return; // Agar box khali hai toh kuch mat karo

    const newTodo = {
      id: Date.now(), // Unique ID generation
      text: taskInput
    };

    setTodos([...todos, newTodo]); // Purane todos ke sath naya todo joda
    setTaskInput(""); // Add karne ke baad text box ko wapas khali kar diya
  };

  return (
    <div>
      <Header />

      <div style={{ maxWidth: '400px', margin: '40px auto', textAlgin: 'center', fontFamily: 'Arial' }}>
        <h3>Naya Task Jodein</h3>

        {/* value={taskInput} aur onChange se box ka text live hook ho gaya */}
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

        {/* Humne `.map()` ka use karke pure database array ko HTML list mein badal diya */}
        <ul style={{ listStyle: 'none', padding: '0', marginTop: '20px', textAlign: 'left' }}>
          {todos.map((todo) => (
            <li key={todo.id} style={{ padding: '10px', background: '#f8f9fa', marginBottom: '5px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
              {todo.text}
            </li>
          ))}
        </ul>

      </div>
    </div>
  )
}

export default App

