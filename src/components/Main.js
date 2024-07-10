import React from 'react';
import { Link } from 'react-router-dom';
import './Main.css'; // optional, for styling

function Main() {
  return (
    <div className="main-container">
      <h1>Welcome to the Application</h1>
      <div className="buttons-container">
        <Link to="/login">
          <button className="main-button">Login</button>
        </Link>
        <Link to="/register">
          <button className="main-button">Register</button>
        </Link>
      </div>
    </div>
  );
}

export default Main;
