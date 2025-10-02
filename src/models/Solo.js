const mongoose = require('mongoose');

const soloSchema = new mongoose.Schema({
  plantacao: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plantacao',
    required: true
  },
  dataAnalise: {
    type: Date,
    required: true,
    default: Date.now
  },
  ph: {
    valor: {
      type: Number,
      required: [true, 'Valor do pH é obrigatório'],
      min: [0, 'pH deve estar entre 0 e 14'],
      max: [14, 'pH deve estar entre 0 e 14']
    },
    classificacao: {
      type: String,
      enum: ['muito_acido', 'acido', 'ligeiramente_acido', 'neutro', 'ligeiramente_alcalino', 'alcalino', 'muito_alcalino']
    }
  },
  tipoSolo: {
    textura: {
      type: String,
      enum: ['arenoso', 'franco_arenoso', 'franco', 'franco_argiloso', 'argiloso', 'argilo_arenoso'],
      required: true
    },
    drenagem: {
      type: String,
      enum: ['excessiva', 'boa', 'moderada', 'imperfeitamente_drenado', 'mal_drenado'],
      default: 'boa'
    },
    cor: String,
    profundidade: {
      type: Number, // em centímetros
      min: [10, 'Profundidade deve ser pelo menos 10cm']
    }
  },
  nutrientes: {
    nitrogenio: {
      valor: Number, // mg/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    },
    fosforo: {
      valor: Number, // mg/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    },
    potassio: {
      valor: Number, // cmolc/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    },
    calcio: {
      valor: Number, // cmolc/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    },
    magnesio: {
      valor: Number, // cmolc/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    },
    enxofre: {
      valor: Number, // mg/dm³
      classificacao: {
        type: String,
        enum: ['muito_baixo', 'baixo', 'medio', 'alto', 'muito_alto']
      }
    }
  },
  micronutrientes: {
    ferro: Number, // mg/dm³
    manganes: Number, // mg/dm³
    zinco: Number, // mg/dm³
    cobre: Number, // mg/dm³
    boro: Number, // mg/dm³
    molibdenio: Number // mg/dm³
  },
  caracteristicasFisicas: {
    materiaOrganica: {
      type: Number, // %
      min: [0, 'Matéria orgânica não pode ser negativa'],
      max: [100, 'Matéria orgânica não pode ser maior que 100%']
    },
    ctc: {
      type: Number, // cmolc/dm³ - Capacidade de Troca Catiônica
      min: [0, 'CTC não pode ser negativa']
    },
    saturacaoBases: {
      type: Number, // %
      min: [0, 'Saturação por bases não pode ser negativa'],
      max: [100, 'Saturação por bases não pode ser maior que 100%']
    },
    aluminio: {
      valor: Number, // cmolc/dm³
      saturacao: Number // %
    }
  },
  recomendacoes: {
    calagem: {
      necessaria: {
        type: Boolean,
        default: false
      },
      quantidade: Number, // t/ha
      tipoCalcario: {
        type: String,
        enum: ['calcitico', 'dolomitico', 'magnesiano']
      }
    },
    adubacao: {
      nitrogenio: Number, // kg/ha
      fosforo: Number, // kg/ha
      potassio: Number, // kg/ha
      observacoes: String
    }
  },
  laboratorio: {
    nome: String,
    responsavel: String,
    metodologia: String
  },
  observacoes: {
    type: String,
    maxlength: [500, 'Observações devem ter no máximo 500 caracteres']
  }
}, {
  timestamps: true
});

// Índices
soloSchema.index({ plantacao: 1, dataAnalise: -1 });

// Middleware para classificar pH antes de salvar
soloSchema.pre('save', function(next) {
  if (this.ph && this.ph.valor) {
    const ph = this.ph.valor;
    if (ph < 4.5) this.ph.classificacao = 'muito_acido';
    else if (ph < 5.5) this.ph.classificacao = 'acido';
    else if (ph < 6.5) this.ph.classificacao = 'ligeiramente_acido';
    else if (ph < 7.5) this.ph.classificacao = 'neutro';
    else if (ph < 8.5) this.ph.classificacao = 'ligeiramente_alcalino';
    else if (ph < 9.5) this.ph.classificacao = 'alcalino';
    else this.ph.classificacao = 'muito_alcalino';
  }
  next();
});

// Método para classificar nutrientes
soloSchema.methods.classificarNutrientes = function() {
  const classificacoes = {
    nitrogenio: { baixo: 20, medio: 40, alto: 60 },
    fosforo: { baixo: 10, medio: 20, alto: 40 },
    potassio: { baixo: 0.15, medio: 0.30, alto: 0.60 }
  };
  
  ['nitrogenio', 'fosforo', 'potassio'].forEach(nutriente => {
    if (this.nutrientes[nutriente] && this.nutrientes[nutriente].valor !== undefined) {
      const valor = this.nutrientes[nutriente].valor;
      const limites = classificacoes[nutriente];
      
      if (valor < limites.baixo * 0.5) {
        this.nutrientes[nutriente].classificacao = 'muito_baixo';
      } else if (valor < limites.baixo) {
        this.nutrientes[nutriente].classificacao = 'baixo';
      } else if (valor < limites.medio) {
        this.nutrientes[nutriente].classificacao = 'medio';
      } else if (valor < limites.alto) {
        this.nutrientes[nutriente].classificacao = 'alto';
      } else {
        this.nutrientes[nutriente].classificacao = 'muito_alto';
      }
    }
  });
};

// Método para verificar necessidade de calagem
soloSchema.methods.verificarNecessidadeCalagem = function() {
  if (!this.ph || !this.ph.valor) return false;
  
  // Geralmente plantas perenes preferem pH entre 6.0 e 7.0
  const phIdeal = 6.5;
  const necessitaCalagem = this.ph.valor < 5.5;
  
  if (necessitaCalagem) {
    this.recomendacoes.calagem.necessaria = true;
    // Fórmula simplificada para cálculo de calagem
    const deficitPh = phIdeal - this.ph.valor;
    this.recomendacoes.calagem.quantidade = Math.round(deficitPh * 2 * 100) / 100; // t/ha
    
    // Tipo de calcário baseado no magnésio
    if (this.nutrientes.magnesio && this.nutrientes.magnesio.valor < 0.5) {
      this.recomendacoes.calagem.tipoCalcario = 'dolomitico';
    } else {
      this.recomendacoes.calagem.tipoCalcario = 'calcitico';
    }
  }
  
  return necessitaCalagem;
};

// Método para obter resumo da fertilidade
soloSchema.methods.getResumoFertilidade = function() {
  const problemas = [];
  const pontosFortesArray = [];
  
  if (this.ph.valor < 5.5) problemas.push('Solo ácido - necessita calagem');
  if (this.ph.valor > 8.0) problemas.push('Solo alcalino - pode limitar absorção de nutrientes');
  
  ['nitrogenio', 'fosforo', 'potassio'].forEach(nutriente => {
    if (this.nutrientes[nutriente]) {
      const classif = this.nutrientes[nutriente].classificacao;
      if (classif === 'muito_baixo' || classif === 'baixo') {
        problemas.push(`${nutriente} baixo`);
      } else if (classif === 'alto' || classif === 'muito_alto') {
        pontosFortesArray.push(`${nutriente} adequado`);
      }
    }
  });
  
  return {
    problemas,
    pontosFortes: pontosFortesArray,
    necessitaCalagem: this.verificarNecessidadeCalagem()
  };
};

module.exports = mongoose.model('Solo', soloSchema);