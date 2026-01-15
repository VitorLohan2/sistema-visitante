import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./styles.css";
import {
  FiSearch,
  FiMessageCircle,
  FiKey,
  FiShield,
  FiChevronRight,
  FiHelpCircle,
  FiStar,
} from "react-icons/fi";
import { AiOutlineWhatsApp } from "react-icons/ai";
import logoImg from "../../assets/logo.svg";

export default function HelpDesk() {
  const [searchValue, setSearchValue] = useState("");
  const [hoveredCard, setHoveredCard] = useState(null);

  const suggestedQuestions = [
    "Como faço para cadastrar?",
    "Como faço para seguir com a triagem de visitantes?",
    "Como faço para bipar crachá no aplicativo?",
    "Como faço para recuperar id?",
  ];

  return (
    <div className="helpdesk-container">
      {/* Background decorative elements */}
      <div className="background-decorations">
        <div className="decoration decoration-1"></div>
        <div className="decoration decoration-2"></div>
        <div className="decoration decoration-3"></div>
      </div>

      {/* Logo Section */}
      <div className="logo-section">
        <img src={logoImg} alt="Logo" className="helpdesk-logo" />
        <div className="logo-shine"></div>
      </div>

      {/* Header Section */}
      <header className="helpdesk-header">
        <div className="header-content">
          <h1 className="main-title">
            Em que podemos
            <br />
            <span className="title-highlight">
              ajudar você?
              <div className="title-underline"></div>
            </span>
          </h1>

          {/* Search Box */}
          <div className="search-containerHelp">
            <div className="search-boxHelp">
              <FiSearch className="search-iconHelp" size={24} />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Digite sua dúvida aqui..."
                className="search-inputHelpdesk"
              />
              <button className="search-buttonHelp">Buscar</button>
            </div>
          </div>

          {/* Suggested Questions */}
          <div className="suggested-questions-container">
            <div className="suggested-header">
              <FiHelpCircle className="suggested-icon" size={24} />
              <h3>Perguntas Frequentes</h3>
            </div>
            <div className="questions-grid">
              {suggestedQuestions.map((question, index) => (
                <button key={index} className="question-button">
                  <span className="question-text">{question}</span>
                  <FiChevronRight className="question-arrow" size={18} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Category Cards */}
      <main className="helpdesk-categories">
        <h2 className="categories-title">Escolha uma opção de suporte</h2>

        <div className="categories-grid">
          <div
            className="category-card whatsapp-card"
            onMouseEnter={() => setHoveredCard(1)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-background-overlay"></div>
            <div className="card-decoration"></div>
            <div className="card-content">
              <div className="card-icon whatsapp-icon">
                <FiMessageCircle size={32} />
              </div>
              <h3>Suporte WhatsApp</h3>
              <p>Atendimento 14:00 às 23:59</p>
              <div className="card-action">
                <span>Acessar</span>
                <FiChevronRight
                  className={`action-arrow ${hoveredCard === 1 ? "moved" : ""}`}
                  size={20}
                />
              </div>
            </div>
          </div>

          <Link
            to="/recuperar-senha"
            className="category-card recover-card"
            onMouseEnter={() => setHoveredCard(2)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-background-overlay"></div>
            <div className="card-decoration"></div>
            <div className="card-content">
              <div className="card-icon recover-icon">
                <FiShield size={32} />
              </div>
              <h3>Recuperar Senha</h3>
              <p>E-mail & Data de nascimento</p>
              <div className="card-action">
                <span>Acessar</span>
                <FiChevronRight
                  className={`action-arrow ${hoveredCard === 2 ? "moved" : ""}`}
                  size={20}
                />
              </div>
            </div>
          </Link>

          <div
            className="category-card key-card"
            onMouseEnter={() => setHoveredCard(3)}
            onMouseLeave={() => setHoveredCard(null)}
          >
            <div className="card-background-overlay"></div>
            <div className="card-decoration"></div>
            <div className="card-content">
              <div className="card-icon key-icon">
                <FiKey size={32} />
              </div>
              <h3>TOKEN</h3>
              <p>Código de cadastro</p>
              <div className="card-action">
                <span>Acessar</span>
                <FiChevronRight
                  className={`action-arrow ${hoveredCard === 3 ? "moved" : ""}`}
                  size={20}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating WhatsApp Button */}
      <Link to="/contact" className="contact-button">
        <AiOutlineWhatsApp />
        <div className="contact-tooltip">Fale conosco</div>
      </Link>

      {/* Footer */}
      <footer className="helpdesk-footer">
        <div className="footer-content">
          <p>
            Sistema de visitante
            <span className="footer-brand"> Liberaê 1.0</span>
            <span className="footer-badge">Beta</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
