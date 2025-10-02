const mongoose = require('mongoose');

const plantacaoSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  nome: {
    type: String,
    required: [true, 'Nome da plantação é obrigatório'],
    trim: true,
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  especie: {
    type: String,
    required: [true, 'Espécie é obrigatória'],
    enum: {
      values: ['cafe', 'uva', 'laranja', 'banana', 'manga', 'abacate', 'cacau', 'coco'],
      message: 'Espécie deve ser uma das opções: café, uva, laranja, banana, manga, abacate, cacau, coco'
    }
  },
  variedade: {
    type: String,
    trim: true
  },
  localizacao: {
    latitude: {
      type: Number,
      required: [true, 'Latitude é obrigatória'],
      min: [-90, 'Latitude deve estar entre -90 e 90'],
      max: [90, 'Latitude deve estar entre -90 e 90']
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude é obrigatória'],
      min: [-180, 'Longitude deve estar entre -180 e 180'],
      max: [180, 'Longitude deve estar entre -180 e 180']
    },
    cidade: String,
    estado: String,
    codigoEstacaoInmet: String // Código da estação INMET mais próxima
  },
  area: {
    hectares: {
      type: Number,
      required: [true, 'Área em hectares é obrigatória'],
      min: [0.01, 'Área deve ser maior que 0.01 hectares']
    },
    numeroPlantas: {
      type: Number,
      min: [1, 'Número de plantas deve ser pelo menos 1']
    }
  },
  dataPlantio: {
    type: Date,
    required: [true, 'Data de plantio é obrigatória']
  },
  statusDesenvolvimento: {
    type: String,
    enum: ['muda', 'jovem', 'adulta', 'madura'],
    default: 'muda'
  },
  sistemaIrrigacao: {
    tipo: {
      type: String,
      enum: ['gotejamento', 'aspersao', 'microaspersao', 'sulco', 'nenhum'],
      default: 'nenhum'
    },
    ativo: {
      type: Boolean,
      default: false
    }
  },
  observacoes: {
    type: String,
    maxlength: [500, 'Observações devem ter no máximo 500 caracteres']
  },
  ativa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índice geoespacial para consultas por proximidade
plantacaoSchema.index({ 'localizacao.latitude': 1, 'localizacao.longitude': 1 });

// Método para calcular idade da plantação
plantacaoSchema.methods.calcularIdade = function() {
  const hoje = new Date();
  const diffTime = Math.abs(hoje - this.dataPlantio);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    dias: diffDays,
    anos: Math.floor(diffDays / 365),
    meses: Math.floor((diffDays % 365) / 30)
  };
};

// Método para determinar necessidades hídricas por espécie
plantacaoSchema.methods.getNecessidadeHidrica = function() {
  const necessidades = {
    cafe: { mmPorSemana: 25, temperaturaIdeal: [18, 25] },
    uva: { mmPorSemana: 15, temperaturaIdeal: [15, 30] },
    laranja: { mmPorSemana: 30, temperaturaIdeal: [20, 30] },
    banana: { mmPorSemana: 40, temperaturaIdeal: [26, 30] },
    manga: { mmPorSemana: 20, temperaturaIdeal: [24, 30] },
    abacate: { mmPorSemana: 25, temperaturaIdeal: [20, 25] },
    cacau: { mmPorSemana: 35, temperaturaIdeal: [25, 28] },
    coco: { mmPorSemana: 50, temperaturaIdeal: [27, 32] }
  };
  
  return necessidades[this.especie] || { mmPorSemana: 25, temperaturaIdeal: [20, 28] };
};

module.exports = mongoose.model('Plantacao', plantacaoSchema);