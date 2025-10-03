/**
 * Algoritmo Determinístico para Café
 * Baseado em regras agronômicas específicas para cafeicultura
 */

class CafeAlgorithm {
  
  constructor() {
    // Parâmetros de referência por variedade
    this.variedades = {
      "mundo_novo": {
        tipo: "arabica",
        temperatura_ideal: { min: 18, max: 23 },
        ph_ideal: { min: 5.0, max: 6.0 },
        tolerancia_calor: "baixa",
        caracteristicas: "Não tolera excesso de calor"
      },
      "catuai": {
        tipo: "arabica", 
        temperatura_ideal: { min: 19, max: 24 },
        ph_ideal: { min: 5.0, max: 6.5 },
        tolerancia_calor: "media",
        caracteristicas: "Boa adaptação a diferentes solos"
      },
      "bourbon": {
        tipo: "arabica",
        temperatura_ideal: { min: 18, max: 22 },
        ph_ideal: { min: 5.0, max: 6.0 },
        tolerancia_calor: "baixa",
        caracteristicas: "Mais sensível a pragas"
      },
      "acaia": {
        tipo: "arabica",
        temperatura_ideal: { min: 20, max: 25 },
        ph_ideal: { min: 5.0, max: 6.0 },
        tolerancia_calor: "media",
        caracteristicas: "Melhor em regiões do Cerrado"
      },
      "conilon": {
        tipo: "robusta",
        temperatura_ideal: { min: 22, max: 30 },
        ph_ideal: { min: 4.5, max: 6.0 },
        tolerancia_calor: "alta",
        caracteristicas: "Não tolera frio abaixo de 18°C"
      }
    };

    // Fases fenológicas e suas necessidades
    this.fasesFenologicas = {
      "repouso": {
        meses: ["maio", "junho", "julho", "agosto"],
        necessidade_hidrica: "minima",
        cuidados: "Foco em poda e controle de pragas"
      },
      "brotacao": {
        meses: ["setembro"],
        necessidade_hidrica: "media",
        cuidados: "Essencial umidade para brotação"
      },
      "floracao": {
        meses: ["outubro", "novembro", "dezembro"],
        necessidade_hidrica: "alta",
        cuidados: "Água essencial, evitar stress"
      },
      "granacao": {
        meses: ["janeiro", "fevereiro", "março", "abril"],
        necessidade_hidrica: "alta",
        cuidados: "Equilíbrio chuva/sol"
      },
      "maturacao": {
        meses: ["maio", "junho", "julho"],
        necessidade_hidrica: "baixa",
        cuidados: "Clima seco favorável"
      }
    };
  }

  /**
   * Método principal para gerar recomendações
   */
  async gerarRecomendacoes(plantacao, dadosClimaticos, dadosSolo, previsao5Dias = null) {
    const recomendacoes = [];
    const variedade = this.variedades[plantacao.variedade_cafe];
    
    if (!variedade) {
      throw new Error(`Variedade de café não reconhecida: ${plantacao.variedade_cafe}`);
    }

    // 1. Análise do Solo (dados históricos)
    const recomendacoesSolo = this.analisarSolo(dadosSolo, variedade, plantacao);
    recomendacoes.push(...recomendacoesSolo);

    // 2. Análise Climática (dados históricos)
    const recomendacoesClima = this.analisarClima(dadosClimaticos, variedade, plantacao);
    recomendacoes.push(...recomendacoesClima);

    // 3. Análise por Fase Fenológica
    const recomendacoesFase = this.analisarFaseFenologica(plantacao, dadosClimaticos, variedade);
    recomendacoes.push(...recomendacoesFase);

    // 4. NOVA: Análise Preditiva (previsão do tempo)
    if (previsao5Dias && previsao5Dias.length > 0) {
      const recomendacoesPreditivas = await this.analisarPrevisao(plantacao, previsao5Dias, variedade);
      recomendacoes.push(...recomendacoesPreditivas);
    }

    return recomendacoes;
  }

