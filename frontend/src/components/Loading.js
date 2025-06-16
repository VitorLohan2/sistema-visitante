// components/Loading.js
import React from 'react';
import './Loading.css';

export default function Loading({ progress }) {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <h3>CARREGANDO...</h3>
        <div className="loading-bar">
          <div 
            className="loading-progress" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p>Por favor, aguarde ({progress}%)</p>
      </div>
    </div>
  );
}