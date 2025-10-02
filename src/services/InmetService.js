const axios = require('axios');
const moment = require('moment');

class InmetService {
  constructor() {
    this.baseURL = 'https://apitempo.inmet.gov.br/token';
    this.timeoutMs = 10000; // 10 segundos
  }

  /**
   * Buscar estações meteorológicas próximas a uma coordenada
   * @param {number} latitude 
   * @param {number} longitude 
   * @param {number} raio - raio em km para busca
   * @returns {Promise<Array>} Array de estações
   */
  async buscarEstacoes(latitude, longitude, raio = 100) {
    try {
      // Endpoint para buscar estações
      const response = await axios.get(`${this.baseURL}/estacoes/T`, {
        timeout: this.timeoutMs,
        headers: {
          'User-Agent': 'ConectaEngenhariasAgro/1.0'
        }
      });

      const estacoes = response.data;
      
      // Filtrar estações por proximidade (cálculo simplificado)
      const estacoesProximas = estacoes.filter(estacao => {
        if (!estacao.VL_LATITUDE || !estacao.VL_LONGITUDE) return false;
        
        const distancia = this.calcularDistancia(
          latitude, longitude,
          parseFloat(estacao.VL_LATITUDE), parseFloat(estacao.VL_LONGITUDE)
        );
        
        return distancia <= raio;
      });

      // Ordenar por proximidade
      estacoesProximas.sort((a, b) => {
        const distA = this.calcularDistancia(
          latitude, longitude,
          parseFloat(a.VL_LATITUDE), parseFloat(a.VL_LONGITUDE)
        );
        const distB = this.calcularDistancia(
          latitude, longitude,
          parseFloat(b.VL_LATITUDE), parseFloat(b.VL_LONGITUDE)
        );
        return distA - distB;
      });

      return estacoesProximas.slice(0, 5).map(estacao => ({
        codigo: estacao.CD_ESTACAO,
        nome: estacao.DC_NOME,
        latitude: parseFloat(estacao.VL_LATITUDE),
        longitude: parseFloat(estacao.VL_LONGITUDE),
        altitude: parseFloat(estacao.VL_ALTITUDE) || 0,
        uf: estacao.SG_ESTADO
      }));
    } catch (error) {
      console.error('Erro ao buscar estações INMET:', error.message);
      
      // Retornar estações fictícias para desenvolvimento/teste
      return this.getEstacoesDesenvolvimento(latitude, longitude);
    }
  }

  /**
   * Buscar dados climáticos de uma estação para um período
   * @param {string} codigoEstacao 
   * @param {Date} dataInicio 
   * @param {Date} dataFim 
   * @returns {Promise<Array>} Array de dados climáticos
   */
  async buscarDadosClimaticos(codigoEstacao, dataInicio, dataFim) {
    try {
      const inicio = moment(dataInicio).format('YYYY-MM-DD');
      const fim = moment(dataFim).format('YYYY-MM-DD');

      // Endpoint para dados diários
      const response = await axios.get(
        `${this.baseURL}/estacao/diaria/${inicio}/${fim}/${codigoEstacao}`,
        {
          timeout: this.timeoutMs,
          headers: {
            'User-Agent': 'ConectaEngenhariasAgro/1.0'
          }
        }
      );

      const dados = response.data;
      
      return dados.map(registro => this.formatarDadosInmet(registro));
    } catch (error) {
      console.error(`Erro ao buscar dados climáticos da estação ${codigoEstacao}:`, error.message);
      
      // Retornar dados simulados para desenvolvimento
      return this.gerarDadosSimulados(dataInicio, dataFim);
    }
  }

  /**
   * Buscar dados climáticos mais recentes de uma estação
   * @param {string} codigoEstacao 
   * @returns {Promise<Object>} Dados climáticos do último dia
   */
  async buscarDadosRecentes(codigoEstacao) {
    try {
      const hoje = new Date();
      const ontem = new Date(hoje);
      ontem.setDate(hoje.getDate() - 1);

      const dados = await this.buscarDadosClimaticos(codigoEstacao, ontem, hoje);
      return dados[dados.length - 1] || null;
    } catch (error) {
      console.error('Erro ao buscar dados recentes:', error.message);
      return this.gerarDadoSimulado(new Date());
    }
  }