  /**
   * Análise das condições do solo
   */
  analisarSolo(dadosSolo, variedade, plantacao) {
    const recomendacoes = [];
    const ph = dadosSolo.ph || 6.0;
    const tipoSolo = dadosSolo.tipo_solo || 'medio';

    // Regras de pH
    if (ph < 4.5) {
      recomendacoes.push({
        tipo: 'correcao_solo',
        prioridade: 'alta',
        titulo: 'Solo Muito Ácido - Calagem Urgente',
        descricao: `pH do solo (${ph}) está muito baixo para café. Solo muito ácido prejudica absorção de nutrientes.`,
        acaoRecomendada: 'Aplicar calcário dolomítico: 2-3 toneladas por hectare. Realizar nova análise em 60 dias.',
        fundamentacao: 'pH < 4.5 - solo muito ácido para cafeicultura',
        parametros: { ph_atual: ph, ph_ideal: `${variedade.ph_ideal.min}-${variedade.ph_ideal.max}` }
      });
    } else if (ph < variedade.ph_ideal.min) {
      recomendacoes.push({
        tipo: 'correcao_solo',
        prioridade: 'media',
        titulo: 'Correção de pH Recomendada',
        descricao: `pH do solo (${ph}) está abaixo do ideal para ${plantacao.variedade_cafe}. Pode limitar produtividade.`,
        acaoRecomendada: 'Aplicar calcário: 1-2 toneladas por hectare conforme análise completa do solo.',
        fundamentacao: `pH abaixo do ideal para ${plantacao.variedade_cafe}`,
        parametros: { ph_atual: ph, ph_ideal: `${variedade.ph_ideal.min}-${variedade.ph_ideal.max}` }
      });
    } else if (ph > 7.0) {
      recomendacoes.push({
        tipo: 'correcao_solo',
        prioridade: 'media',
        titulo: 'Solo Alcalino - Baixa Disponibilidade de Nutrientes',
        descricao: `pH do solo (${ph}) está elevado. Solo alcalino reduz disponibilidade de micronutrientes.`,
        acaoRecomendada: 'Aplicar sulfato de amônio ou enxofre. Considerar adubação foliar com micronutrientes.',
        fundamentacao: 'pH > 7.0 - solo alcalino prejudica absorção de Fe, Mn, Zn',
        parametros: { ph_atual: ph, ph_ideal: `${variedade.ph_ideal.min}-${variedade.ph_ideal.max}` }
      });
    }

    // Regras por tipo de solo
    if (tipoSolo === 'arenoso') {
      recomendacoes.push({
        tipo: 'manejo_solo',
        prioridade: 'media',
        titulo: 'Solo Arenoso - Manejo Especial Necessário',
        descricao: 'Solo arenoso drena rapidamente e tem baixa retenção de nutrientes.',
        acaoRecomendada: 'Aumentar frequência de irrigação e adubação. Aplicar matéria orgânica para melhorar retenção.',
        fundamentacao: 'Solo arenoso exige manejo mais intensivo',
        parametros: { tipo_solo: tipoSolo }
      });
    }

    return recomendacoes;
  }

