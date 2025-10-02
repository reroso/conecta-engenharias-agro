const mongoose = require('mongoose');

const dadosClimaticosSchema = new mongoose.Schema({
  plantacao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantacao',
    required: true
  },
  estacaoInmet: {
    codigo: String,
    nome: String,
    latitude: Number,
    longitude: Number
  },
  data: {
    type: Date,
    required: true
  },
  temperatura: {
    maxima: {
      type: Number,
      required: true
    },
    minima: {
      type: Number,
      required: true
    },
    media: {
      type: Number
    }
  },
  umidade: {
    relativa: {
      type: Number,
      min: [0, 'Umidade não pode ser negativa'],
      max: [100, 'Umidade não pode ser maior que 100%']
    },
    media: {
      type: Number,
      min: [0, 'Umidade não pode ser negativa'],
      max: [100, 'Umidade não pode ser maior que 100%']
    }
  },
  precipitacao: {
    total: {
      type: Number,
      default: 0,
      min: [0, 'Precipitação não pode ser negativa']
    },
    horaria: [Number] // Array com dados de cada hora do dia
  },
  vento: {
    velocidade: {
      type: Number,
      min: [0, 'Velocidade do vento não pode ser negativa']
    },
    direcao: {
      type: Number,
      min: [0, 'Direção do vento deve estar entre 0 e 360'],
      max: [360, 'Direção do vento deve estar entre 0 e 360']
    },
    rajada: Number
  },
  pressaoAtmosferica: {
    type: Number,
    min: [800, 'Pressão atmosférica muito baixa'],
    max: [1100, 'Pressão atmosférica muito alta']
  },
  radiacaoSolar: {
    type: Number,
    min: [0, 'Radiação solar não pode ser negativa']
  },
  evapotranspiracao: {
    type: Number,
    min: [0, 'Evapotranspiração não pode ser negativa']
  },
  pontaOrvalho: {
    type: Number
  },
  insolacao: {
    type: Number,
    min: [0, 'Insolação não pode ser negativa'],
    max: [24, 'Insolação não pode ser maior que 24 horas']
  },
  origem: {
    type: String,
    enum: ['inmet', 'manual', 'estimado'],
    default: 'inmet'
  },
  qualidade: {
    type: String,
    enum: ['boa', 'regular', 'ruim'],
    default: 'boa'
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
dadosClimaticosSchema.index({ plantacao: 1, data: -1 });
dadosClimaticosSchema.index({ data: -1 });
dadosClimaticosSchema.index({ 'estacaoInmet.codigo': 1, data: -1 });

// Middleware para calcular temperatura média antes de salvar
dadosClimaticosSchema.pre('save', function(next) {
  if (this.temperatura && this.temperatura.maxima && this.temperatura.minima) {
    this.temperatura.media = (this.temperatura.maxima + this.temperatura.minima) / 2;
  }
  next();
});

// Método para verificar se os dados são de hoje
dadosClimaticosSchema.methods.isHoje = function() {
  const hoje = new Date();
  return this.data.toDateString() === hoje.toDateString();
};

// Método para calcular déficit hídrico
dadosClimaticosSchema.methods.calcularDeficitHidrico = function(necessidadeHidrica) {
  const precipitacao = this.precipitacao.total || 0;
  const evapotranspiracao = this.evapotranspiracao || 4; // mm/dia padrão
  
  const saldoHidrico = precipitacao - evapotranspiracao;
  const deficit = necessidadeHidrica - precipitacao;
  
  return {
    saldoHidrico,
    deficit: deficit > 0 ? deficit : 0,
    excesso: saldoHidrico > necessidadeHidrica ? saldoHidrico - necessidadeHidrica : 0
  };
};

// Método para classificar condições climáticas
dadosClimaticosSchema.methods.classificarCondicoes = function() {
  const temp = this.temperatura.media || 0;
  const umidade = this.umidade.media || 0;
  const chuva = this.precipitacao.total || 0;
  
  let condicoes = [];
  
  if (temp > 35) condicoes.push('calor_extremo');
  else if (temp > 30) condicoes.push('calor');
  else if (temp < 10) condicoes.push('frio');
  
  if (umidade < 30) condicoes.push('seco');
  else if (umidade > 80) condicoes.push('umido');
  
  if (chuva > 50) condicoes.push('chuva_intensa');
  else if (chuva > 20) condicoes.push('chuva_moderada');
  else if (chuva > 5) condicoes.push('chuva_leve');
  else condicoes.push('sem_chuva');
  
  return condicoes;
};

module.exports = mongoose.model('DadosClimaticos', dadosClimaticosSchema);