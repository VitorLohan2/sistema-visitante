// src/components/RippleButton.jsx
import React, { useRef } from 'react';
import './RippleButton.css';

export default function RippleButton({ children, onClick, className = '', ...props }) {
  const buttonRef = useRef(null);

  function createRipple(event) {
    const button = buttonRef.current;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect(); // MELHOR PRECISÃO
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) existingRipple.remove();

    button.appendChild(circle);
  }

  return (
    <button
      ref={buttonRef}
      className={`ripple-button ${className}`}
      onClick={(e) => {
        createRipple(e);
        if (onClick) onClick(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

