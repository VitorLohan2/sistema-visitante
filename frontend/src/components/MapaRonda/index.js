import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * COMPONENTE: MapaRonda
 * Exibe o trajeto de uma ronda usando Leaflet + OpenStreetMap (GRATUITO)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from "react";
import "./styles.css";

/**
 * Carrega os scripts do Leaflet dinamicamente
 */
const carregarLeaflet = () => {
  return new Promise((resolve, reject) => {
    // Verifica se já está carregado
    if (window.L) {
      resolve(window.L);
      return;
    }

    // Carrega CSS do Leaflet
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const linkCSS = document.createElement("link");
      linkCSS.rel = "stylesheet";
      linkCSS.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      linkCSS.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      linkCSS.crossOrigin = "";
      document.head.appendChild(linkCSS);
    }

    // Carrega JS do Leaflet
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

/**
 * Componente de Mapa para visualizar trajeto de ronda
 * @param {Object} props
 * @param {Array} props.trajeto - Array de coordenadas [{latitude, longitude}]
 * @param {Array} props.checkpoints - Array de checkpoints [{latitude, longitude, descricao, numero_sequencial}]
 * @param {Object} props.inicio - Ponto inicial {latitude, longitude}
 * @param {Object} props.fim - Ponto final {latitude, longitude}
 * @param {number} props.altura - Altura do mapa em pixels (default: 400)
 */
export default function MapaRonda({
  trajeto = [],
  checkpoints = [],
  inicio,
  fim,
  altura = 400,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const inicializarMapa = async () => {
      try {
        const L = await carregarLeaflet();

        if (!isMounted || !mapContainerRef.current) return;

        // Limpa mapa anterior se existir
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
        }

        // Calcula centro do mapa
        let centro = [-23.5505, -46.6333]; // São Paulo como fallback
        let zoom = 15;

        if (trajeto && trajeto.length > 0) {
          // Usa primeiro ponto do trajeto como centro
          centro = [trajeto[0].latitude, trajeto[0].longitude];
        } else if (inicio) {
          centro = [inicio.latitude, inicio.longitude];
        }

        // Cria o mapa
        const mapa = L.map(mapContainerRef.current).setView(centro, zoom);
        mapInstanceRef.current = mapa;

        // Adiciona camada do OpenStreetMap (GRATUITO)
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapa);

        // Ícones customizados
        const iconeInicio = L.divIcon({
          className: "marcador-inicio",
          html: '<div class="marcador-pin inicio"><span>▶</span></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const iconeFim = L.divIcon({
          className: "marcador-fim",
          html: '<div class="marcador-pin fim"><span>⏹</span></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });

        const iconeCheckpoint = (numero) =>
          L.divIcon({
            className: "marcador-checkpoint",
            html: `<div class="marcador-pin checkpoint"><span>${numero}</span></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 24],
          });

        // Array para calcular bounds
        const bounds = [];

        // Adiciona marcador de início
        if (inicio || (trajeto && trajeto.length > 0)) {
          const pontoInicio = inicio || trajeto[0];
          L.marker([pontoInicio.latitude, pontoInicio.longitude], {
            icon: iconeInicio,
          })
            .addTo(mapa)
            .bindPopup("<strong>Início da Ronda</strong>");
          bounds.push([pontoInicio.latitude, pontoInicio.longitude]);
        }

        // Adiciona marcador de fim
        if (fim || (trajeto && trajeto.length > 1)) {
          const pontoFim = fim || trajeto[trajeto.length - 1];
          L.marker([pontoFim.latitude, pontoFim.longitude], { icon: iconeFim })
            .addTo(mapa)
            .bindPopup("<strong>Fim da Ronda</strong>");
          bounds.push([pontoFim.latitude, pontoFim.longitude]);
        }

        // Adiciona checkpoints
        if (checkpoints && checkpoints.length > 0) {
          checkpoints.forEach((cp) => {
            if (cp.latitude && cp.longitude) {
              L.marker([cp.latitude, cp.longitude], {
                icon: iconeCheckpoint(cp.numero_sequencial || "•"),
              }).addTo(mapa).bindPopup(`
                  <strong>Checkpoint #${cp.numero_sequencial || ""}</strong>
                  ${cp.descricao ? `<br/>${cp.descricao}` : ""}
                  ${cp.data_hora ? `<br/><small>${new Date(cp.data_hora).toLocaleString("pt-BR")}</small>` : ""}
                `);
              bounds.push([cp.latitude, cp.longitude]);
            }
          });
        }

        // Desenha linha do trajeto
        if (trajeto && trajeto.length > 1) {
          const coordenadas = trajeto.map((p) => [p.latitude, p.longitude]);

          L.polyline(coordenadas, {
            color: "#2563eb",
            weight: 4,
            opacity: 0.8,
            smoothFactor: 1,
          }).addTo(mapa);

          // Adiciona todos os pontos aos bounds
          coordenadas.forEach((coord) => bounds.push(coord));
        }

        // Ajusta o zoom para mostrar todos os pontos
        if (bounds.length > 1) {
          mapa.fitBounds(bounds, { padding: [30, 30] });
        } else if (bounds.length === 1) {
          mapa.setView(bounds[0], 16);
        }
      } catch (error) {
        logger.error("Erro ao carregar mapa:", error);
      }
    };

    inicializarMapa();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [trajeto, checkpoints, inicio, fim]);

  // Verifica se há dados para exibir
  const temDados =
    (trajeto && trajeto.length > 0) ||
    inicio ||
    (checkpoints && checkpoints.length > 0);

  if (!temDados) {
    return (
      <div className="mapa-ronda-vazio" style={{ height: altura }}>
        <span className="icone">🗺️</span>
        <p>Sem dados de trajeto para exibir</p>
      </div>
    );
  }

  return (
    <div className="mapa-ronda-container">
      <div
        ref={mapContainerRef}
        className="mapa-ronda"
        style={{ height: altura }}
      />
      <div className="mapa-legenda">
        <div className="legenda-item">
          <span className="legenda-cor inicio"></span>
          <span>Início</span>
        </div>
        <div className="legenda-item">
          <span className="legenda-cor fim"></span>
          <span>Fim</span>
        </div>
        <div className="legenda-item">
          <span className="legenda-cor checkpoint"></span>
          <span>Checkpoint</span>
        </div>
        <div className="legenda-item">
          <span className="legenda-linha"></span>
          <span>Trajeto</span>
        </div>
      </div>
    </div>
  );
}