  /**
   * Análise das condições climáticas
   */
  analisarClima(dadosClimaticos, variedade, plantacao) {
    const recomendacoes = [];
    
    if (!dadosClimaticos || dadosClimaticos.length === 0) {
      return recomendacoes;
    }

    // Calcular médias dos últimos 7 dias
    const temperaturaMedia = dadosClimaticos.reduce((sum, d) => sum + (d.temperatura?.media || 0), 0) / dadosClimaticos.length;
    const temperaturaMax = Math.max(...dadosClimaticos.map(d => d.temperatura?.maxima || 0));
    const temperaturaMin = Math.min(...dadosClimaticos.map(d => d.temperatura?.minima || 0));
    const precipitacaoTotal = dadosClimaticos.reduce((sum, d) => sum + (d.precipitacao?.total || 0), 0);
    const umidadeMedia = dadosClimaticos.reduce((sum, d) => sum + (d.umidade?.media || 0), 0) / dadosClimaticos.length;

    // Regras de Temperatura - Risco de Geada/Frio
    if (variedade.tipo === 'arabica' && temperaturaMin < 12) {
      recomendacoes.push({
        tipo: 'alerta_climatico',
        prioridade: 'urgente',
        titulo: 'ALERTA: Risco de Geada',
        descricao: `Temperatura mínima de ${temperaturaMin}°C. Risco crítico de geada para café arábica.`,
        acaoRecomendada: 'Monitorar temperatura constantemente. Preparar proteção (cobertura, queima controlada). Evitar podas.',
        fundamentacao: 'Temperatura < 12°C - risco de geada para arábica',
        parametros: { temp_minima: temperaturaMin, tipo_cafe: variedade.tipo }
      });
    } else if (variedade.tipo === 'robusta' && temperaturaMin < 18) {
      recomendacoes.push({
        tipo: 'alerta_climatico',
        prioridade: 'alta',
        titulo: 'Risco de Estresse por Frio',
        descricao: `Temperatura mínima de ${temperaturaMin}°C. Café robusta sofre com temperatura baixa.`,
        acaoRecomendada: 'Monitorar plantas. Evitar irrigação excessiva. Considerar cobertura morta.',
        fundamentacao: 'Temperatura < 18°C - estresse para robusta',
        parametros: { temp_minima: temperaturaMin, tipo_cafe: variedade.tipo }
      });
    }

    // Regras de Temperatura - Estresse Térmico
    if (variedade.tipo === 'arabica' && temperaturaMax > 30) {
      const intensidade = temperaturaMax > 32 ? 'alta' : 'media';
      recomendacoes.push({
        tipo: 'alerta_climatico',
        prioridade: intensidade,
        titulo: 'Estresse Térmico - Calor Excessivo',
        descricao: `Temperatura máxima de ${temperaturaMax}°C. Café arábica sofre estresse com calor excessivo.`,
        acaoRecomendada: 'Aumentar irrigação. Considerar sombreamento temporário. Aplicar cobertura morta.',
        fundamentacao: `Temperatura > 30°C - estresse térmico para arábica`,
        parametros: { temp_maxima: temperaturaMax, tipo_cafe: variedade.tipo }
      });
    } else if (variedade.tipo === 'robusta' && temperaturaMax > 34) {
      const intensidade = temperaturaMax > 36 ? 'urgente' : 'alta';
      recomendacoes.push({
        tipo: 'alerta_climatico',
        prioridade: intensidade,
        titulo: 'Risco Crítico - Calor Extremo',
        descricao: `Temperatura máxima de ${temperaturaMax}°C. Mesmo café robusta sofre com este calor.`,
        acaoRecomendada: 'Irrigação emergencial. Sombreamento obrigatório. Pulverização foliar.',
        fundamentacao: `Temperatura > 34°C - risco crítico para robusta`,
        parametros: { temp_maxima: temperaturaMax, tipo_cafe: variedade.tipo }
      });
    }

    // Regras de Precipitação
    if (precipitacaoTotal < 10) {
      recomendacoes.push({
        tipo: 'irrigacao',
        prioridade: 'alta',
        titulo: 'Déficit Hídrico Crítico',
        descricao: `Apenas ${precipitacaoTotal.toFixed(1)}mm de chuva nos últimos 7 dias. Déficit hídrico severo.`,
        acaoRecomendada: 'Irrigação imediata necessária: 20-25mm. Monitorar umidade do solo diariamente.',
        fundamentacao: 'Precipitação < 10mm/semana - déficit crítico',
        parametros: { precipitacao_semanal: precipitacaoTotal, deficit: 25 - precipitacaoTotal }
      });
    } else if (precipitacaoTotal < 25) {
      recomendacoes.push({
        tipo: 'irrigacao',
        prioridade: 'media',
        titulo: 'Atenção - Irrigação Complementar',
        descricao: `${precipitacaoTotal.toFixed(1)}mm de chuva nos últimos 7 dias. Abaixo do ideal para café.`,
        acaoRecomendada: 'Irrigação complementar recomendada: 10-15mm. Avaliar umidade do solo.',
        fundamentacao: 'Precipitação 10-25mm/semana - atenção',
        parametros: { precipitacao_semanal: precipitacaoTotal, recomendacao: 25 - precipitacaoTotal }
      });
    }

    // Regras de Umidade
    if (umidadeMedia < 40) {
      recomendacoes.push({
        tipo: 'alerta_climatico',
        prioridade: 'media',
        titulo: 'Baixa Umidade - Risco de Queda de Flores',
        descricao: `Umidade relativa baixa (${umidadeMedia.toFixed(1)}%). Pode causar queda de flores e frutos jovens.`,
        acaoRecomendada: 'Aumentar irrigação por aspersão se disponível. Manter cobertura morta. Evitar capinas em horário seco.',
        fundamentacao: 'Umidade < 40% - risco de queda de flores/frutos',
        parametros: { umidade_media: umidadeMedia }
      });
    }

    // Alerta para doenças (umidade alta + temperatura ideal para ferrugem)
    if (umidadeMedia > 80 && temperaturaMedia >= 22 && temperaturaMedia <= 25) {
      recomendacoes.push({
        tipo: 'alerta_fitossanitario',
        prioridade: 'alta',
        titulo: 'ALERTA: Condições Favoráveis à Ferrugem',
        descricao: `Umidade alta (${umidadeMedia.toFixed(1)}%) e temperatura ideal (${temperaturaMedia.toFixed(1)}°C) para ferrugem.`,
        acaoRecomendada: 'Monitorar folhas diariamente. Aplicar fungicida preventivo se histórico de ferrugem. Melhorar arejamento.',
        fundamentacao: 'Umidade > 80% + temperatura 22-25°C = condições ideais para Hemileia vastatrix',
        parametros: { umidade_media: umidadeMedia, temperatura_media: temperaturaMedia }
      });
    }

    return recomendacoes;
  }