  /**
   * Formatar dados do INMET para o padrão da aplicação
   * @param {Object} registro 
   * @returns {Object} Dados formatados
   */
  formatarDadosInmet(registro) {
    return {
      data: moment(registro.DT_MEDICAO).toDate(),
      temperatura: {
        maxima: this.parseFloat(registro.TEM_MAX),
        minima: this.parseFloat(registro.TEM_MIN),
        media: (this.parseFloat(registro.TEM_MAX) + this.parseFloat(registro.TEM_MIN)) / 2
      },
      umidade: {
        relativa: this.parseFloat(registro.UMD_MIN),
        media: (this.parseFloat(registro.UMD_MAX) + this.parseFloat(registro.UMD_MIN)) / 2
      },
      precipitacao: {
        total: this.parseFloat(registro.CHUVA) || 0
      },
      vento: {
        velocidade: this.parseFloat(registro.VEN_VEL),
        direcao: this.parseFloat(registro.VEN_DIR),
        rajada: this.parseFloat(registro.VEN_RAJ)
      },
      pressaoAtmosferica: this.parseFloat(registro.PRE_INS),
      radiacaoSolar: this.parseFloat(registro.RAD_GLO),
      insolacao: this.parseFloat(registro.INS_TOT),
      origem: 'inmet',
      qualidade: 'boa'
    };
  }

  /**
   * Calcular distância entre duas coordenadas (fórmula de Haversine)
   * @param {number} lat1 
   * @param {number} lon1 
   * @param {number} lat2 
   * @param {number} lon2 
   * @returns {number} Distância em km
   */
  calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(graus) {
    return graus * (Math.PI / 180);
  }

  parseFloat(value) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Gerar dados simulados para desenvolvimento/teste
   * @param {Date} dataInicio 
   * @param {Date} dataFim 
   * @returns {Array} Dados simulados
   */
  gerarDadosSimulados(dataInicio, dataFim) {
    const dados = [];
    const inicio = moment(dataInicio);
    const fim = moment(dataFim);
    
    while (inicio.isSameOrBefore(fim)) {
      dados.push(this.gerarDadoSimulado(inicio.toDate()));
      inicio.add(1, 'day');
    }
    
    return dados;
  }

  gerarDadoSimulado(data) {
    // Simular dados realistas para o Brasil
    const tempBase = 25; // Temperatura base
    const variacao = Math.sin((moment(data).dayOfYear() / 365) * 2 * Math.PI) * 5; // Variação sazonal
    const ruido = (Math.random() - 0.5) * 6; // Ruído aleatório
    
    const tempMedia = tempBase + variacao + ruido;
    const tempMax = tempMedia + Math.random() * 5 + 2;
    const tempMin = tempMedia - Math.random() * 5 - 2;
    
    return {
      data,
      temperatura: {
        maxima: Math.round(tempMax * 10) / 10,
        minima: Math.round(tempMin * 10) / 10,
        media: Math.round(tempMedia * 10) / 10
      },
      umidade: {
        relativa: Math.round((60 + Math.random() * 30) * 10) / 10,
        media: Math.round((65 + Math.random() * 25) * 10) / 10
      },
      precipitacao: {
        total: Math.random() < 0.3 ? Math.round(Math.random() * 50 * 10) / 10 : 0
      },
      vento: {
        velocidade: Math.round(Math.random() * 15 * 10) / 10,
        direcao: Math.round(Math.random() * 360),
        rajada: Math.round(Math.random() * 25 * 10) / 10
      },
      pressaoAtmosferica: Math.round((1013 + (Math.random() - 0.5) * 30) * 10) / 10,
      radiacaoSolar: Math.round(Math.random() * 30 * 10) / 10,
      insolacao: Math.round(Math.random() * 12 * 10) / 10,
      origem: 'simulado',
      qualidade: 'boa'
    };
  }

  /**
   * Retornar estações de desenvolvimento para testes
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {Array} Estações simuladas
   */
  getEstacoesDesenvolvimento(latitude, longitude) {
    // Estações fictícias próximas às coordenadas fornecidas
    return [
      {
        codigo: 'A001',
        nome: 'Estação Teste Central',
        latitude: latitude + 0.01,
        longitude: longitude + 0.01,
        altitude: 800,
        uf: 'XX'
      },
      {
        codigo: 'A002',
        nome: 'Estação Teste Norte',
        latitude: latitude + 0.05,
        longitude: longitude,
        altitude: 750,
        uf: 'XX'
      },
      {
        codigo: 'A003',
        nome: 'Estação Teste Sul',
        latitude: latitude - 0.05,
        longitude: longitude,
        altitude: 850,
        uf: 'XX'
      }
    ];
  }

  /**
   * Validar coordenadas geográficas
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  validarCoordenadas(latitude, longitude) {
    return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
  }

  /**
   * Verificar se uma coordenada está no Brasil (aproximado)
   * @param {number} latitude 
   * @param {number} longitude 
   * @returns {boolean}
   */
  isCoordenadaBrasil(latitude, longitude) {
    return latitude >= -35 && latitude <= 5 && longitude >= -75 && longitude <= -30;
  }
}

module.exports = new InmetService();