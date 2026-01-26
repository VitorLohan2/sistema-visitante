// src/components/ModalCracha.js
import React, { useRef } from "react";
import { FiX, FiPrinter } from "react-icons/fi";
import logo from "../assets/logo.svg";
import "../styles/ModalCracha.css";

export default function ModalCracha({ visible, onClose, badgeData }) {
  const printRef = useRef(null);

  if (!visible || !badgeData) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "PRINT", "height=600,width=400");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Crachá de Visitante</title>
          <style>
            /* Reset e configuração para etiqueta Honeywell */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: 60mm 40mm;
              margin: 0;
            }
            
            @media print {
              html, body {
                width: 60mm;
                height: 40mm;
                margin: 0;
                padding: 0;
              }
            }
            
            body {
              font-family: Arial, Helvetica, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 60mm;
              height: 40mm;
              background: #fff;
            }
            
            .badge-print {
              width: 58mm;
              height: 38mm;
              padding: 2mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              border: 1px solid #000;
              border-radius: 2mm;
              background: #fff;
            }
            
            .badge-header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 2mm;
              width: 100%;
              padding-bottom: 1mm;
              border-bottom: 0.5px solid #ccc;
            }
            
            .badge-logo {
              width: 35.28mm;
              height: auto;
            }
            
            .badge-title {
              font-size: 8pt;
              font-weight: bold;
              color: #333;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-left: auto;
            }
            
            .badge-content {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              text-align: center;
              gap: 1mm;
            }
            
            .badge-nome {
              font-size: 10pt;
              font-weight: bold;
              color: #000;
              text-transform: uppercase;
              line-height: 1.1;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            
            .badge-empresa {
              font-size: 9pt;
              font-weight: 600;
              color: #333;
              text-transform: uppercase;
            }
            
            .badge-setor {
              font-size: 8pt;
              color: #555;
              font-weight: 500;
            }
            
            .badge-footer {
              width: 100%;
              padding-top: 0mm;
              border-top: 0.5px solid #ccc;
              text-align: center;
            }
            
            .badge-date {
              font-size: 6pt;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="badge-print">
            <div class="badge-header">
              <img src="${logo}" alt="Logo" class="badge-logo" onerror="this.style.display='none'" />
              <span class="badge-title">Visitante</span>
            </div>
            
            <div class="badge-content">
              <div class="badge-nome">${badgeData.nome || ""}</div>
              <div class="badge-empresa">${badgeData.empresa || ""}</div>
              <div class="badge-setor">${badgeData.setor || ""}</div>
            </div>
            
            <div class="badge-footer">
              <span class="badge-date">${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Aguarda o carregamento antes de imprimir
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const currentDate = new Date().toLocaleDateString("pt-BR");
  const currentTime = new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="modal-cracha-overlay" onClick={onClose}>
      <div
        className="modal-cracha-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-cracha-header">
          <h2>Crachá de Visitante</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {/* Preview do Crachá */}
        <div className="modal-cracha-body">
          <p className="preview-label">Pré-visualização do crachá:</p>

          <div className="badge-preview" ref={printRef}>
            <div className="badge-preview-header">
              <img src={logo} alt="Logo" className="badge-preview-logo" />
              <span className="badge-preview-title">VISITANTE</span>
            </div>

            <div className="badge-preview-content">
              <div className="badge-preview-nome">{badgeData.nome}</div>
              <div className="badge-preview-empresa">{badgeData.empresa}</div>
              <div className="badge-preview-setor">{badgeData.setor}</div>
            </div>

            <div className="badge-preview-footer">
              <span className="badge-preview-date">
                {currentDate} - {currentTime}
              </span>
            </div>
          </div>

          <div className="badge-info">
            <p>
              <strong>Tamanho:</strong> 60mm x 40mm (etiqueta padrão)
            </p>
            <p>
              <strong>Compatível com:</strong> Impressoras Honeywell e similares
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-cracha-footer">
          <button className="btn-primary" onClick={handlePrint}>
            <FiPrinter size={16} />
            Imprimir Crachá
          </button>
          <button className="btn-modal-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
