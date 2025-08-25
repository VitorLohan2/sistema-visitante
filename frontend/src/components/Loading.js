// components/Loading.js
import React from 'react';

import { FiCoffee } from "react-icons/fi";

const Loading = ({ progress = 0, message = 'Carregando...' }) => {
  return (
    <div className="loading-overlay">
      <div className="loading-container">
        {/* Logo ou título */}
        <div className="loading-header">
          <h2><FiCoffee/></h2>
        </div>
        
        {/* Spinner animado */}
        <div className="loading-spinner">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        
        {/* Barra de progresso */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>
        
        {/* Mensagem */}
        <p className="loading-message">{message}</p>
        
        {/* Pontos animados */}
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      
      <style jsx>{`
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .loading-container {
          text-align: center;
          padding: 3rem;
          border-radius: 20px;
          max-width: 400px;
          width: 90%;
          animation: slideUp 0.5s ease-out;
        }
        
        .loading-header h2 {
          color: #20e080ff;
          font-size: 2.5rem;
          font-weight: bold;
          margin: 0 0 2rem 0;
          letter-spacing: 2px;
          animation: pulse 2s infinite;
        }
        
        .loading-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 2rem auto;
        }
        
        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-top: 3px solid #19df65ff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        .spinner-ring:nth-child(1) {
          animation-delay: 0s;
        }
        
        .spinner-ring:nth-child(2) {
          width: 90%;
          height: 90%;
          top: 5%;
          left: 5%;
          border-top-color: #131313ff;
          animation-duration: 1.5s;
          animation-delay: -0.1s;
        }
        
        .spinner-ring:nth-child(3) {
          width: 80%;
          height: 80%;
          top: 10%;
          left: 10%;
          border-top-color: #19df65ff;
          animation-duration: 2s;
          animation-delay: -0.2s;
        }
        
        .progress-container {
          margin-bottom: 1.5rem;
        }
        
        .progress-bar {
          width: 100%;
          height: 8px;
          background: #f0f0f0;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 0.5rem;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #40e020ff, #66eaeaff);
          border-radius: 10px;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background-image: linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.2) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.2) 75%,
            transparent 75%,
            transparent
          );
          background-size: 20px 20px;
          animation: move 1s linear infinite;
        }
        
        .progress-text {
          font-size: 0.9rem;
          color: #666;
          font-weight: 600;
        }
        
        .loading-message {
          color: #333;
          font-size: 1.1rem;
          margin: 0 0 1rem 0;
          font-weight: 500;
        }
        
        .loading-dots {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
        }
        
        .loading-dots span {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #20e080ff;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        
        .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
        .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
        .loading-dots span:nth-child(3) { animation-delay: 0s; }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
        
        @keyframes move {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 20px 20px;
          }
        }
        
        /* Responsividade */
        @media (max-width: 480px) {
          .loading-container {
            padding: 2rem 1.5rem;
            margin: 1rem;
          }
          
          .loading-header h2 {
            font-size: 2rem;
          }
          
          .loading-spinner {
            width: 60px;
            height: 60px;
          }
        }
      `}</style>
    </div>
  );
};

export default Loading;