  /**
   * Análise por fase fenológica
   */
  analisarFaseFenologica(plantacao, dadosClimaticos, variedade) {
    const recomendacoes = [];
    const fase = plantacao.fase_fenologica || this.detectarFaseAtual();
    const faseInfo = this.fasesFenologicas[fase];
    
    if (!faseInfo) return recomendacoes;

    const precipitacaoSemanal = dadosClimaticos.reduce((sum, d) => sum + (d.precipitacao?.total || 0), 0);
    const temperaturaMax = Math.max(...dadosClimaticos.map(d => d.temperatura?.maxima || 0));

    switch (fase) {
      case 'repouso':
        recomendacoes.push({
          tipo: 'manejo_cultural',
          prioridade: 'baixa',
          titulo: 'Fase de Repouso - Manejo Cultural',
          descricao: 'Período ideal para tratos culturais e manutenção da plantação.',
          acaoRecomendada: 'Realizar podas necessárias, controle de ervas daninhas, manutenção de equipamentos.',
          fundamentacao: 'Fase de repouso vegetativo - foco em tratos culturais',
          parametros: { fase: fase }
        });
        break;

      case 'brotacao':
        if (precipitacaoSemanal < 25) {
          recomendacoes.push({
            tipo: 'irrigacao',
            prioridade: 'alta',
            titulo: 'Brotação - Irrigação Essencial',
            descricao: 'Fase de brotação necessita umidade adequada para desenvolvimento das gemas.',
            acaoRecomendada: 'Irrigação recomendada: 15-20mm. Manter solo úmido mas não encharcado.',
            fundamentacao: 'Brotação + chuva < 25mm/semana',
            parametros: { fase: fase, precipitacao: precipitacaoSemanal }
          });
        }
        break;

      case 'floracao':
        if (precipitacaoSemanal < 25) {
          recomendacoes.push({
            tipo: 'irrigacao',
            prioridade: 'urgente',
            titulo: 'Floração - Água Obrigatória',
            descricao: 'Fase crítica! Déficit hídrico durante floração compromete safra.',
            acaoRecomendada: 'Irrigação obrigatória: 20-25mm. Prioridade máxima para esta fase.',
            fundamentacao: 'Floração + chuva < 25mm/semana = risco crítico para safra',
            parametros: { fase: fase, precipitacao: precipitacaoSemanal }
          });
        }
        break;

      case 'granacao':
        if (temperaturaMax > 30) {
          recomendacoes.push({
            tipo: 'irrigacao',
            prioridade: 'alta',
            titulo: 'Granação - Proteção Contra Calor',
            descricao: 'Enchimento de grãos com temperatura alta. Necessário equilibrar água e temperatura.',
            acaoRecomendada: 'Irrigação + sombreamento se possível. Aplicar 15-20mm conforme umidade do solo.',
            fundamentacao: 'Granação + temperatura > 30°C',
            parametros: { fase: fase, temperatura_max: temperaturaMax }
          });
        }
        break;

      case 'maturacao':
        if (precipitacaoSemanal > 50) {
          recomendacoes.push({
            tipo: 'alerta_qualidade',
            prioridade: 'media',
            titulo: 'Maturação - Excesso de Chuva',
            descricao: 'Chuva excessiva durante maturação pode prejudicar qualidade dos grãos.',
            acaoRecomendada: 'Evitar irrigação. Melhorar drenagem se possível. Acelerar colheita se grãos maduros.',
            fundamentacao: 'Maturação + chuva > 50mm/semana = risco para qualidade',
            parametros: { fase: fase, precipitacao: precipitacaoSemanal }
          });
        }
        break;
    }

    return recomendacoes;
  }

