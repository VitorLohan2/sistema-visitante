import React from 'react';
import { Link } from 'react-router-dom';
import './styles.css';
import { FiSearch } from 'react-icons/fi';
import { AiOutlineWhatsApp } from "react-icons/ai";
import logoImg from '../../assets/logo.svg';

import cyberSecurity from '../../assets/cyber_security.png';
import passwordUpdate from '../../assets/password_update.png';
import whatsapp from '../../assets/whatsapp.png';

export default function HelpDesk() {
  return (
    <div className="helpdesk-container">
        <div className="logo-row">
        <img src={logoImg} alt="Logo" width="350px" className="helpdesk-logo"/>        
        </div>
      <header className="helpdesk-header">
        <h1>Em que podemos ajudar você?</h1>
        <div className="search-box">
          <input type="text" placeholder="Digite aqui..." />
          <FiSearch size={18} />
        </div>
        <div className="suggested-questions">
          <p>Perguntas sugeridas</p>
          <ul>
            <li><a href="#">Como faço para cadastrar?</a></li>
            <li><a href="#">Como faço para seguir com a triagem de visitantes?</a></li>
            <li><a href="#">Como faço para bipar crachá no aplicativo?</a></li>
            <li><a href="#">Como faço para recuperar id?</a></li>
          </ul>
        </div>
      </header>

      <main className="helpdesk-categories">
        <div className="category-card">
          <img src={whatsapp} alt="Whatsapp" width="150px" className="whatsappicon"/>
          <h3>Suporte Whatsapp</h3>
          <p>Atendimento 14:00 às 23:59</p>
        </div>

        <Link to="/recuperar-id" className="category-card">
          <img src={passwordUpdate} alt="Password Update" width="150px" className="passwordUpdateicon"/>
          <h3>Recuperar ID</h3>
          <p>E-mail & Data de nascimento</p>
        </Link>

        <div className="category-card">
          <img src={cyberSecurity} alt="Cyber Security" width="150px" className="cyberSecurityicon"/>
          <h3>CHAVE</h3>
          <p>Código de cadastro</p>
        </div>
      </main>

      <Link to="/contact" className="contact-button">
      <AiOutlineWhatsApp />
        Whatsapp
      </Link>

      <footer className="helpdesk-footer">
        Sistema de visitante Liberaê 1.0 (Beta)
      </footer>
    </div>
  );
}