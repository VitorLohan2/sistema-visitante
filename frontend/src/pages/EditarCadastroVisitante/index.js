import logger from "../../utils/logger";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EDITAR CADASTRO VISITANTE - Página de Edição de Visitantes
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dados: Carregados do cache (useDataLoader é responsável pelo carregamento inicial)
 * Atualização: Via Socket.IO em tempo real
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// src/pages/EditarCadastroVisitante/index.js
import React, { useState, useEffect, useRef } from "react";
import { useHistory, useParams } from "react-router-dom";
import api from "../../services/api";
import { getCache, setCache } from "../../services/cacheService";
import * as socketService from "../../services/socketService";
import { usePermissoes } from "../../hooks/usePermissoes";
import "./styles.css";

export default function EditarCadastroVisitante() {
  // Dados das novas tabelas (carregados da API)
  const [coresVeiculos, setCoresVeiculos] = useState([]);
  const [tiposVeiculos, setTiposVeiculos] = useState([]);
  const [funcoesVisitantes, setFuncoesVisitantes] = useState([]);

  const [form, setForm] = useState({
    nome: "",
    nascimento: "",
    cpf: "",
    empresa: "",
    setor: "",
    telefone: "",
    placa_veiculo: "",
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
    funcao_visitante_id: "",
    observacao: "",
    bloqueado: false,
  });

  const history = useHistory();
  const { id } = useParams();

  // ═══════════════════════════════════════════════════════════════
  // DADOS DO CACHE (carregados pelo useDataLoader)
  // ═══════════════════════════════════════════════════════════════
  const [empresas, setEmpresas] = useState(
    () => getCache("empresasVisitantes") || [],
  );
  const [setores, setSetores] = useState(
    () => getCache("setoresVisitantes") || [],
  );
  const socketListenersRef = useRef([]);

  const [fotos, setFotos] = useState([]);
  const [avatar, setAvatar] = useState("");
  const [errors, setErrors] = useState({
    placa_veiculo: "",
    cor_veiculo_visitante_id: "",
    tipo_veiculo_visitante_id: "",
  });

  const { temPermissao } = usePermissoes();

  // Permissão para bloquear/desbloquear visitantes
  const podeBloquer = temPermissao("cadastro_bloquear");

  // ═══════════════════════════════════════════════════════════════
  // CARREGAMENTO DE DADOS - Primeiro do cache, depois API se necessário
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    async function loadData() {
      try {
        // ✅ Primeiro verifica se já tem empresas e setores no cache
        const cachedEmpresas = getCache("empresasVisitantes");
        const cachedSetores = getCache("setoresVisitantes");

        // Busca dados do visitante (sempre da API - dados específicos)
        const incidentRes = await api.get(`/cadastro-visitantes/${id}`);
        const data = incidentRes.data;

        setForm({
          ...data,
          cpf: formatCPF(data.cpf || ""),
          telefone: formatTelefone(data.telefone || ""),
          placa_veiculo: formatPlaca(data.placa_veiculo || ""),
          cor_veiculo_visitante_id: data.cor_veiculo_visitante_id || "",
          tipo_veiculo_visitante_id: data.tipo_veiculo_visitante_id || "",
          funcao_visitante_id: data.funcao_visitante_id || "",
          bloqueado: Boolean(data.bloqueado),
        });

        setFotos(data.fotos || []);
        setAvatar(data.avatar_imagem || data.fotos?.[0] || "");

        // Usa cache para empresas e setores se disponível
        if (cachedEmpresas && cachedSetores) {
          logger.log("📦 Usando empresas e setores do cache");
          setEmpresas(cachedEmpresas);
          setSetores(cachedSetores);
        } else {
          // Se não tem cache, busca da API
          const [empresasRes, setoresRes] = await Promise.all([
            api.get("/empresas-visitantes"),
            api.get("/setores-visitantes"),
          ]);

          const empresasData = empresasRes.data;
          const setoresData = setoresRes.data;

          // Salva no cache
          setCache("empresasVisitantes", empresasData);
          setCache("setoresVisitantes", setoresData);

          setEmpresas(empresasData);
          setSetores(setoresData);
        }

        // Carregar dados das novas tabelas
        const [coresResponse, tiposResponse, funcoesResponse] =
          await Promise.all([
            api.get("/cores-veiculos-visitantes"),
            api.get("/tipos-veiculos-visitantes"),
            api.get("/funcoes-visitantes"),
          ]);

        setCoresVeiculos(coresResponse.data);
        setTiposVeiculos(tiposResponse.data);
        setFuncoesVisitantes(funcoesResponse.data);
      } catch (err) {
        alert("Erro ao carregar dados do incidente");
        history.push("/listagem-visitante");
      }
    }

    loadData();
  }, [id, history]);

  // ═══════════════════════════════════════════════════════════════
  // SOCKET LISTENERS - Sincronização em tempo real
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    // Remove listeners anteriores
    socketListenersRef.current.forEach((unsubscribe) => unsubscribe());
    socketListenersRef.current = [];

    // Listener para empresas criadas
    const unsubEmpresaCreated = socketService.on(
      "empresa:created",
      (novaEmpresa) => {
        logger.log("🔵 Socket: Nova empresa criada", novaEmpresa);
        setEmpresas((prev) => {
          const updated = [...prev, novaEmpresa];
          setCache("empresasVisitantes", updated);
          return updated;
        });
      },
    );
    socketListenersRef.current.push(unsubEmpresaCreated);

    // Listener para empresas atualizadas
    const unsubEmpresaUpdated = socketService.on(
      "empresa:updated",
      (empresaAtualizada) => {
        logger.log("🔵 Socket: Empresa atualizada", empresaAtualizada);
        setEmpresas((prev) => {
          const updated = prev.map((e) =>
            e.id === empresaAtualizada.id ? empresaAtualizada : e,
          );
          setCache("empresasVisitantes", updated);
          return updated;
        });
      },
    );
    socketListenersRef.current.push(unsubEmpresaUpdated);

    // Listener para empresas deletadas
    const unsubEmpresaDeleted = socketService.on(
      "empresa:deleted",
      (empresaId) => {
        logger.log("🔵 Socket: Empresa deletada", empresaId);
        setEmpresas((prev) => {
          const updated = prev.filter((e) => e.id !== empresaId);
          setCache("empresasVisitantes", updated);
          return updated;
        });
      },
    );
    socketListenersRef.current.push(unsubEmpresaDeleted);

    // Listener para setores criados
    const unsubSetorCreated = socketService.on("setor:created", (novoSetor) => {
      logger.log("🔵 Socket: Novo setor criado", novoSetor);
      setSetores((prev) => {
        const updated = [...prev, novoSetor];
        setCache("setoresVisitantes", updated);
        return updated;
      });
    });
    socketListenersRef.current.push(unsubSetorCreated);

    // Listener para setores atualizados
    const unsubSetorUpdated = socketService.on(
      "setor:updated",
      (setorAtualizado) => {
        logger.log("🔵 Socket: Setor atualizado", setorAtualizado);
        setSetores((prev) => {
          const updated = prev.map((s) =>
            s.id === setorAtualizado.id ? setorAtualizado : s,
          );
          setCache("setoresVisitantes", updated);
          return updated;
        });
      },
    );
    socketListenersRef.current.push(unsubSetorUpdated);

    // Listener para setores deletados
    const unsubSetorDeleted = socketService.on("setor:deleted", (setorId) => {
      logger.log("🔵 Socket: Setor deletado", setorId);
      setSetores((prev) => {
        const updated = prev.filter((s) => s.id !== setorId);
        setCache("setoresVisitantes", updated);
        return updated;
      });
    });
    socketListenersRef.current.push(unsubSetorDeleted);

    // Cleanup ao desmontar
    return () => {
      socketListenersRef.current.forEach((unsubscribe) => unsubscribe());
      socketListenersRef.current = [];
    };
  }, []);

  // === Funções de formatação (iguais ao cadastro) ===
  const formatCPF = (value) => {
    const cleaned = value.replace(/\D/g, "");
    const match = cleaned.match(/(\d{3})(\d{3})(\d{3})(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : value;
  };

  const formatTelefone = (value) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  // ← FUNÇÃO PARA FORMATAR PLACA (igual ao cadastro)
  const formatPlaca = (value) => {
    const cleaned = value
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 7);

    if (cleaned.length <= 3) {
      return cleaned;
    }

    // Formato Mercosul: AAA1A11 ou Formato antigo: AAA1111
    if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}${cleaned.slice(3, 4)}${cleaned.slice(4, 5)}${cleaned.slice(5, 7)}`;
    }

    return cleaned;
  };

  // ← VALIDAÇÃO DE PLACA EM TEMPO REAL (igual ao cadastro)
  const validatePlaca = (value) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleaned.length > 0 && cleaned.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
    } else {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "",
      }));
    }
  };

  // === Handlers ===
  const handleChange = (e) => {
    const { name, value } = e.target;

    let newValue = value;

    if (name === "nome") {
      newValue = value.toUpperCase();
    } else if (name === "placa_veiculo") {
      newValue = formatPlaca(value); // Formata a placa
      validatePlaca(newValue); // Valida em tempo real
    }

    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleCpfChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setForm((prev) => ({ ...prev, cpf: formatted }));
  };

  const handleTelefoneChange = (e) => {
    const formatted = formatTelefone(e.target.value);
    setForm((prev) => ({ ...prev, telefone: formatted }));
  };

  // Função para alternar estado do bloqueio (apenas localmente)
  const handleBlockChange = (e) => {
    if (!podeBloquer) return;
    const novoEstado = e.target.checked;
    setForm((prev) => ({ ...prev, bloqueado: novoEstado }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cpfClean = form.cpf.replace(/\D/g, "");
    const telefoneClean = form.telefone.replace(/\D/g, "");
    const placaClean = form.placa_veiculo
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();

    // Limpa erros anteriores
    setErrors({
      placa_veiculo: "",
      cor_veiculo_visitante_id: "",
      tipo_veiculo_visitante_id: "",
    });

    if (cpfClean.length !== 11) {
      return alert("CPF inválido. Deve conter 11 dígitos.");
    }

    if (telefoneClean.length !== 11) {
      return alert("Telefone inválido. Deve conter 11 dígitos com DDD.");
    }

    if (!form.empresa || !form.setor) {
      return alert("Empresa e setor são obrigatórios.");
    }

    // ← VALIDAÇÃO: Se tem placa, deve ter cor e tipo
    const hasPlaca = placaClean.trim().length > 0;
    const hasCor =
      form.cor_veiculo_visitante_id !== "" &&
      form.cor_veiculo_visitante_id !== null;
    const hasTipo =
      form.tipo_veiculo_visitante_id !== "" &&
      form.tipo_veiculo_visitante_id !== null;

    if (hasPlaca && !hasCor) {
      setErrors((prev) => ({
        ...prev,
        cor_veiculo_visitante_id:
          "Cor do veículo é obrigatória quando a placa é informada",
      }));
      return alert("Por favor, selecione a cor do veículo.");
    }

    if (hasPlaca && !hasTipo) {
      setErrors((prev) => ({
        ...prev,
        tipo_veiculo_visitante_id:
          "Tipo do veículo é obrigatório quando a placa é informada",
      }));
      return alert("Por favor, selecione o tipo do veículo.");
    }

    if ((hasCor || hasTipo) && !hasPlaca) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo:
          "Placa do veículo é obrigatória quando a cor/tipo é informada",
      }));
      alert("Por favor, preencha a placa do veículo.");
      return;
    }

    // Valida formato da placa
    if (hasPlaca && placaClean.length < 7) {
      setErrors((prev) => ({
        ...prev,
        placa_veiculo: "Placa deve ter 7 caracteres",
      }));
      return alert("Placa do veículo deve ter 7 caracteres.");
    }

    const payload = {
      nome: form.nome,
      nascimento: form.nascimento,
      cpf: cpfClean,
      empresa: form.empresa,
      setor: form.setor,
      telefone: telefoneClean,
      placa_veiculo: placaClean,
      cor_veiculo_visitante_id: form.cor_veiculo_visitante_id || null,
      tipo_veiculo_visitante_id: form.tipo_veiculo_visitante_id || null,
      funcao_visitante_id: form.funcao_visitante_id || null,
      observacao: form.observacao,
      avatar_imagem: avatar,
      bloqueado: form.bloqueado, // Inclui o estado de bloqueio na atualização
    };

    try {
      await api.put(`/cadastro-visitantes/${id}`, payload);

      // Socket.IO vai sincronizar automaticamente com outros usuários

      alert("Dados atualizados com sucesso!");
      history.push("/listagem-visitante");
    } catch (err) {
      logger.error("Erro na atualização:", err.response?.data || err);
      alert(err.response?.data?.error || "Erro ao atualizar incidente");
    }
  };

  return (
    <div className="edit-visitor-container">
      <div className="content">
        <div className="edit-header">
          <h1>Editar Cadastro</h1>
          <p>Atualize os dados do cadastro.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input
              name="nome"
              placeholder="Nome completo"
              value={form.nome}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Data de Nascimento</label>
              <input
                type="date"
                name="nascimento"
                value={form.nascimento}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>CPF</label>
              <input
                name="cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={handleCpfChange}
                maxLength={14}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Empresa</label>
              <select
                name="empresa"
                value={form.empresa}
                onChange={handleChange}
                required
              >
                <option value="">Selecione a empresa</option>
                {empresas.map((opt) => (
                  <option key={opt.id} value={opt.nome}>
                    {opt.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Setor</label>
              <select
                name="setor"
                value={form.setor}
                onChange={handleChange}
                required
              >
                <option value="">Selecione o setor</option>
                {setores.map((opt) => (
                  <option key={opt.id} value={opt.nome}>
                    {opt.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Função (opcional)</label>
            <select
              name="funcao_visitante_id"
              value={form.funcao_visitante_id}
              onChange={handleChange}
            >
              <option value="">Selecione a função</option>
              {funcoesVisitantes.map((funcao) => (
                <option key={funcao.id} value={funcao.id}>
                  {funcao.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Placa do Veículo (opcional)</label>
            <input
              name="placa_veiculo"
              placeholder="ABC1D23"
              value={form.placa_veiculo}
              onChange={handleChange}
              maxLength={7}
              className={errors.placa_veiculo ? "error" : ""}
            />
            {errors.placa_veiculo && (
              <span className="error-message">{errors.placa_veiculo}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Tipo do Veículo (opcional)</label>
              <select
                name="tipo_veiculo_visitante_id"
                value={form.tipo_veiculo_visitante_id}
                onChange={handleChange}
                className={errors.tipo_veiculo_visitante_id ? "error" : ""}
              >
                <option value="">Selecione o tipo</option>
                {tiposVeiculos.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nome}
                  </option>
                ))}
              </select>
              {errors.tipo_veiculo_visitante_id && (
                <span className="error-message">
                  {errors.tipo_veiculo_visitante_id}
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Cor do Veículo (opcional)</label>
              <select
                name="cor_veiculo_visitante_id"
                value={form.cor_veiculo_visitante_id}
                onChange={handleChange}
                className={errors.cor_veiculo_visitante_id ? "error" : ""}
              >
                <option value="">Selecione a cor</option>
                {coresVeiculos.map((cor) => (
                  <option key={cor.id} value={cor.id}>
                    {cor.nome}
                  </option>
                ))}
              </select>
              {errors.cor_veiculo_visitante_id && (
                <span className="error-message">
                  {errors.cor_veiculo_visitante_id}
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input
              name="telefone"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={handleTelefoneChange}
              maxLength={15}
              required
            />
          </div>

          <div className="checkbox-container">
            <input
              type="checkbox"
              id="bloqueado-checkbox"
              checked={form.bloqueado}
              onChange={handleBlockChange}
              disabled={!podeBloquer}
              className={!podeBloquer ? "disabled-checkbox" : ""}
            />
            <label htmlFor="bloqueado-checkbox">
              {form.bloqueado ? "✅ Cadastro Bloqueado" : "⛔ Bloquear Acesso"}
            </label>
          </div>

          <div className="form-group">
            <label>Observações</label>
            <textarea
              name="observacao"
              placeholder="Observações adicionais..."
              value={form.observacao}
              onChange={handleChange}
              rows={4}
            />
          </div>

          {fotos.length > 0 && (
            <div className="photo-selector">
              <label>Selecionar Avatar</label>
              <div className="photo-list">
                {fotos.map((foto, index) => (
                  <img
                    key={index}
                    src={foto}
                    alt={`Foto ${index + 1}`}
                    className={`photo-item ${avatar === foto ? "selected" : ""}`}
                    onClick={() => setAvatar(foto)}
                  />
                ))}
              </div>
            </div>
          )}

          <button className="btn-primary" type="submit">
            Atualizar Cadastro
          </button>
        </form>
      </div>
    </div>
  );
}