  /**
   * Detecta fase fenológica atual baseada na época do ano
   */
  detectarFaseAtual() {
    const mesAtual = new Date().getMonth(); // 0-11
    const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 
                   'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    const mesNome = meses[mesAtual];

    for (const [fase, info] of Object.entries(this.fasesFenologicas)) {
      if (info.meses.includes(mesNome)) {
        return fase;
      }
    }
    return 'repouso'; // default
  }

  /**
   * Formatador de recomendação para o padrão da API
   */
  formatarRecomendacao(recomendacao, plantacaoId, usuarioId) {
    const agora = new Date();
    const dataRecomendada = new Date(agora.getTime() + 24 * 60 * 60 * 1000); // amanhã
    const dataLimite = new Date(agora.getTime() + (recomendacao.prioridade === 'urgente' ? 1 : 
                                                   recomendacao.prioridade === 'alta' ? 3 : 7) * 24 * 60 * 60 * 1000);

    return {
      plantacao: plantacaoId,
      usuario: usuarioId,
      tipo: recomendacao.tipo,
      prioridade: recomendacao.prioridade,
      titulo: recomendacao.titulo,
      descricao: recomendacao.descricao,
      acaoRecomendada: recomendacao.acaoRecomendada,
      cronograma: {
        dataRecomendada: dataRecomendada,
        dataLimite: dataLimite
      },
      status: 'pendente',
      ativa: true, // Campo necessário para busca
      createdAt: agora, // Campo necessário para ordenação
      criadaEm: agora, // Manter compatibilidade
      parametrosUsados: {
        algoritmo: 'deterministico_cafe_v1',
        fundamentacao: recomendacao.fundamentacao,
        parametros: recomendacao.parametros
      }
    };
  }

  /**
   * NOVA: Análise preditiva baseada em previsão do tempo
   * @param {Object} plantacao 
   * @param {Array} previsao5Dias 
   * @param {Object} variedade 
   * @returns {Array} Recomendações preventivas
   */
  async analisarPrevisao(plantacao, previsao5Dias, variedade) {
    const PrevisaoService = require('./PrevisaoService');
    const alertasPreditivos = PrevisaoService.analisarRiscosFuturos(previsao5Dias, plantacao);
    
    // Converter alertas em recomendações com formatação do sistema
    return alertasPreditivos.map(alerta => ({
      tipo: `${alerta.tipo}_preditivo`,
      prioridade: alerta.prioridade,
      titulo: `🔮 ${alerta.titulo}`,
      descricao: `PREVISÃO: ${alerta.descricao}`,
      acaoRecomendada: alerta.acaoRecomendada,
      fundamentacao: `Análise preditiva - ${alerta.tipo}`,
      parametros: { 
        ...alerta.parametros,
        tipo_analise: 'preditiva',
        data_evento: alerta.dataEvento,
        variedade: plantacao.variedade_cafe
      }
    }));
  }
}

module.exports = CafeAlgorithm;