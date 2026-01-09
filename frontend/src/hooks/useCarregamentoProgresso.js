import { useState, useCallback } from "react";

/**
 * Hook para simular progresso de carregamento
 * Evita repetição do código de simulação de progresso em várias páginas
 *
 * @param {Object} opcoes - Opções de configuração
 * @param {number} opcoes.incremento - Valor do incremento (default: 10)
 * @param {number} opcoes.intervalo - Intervalo em ms (default: 100)
 * @param {number} opcoes.maximo - Valor máximo (default: 100)
 * @returns {Object} { progresso, carregando, iniciarCarregamento, finalizarCarregamento, resetar }
 */
export function useCarregamentoProgresso(opcoes = {}) {
  const { incremento = 10, intervalo = 100, maximo = 100 } = opcoes;

  const [progresso, setProgresso] = useState(0);
  const [carregando, setCarregando] = useState(false);

  const iniciarCarregamento = useCallback(() => {
    setCarregando(true);
    setProgresso(0);

    let valor = 0;
    const timer = setInterval(() => {
      valor += incremento;
      setProgresso(valor);

      if (valor >= maximo) {
        clearInterval(timer);
      }
    }, intervalo);

    // Retorna função para limpar o timer se necessário
    return () => clearInterval(timer);
  }, [incremento, intervalo, maximo]);

  const finalizarCarregamento = useCallback(() => {
    setProgresso(100);
    setCarregando(false);
  }, []);

  const resetar = useCallback(() => {
    setProgresso(0);
    setCarregando(false);
  }, []);

  return {
    progresso,
    carregando,
    iniciarCarregamento,
    finalizarCarregamento,
    resetar,
  };
}

export default useCarregamentoProgresso;
