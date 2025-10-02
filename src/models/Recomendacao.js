const mongoose = require('mongoose');

const recomendacaoSchema = new mongoose.Schema({
  plantacao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantacao',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  tipo: {
    type: String,
    enum: ['irrigacao', 'correcao_ph', 'adubacao', 'alerta_climatico', 'manejo_cultural', 'controle_pragas'],
    required: true
  },
  prioridade: {
    type: String,
    enum: ['baixa', 'media', 'alta', 'urgente'],
    default: 'media'
  },
  titulo: {
    type: String,
    required: true,
    maxlength: [200, 'Título deve ter no máximo 200 caracteres']
  },
  descricao: {
    type: String,
    required: true,
    maxlength: [1000, 'Descrição deve ter no máximo 1000 caracteres']
  },
  acaoRecomendada: {
    type: String,
    required: true,
    maxlength: [500, 'Ação recomendada deve ter no máximo 500 caracteres']
  },
  parametrosUsados: {
    dadosClimaticos: {
      temperaturaMedia: Number,
      precipitacaoTotal: Number,
      umidadeRelativa: Number,
      periodo: String // ex: "últimos 7 dias"
    },
    dadosSolo: {
      ph: Number,
      nutrientes: mongoose.Schema.Types.Mixed,
      dataAnalise: Date
    },
    dadosPlantacao: {
      especie: String,
      idade: Number,
      necessidadeHidrica: Number
    }
  },
  calculos: {
    deficit_hidrico: {
      valor: Number,
      unidade: String // mm
    },
    quantidade_irrigacao: {
      valor: Number,
      unidade: String // litros ou mm
    },
    quantidade_corretivo: {
      valor: Number,
      unidade: String // kg/ha ou t/ha
    },
    custoEstimado: {
      valor: Number,
      moeda: {
        type: String,
        default: 'BRL'
      }
    }
  },
  cronograma: {
    dataRecomendada: {
      type: Date,
      required: true
    },
    dataLimite: Date,
    frequencia: {
      tipo: {
        type: String,
        enum: ['unica', 'diaria', 'semanal', 'quinzenal', 'mensal', 'sazonal']
      },
      intervalo: Number // dias
    },
    duracaoEstimada: {
      valor: Number,
      unidade: {
        type: String,
        enum: ['minutos', 'horas', 'dias']
      }
    }
  },
  status: {
    type: String,
    enum: ['pendente', 'em_andamento', 'concluida', 'cancelada', 'vencida'],
    default: 'pendente'
  },
  confiabilidade: {
    type: Number,
    min: [0, 'Confiabilidade deve estar entre 0 e 1'],
    max: [1, 'Confiabilidade deve estar entre 0 e 1'],
    default: 0.8
  },
  algoritmoUsado: {
    versao: {
      type: String,
      default: '1.0'
    },
    regrasAplicadas: [String]
  },
  feedback: {
    aplicada: {
      type: Boolean,
      default: false
    },
    dataAplicacao: Date,
    efetividade: {
      type: Number,
      min: [1, 'Efetividade deve estar entre 1 e 5'],
      max: [5, 'Efetividade deve estar entre 1 e 5']
    },
    observacoes: String
  },
  alertas: [{
    tipo: {
      type: String,
      enum: ['clima_severo', 'seca', 'excesso_chuva', 'temperatura_extrema', 'risco_geada', 'vento_forte']
    },
    severidade: {
      type: String,
      enum: ['baixa', 'media', 'alta', 'critica']
    },
    dataAlerta: {
      type: Date,
      default: Date.now
    },
    validoAte: Date,
    mensagem: String
  }],
  historico: [{
    acao: String,
    data: {
      type: Date,
      default: Date.now
    },
    usuario: String,
    detalhes: mongoose.Schema.Types.Mixed
  }],
  ativa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Índices para consultas eficientes
recomendacaoSchema.index({ plantacao: 1, status: 1, 'cronograma.dataRecomendada': 1 });
recomendacaoSchema.index({ usuario: 1, status: 1 });
recomendacaoSchema.index({ tipo: 1, prioridade: 1 });
recomendacaoSchema.index({ 'cronograma.dataRecomendada': 1, status: 1 });

// Middleware para atualizar status baseado em datas
recomendacaoSchema.pre('save', function(next) {
  const agora = new Date();
  
  // Verifica se a recomendação venceu
  if (this.cronograma.dataLimite && this.cronograma.dataLimite < agora && this.status === 'pendente') {
    this.status = 'vencida';
  }
  
  // Adiciona entrada no histórico para mudanças de status
  if (this.isModified('status')) {
    this.historico.push({
      acao: `Status alterado para: ${this.status}`,
      data: agora,
      detalhes: { statusAnterior: this.getUpdate().$set?.status }
    });
  }
  
  next();
});

// Método para marcar como aplicada
recomendacaoSchema.methods.marcarComoAplicada = function(observacoes = '') {
  this.feedback.aplicada = true;
  this.feedback.dataAplicacao = new Date();
  this.feedback.observacoes = observacoes;
  this.status = 'concluida';
  
  this.historico.push({
    acao: 'Recomendação aplicada',
    data: new Date(),
    detalhes: { observacoes }
  });
  
  return this.save();
};

// Método para avaliar efetividade
recomendacaoSchema.methods.avaliarEfetividade = function(nota, observacoes = '') {
  this.feedback.efetividade = nota;
  if (observacoes) {
    this.feedback.observacoes = (this.feedback.observacoes || '') + ` | Avaliação: ${observacoes}`;
  }
  
  this.historico.push({
    acao: `Efetividade avaliada: ${nota}/5`,
    data: new Date(),
    detalhes: { nota, observacoes }
  });
  
  return this.save();
};

// Método para verificar se está vencida
recomendacaoSchema.methods.isVencida = function() {
  return this.cronograma.dataLimite && this.cronograma.dataLimite < new Date() && this.status === 'pendente';
};

// Método para obter cor baseada na prioridade
recomendacaoSchema.methods.getCorPrioridade = function() {
  const cores = {
    baixa: '#28a745',
    media: '#ffc107', 
    alta: '#fd7e14',
    urgente: '#dc3545'
  };
  return cores[this.prioridade] || '#6c757d';
};

// Método para obter ícone baseado no tipo
recomendacaoSchema.methods.getIconeTipo = function() {
  const icones = {
    irrigacao: '💧',
    correcao_ph: '⚗️',
    adubacao: '🌱',
    alerta_climatico: '🌦️',
    manejo_cultural: '✂️',
    controle_pragas: '🐛'
  };
  return icones[this.tipo] || '📋';
};

// Método para calcular dias até a data recomendada
recomendacaoSchema.methods.getDiasParaAplicacao = function() {
  const hoje = new Date();
  const dataRecomendada = this.cronograma.dataRecomendada;
  const diffTime = dataRecomendada - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return {
    dias: diffDays,
    status: diffDays < 0 ? 'atrasada' : diffDays === 0 ? 'hoje' : diffDays <= 3 ? 'proxima' : 'futura'
  };
};

// Método estático para obter recomendações pendentes por prioridade
recomendacaoSchema.statics.getPendentsPorPrioridade = function(usuarioId) {
  return this.aggregate([
    {
      $match: {
        usuario: mongoose.Types.ObjectId(usuarioId),
        status: 'pendente',
        ativa: true
      }
    },
    {
      $group: {
        _id: '$prioridade',
        count: { $sum: 1 },
        recomendacoes: { $push: '$$ROOT' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
};

module.exports = mongoose.model('Recomendacao', recomendacaoSchema);