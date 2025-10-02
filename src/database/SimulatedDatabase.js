// Sistema de dados simulados para demonstração sem MongoDB
class SimulatedDatabase {
  constructor() {
    this.usuarios = new Map();
    this.plantacoes = new Map();
    this.dadosClimaticos = new Map();
    this.solos = new Map();
    this.recomendacoes = new Map();
    this.nextId = 1;
    
    this.initializeData();
  }

  generateId() {
    return `sim_${this.nextId++}`;
  }

  initializeData() {
    // Usuário de exemplo
    const usuarioId = this.generateId();
    this.usuarios.set(usuarioId, {
      _id: usuarioId,
      nome: 'João Silva',
      email: 'joao@example.com',
      senha: '$2b$10$rI7c8dM7XlOWaGvK8RGNleL5kGhGPkXQjGXRbOVzPtU5LQJWlNBmG', // hash de '123456'
      telefone: '(11) 99999-9999',
      endereco: {
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000-000'
      },
      ativo: true,
      criadoEm: new Date()
    });

    // Plantações de exemplo
    const plantacao1Id = this.generateId();
    const plantacao2Id = this.generateId();
    const plantacao3Id = this.generateId();

    this.plantacoes.set(plantacao1Id, {
      _id: plantacao1Id,
      usuario: usuarioId,
      nome: 'Café Fazenda Sul',
      especie: 'cafe',
      variedade: 'Arábica',
      localizacao: {
        latitude: -23.5505,
        longitude: -46.6333,
        cidade: 'São Paulo',
        estado: 'SP',
        codigoEstacaoInmet: 'A001'
      },
      area: {
        hectares: 5.2,
        numeroPlantas: 1300
      },
      dataPlantio: new Date('2020-03-15'),
      statusDesenvolvimento: 'adulta',
      sistemaIrrigacao: {
        tipo: 'gotejamento',
        ativo: true
      },
      observacoes: 'Plantação principal de café, boa produtividade',
      ativa: true,
      createdAt: new Date()
    });

    this.plantacoes.set(plantacao2Id, {
      _id: plantacao2Id,
      usuario: usuarioId,
      nome: 'Laranjal Norte',
      especie: 'laranja',
      variedade: 'Pêra',
      localizacao: {
        latitude: -23.4505,
        longitude: -46.5333,
        cidade: 'São Paulo',
        estado: 'SP',
        codigoEstacaoInmet: 'A002'
      },
      area: {
        hectares: 3.8,
        numeroPlantas: 800
      },
      dataPlantio: new Date('2018-08-20'),
      statusDesenvolvimento: 'madura',
      sistemaIrrigacao: {
        tipo: 'microaspersao',
        ativo: true
      },
      observacoes: 'Plantação de laranjas para suco',
      ativa: true,
      createdAt: new Date()
    });

    this.plantacoes.set(plantacao3Id, {
      _id: plantacao3Id,
      usuario: usuarioId,
      nome: 'Banana Experimental',
      especie: 'banana',
      variedade: 'Nanica',
      localizacao: {
        latitude: -23.6505,
        longitude: -46.7333,
        cidade: 'São Paulo',
        estado: 'SP',
        codigoEstacaoInmet: 'A003'
      },
      area: {
        hectares: 1.5,
        numeroPlantas: 300
      },
      dataPlantio: new Date('2022-01-10'),
      statusDesenvolvimento: 'jovem',
      sistemaIrrigacao: {
        tipo: 'aspersao',
        ativo: false
      },
      observacoes: 'Plantação experimental de bananas',
      ativa: true,
      createdAt: new Date()
    });

    // Dados de solo
    const soloId = this.generateId();
    this.solos.set(soloId, {
      _id: soloId,
      plantacao: plantacao1Id,
      dataAnalise: new Date('2024-01-15'),
      ph: {
        valor: 5.2,
        classificacao: 'acido'
      },
      tipoSolo: {
        textura: 'franco_argiloso',
        drenagem: 'boa',
        cor: 'marrom escuro',
        profundidade: 80
      },
      nutrientes: {
        nitrogenio: { valor: 25, classificacao: 'medio' },
        fosforo: { valor: 15, classificacao: 'baixo' },
        potassio: { valor: 0.25, classificacao: 'medio' }
      },
      caracteristicasFisicas: {
        materiaOrganica: 3.2,
        ctc: 8.5,
        saturacaoBases: 65
      },
      recomendacoes: {
        calagem: {
          necessaria: true,
          quantidade: 2.5,
          tipoCalcario: 'dolomitico'
        }
      }
    });

    // Dados climáticos dos últimos 30 dias
    this.generateClimateData([plantacao1Id, plantacao2Id, plantacao3Id]);

    // Não gerar recomendações padrão para evitar confusão
    // As recomendações serão geradas apenas quando solicitadas
  }

  generateClimateData(plantacaoIds) {
    const hoje = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);

      plantacaoIds.forEach(plantacaoId => {
        const dadoId = this.generateId();
        
        // Simular dados realistas
        const tempBase = 25;
        const variacao = Math.sin((data.getMonth() / 12) * 2 * Math.PI) * 5;
        const ruido = (Math.random() - 0.5) * 6;
        const tempMedia = tempBase + variacao + ruido;
        
        this.dadosClimaticos.set(dadoId, {
          _id: dadoId,
          plantacao: plantacaoId,
          estacaoInmet: {
            codigo: 'A001',
            nome: 'Estação São Paulo'
          },
          data: data,
          temperatura: {
            maxima: tempMedia + 3 + Math.random() * 4,
            minima: tempMedia - 3 - Math.random() * 4,
            media: tempMedia
          },
          umidade: {
            relativa: 50 + Math.random() * 40,
            media: 60 + Math.random() * 30
          },
          precipitacao: {
            total: Math.random() < 0.3 ? Math.random() * 40 : 0
          },
          vento: {
            velocidade: Math.random() * 15,
            direcao: Math.random() * 360
          },
          pressaoAtmosferica: 1010 + (Math.random() - 0.5) * 30,
          radiacaoSolar: Math.random() * 25,
          origem: 'simulado',
          qualidade: 'boa'
        });
      });
    }
  }

  generateSampleRecommendations(usuarioId, plantacaoIds) {
    const hoje = new Date();
    
    // Recomendação de irrigação
    const rec1Id = this.generateId();
    this.recomendacoes.set(rec1Id, {
      _id: rec1Id,
      plantacao: plantacaoIds[0],
      usuario: usuarioId,
      tipo: 'irrigacao',
      prioridade: 'alta',
      titulo: 'Irrigação Necessária',
      descricao: 'A precipitação dos últimos 7 dias está abaixo do ideal. Déficit hídrico detectado.',
      acaoRecomendada: 'Aplicar irrigação de 15mm (aproximadamente 780 litros por hectare).',
      cronograma: {
        dataRecomendada: new Date(hoje.getTime() + 24 * 60 * 60 * 1000),
        dataLimite: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000)
      },
      status: 'pendente',
      ativa: true,
      createdAt: new Date()
    });

    // Recomendação de correção de pH
    const rec2Id = this.generateId();
    this.recomendacoes.set(rec2Id, {
      _id: rec2Id,
      plantacao: plantacaoIds[0],
      usuario: usuarioId,
      tipo: 'correcao_ph',
      prioridade: 'media',
      titulo: 'Correção de pH Necessária',
      descricao: 'O pH do solo (5.2) está abaixo do ideal para café. Solo ácido pode limitar a absorção de nutrientes.',
      acaoRecomendada: 'Aplicar 2.5 toneladas de calcário dolomítico por hectare.',
      cronograma: {
        dataRecomendada: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
        dataLimite: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
      },
      status: 'pendente',
      ativa: true,
      createdAt: new Date()
    });

    // Alerta climático
    const rec3Id = this.generateId();
    this.recomendacoes.set(rec3Id, {
      _id: rec3Id,
      plantacao: plantacaoIds[1],
      usuario: usuarioId,
      tipo: 'alerta_climatico',
      prioridade: 'urgente',
      titulo: 'Alerta: Possível Estresse Hídrico',
      descricao: 'Temperatura alta e baixa umidade detectadas. Condições podem causar estresse nas plantas.',
      acaoRecomendada: 'Aumentar frequência de irrigação e considerar sombreamento temporário.',
      cronograma: {
        dataRecomendada: hoje,
        dataLimite: new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
      },
      status: 'pendente',
      ativa: true,
      createdAt: new Date()
    });
  }

  // Métodos para simular operações do MongoDB
  findUsuarioPorEmail(email) {
    for (const usuario of this.usuarios.values()) {
      if (usuario.email === email) {
        return usuario;
      }
    }
    return null;
  }

  findPlantacoesPorUsuario(usuarioId) {
    return Array.from(this.plantacoes.values()).filter(
      p => p.usuario === usuarioId && p.ativa
    );
  }

  findDadosClimaticosPorPlantacao(plantacaoId, limite = 50) {
    return Array.from(this.dadosClimaticos.values())
      .filter(d => d.plantacao === plantacaoId)
      .sort((a, b) => new Date(b.data) - new Date(a.data))
      .slice(0, limite);
  }

  findRecomendacoesPorUsuario(usuarioId) {
    return Array.from(this.recomendacoes.values())
      .filter(r => r.usuario === usuarioId && r.ativa)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  findSoloPorPlantacao(plantacaoId) {
    for (const solo of this.solos.values()) {
      if (solo.plantacao === plantacaoId) {
        return solo;
      }
    }
    return null;
  }

  // Adicionar novos registros
  addUsuario(usuario) {
    const id = this.generateId();
    usuario._id = id;
    this.usuarios.set(id, usuario);
    return usuario;
  }

  addPlantacao(plantacao) {
    const id = this.generateId();
    plantacao._id = id;
    plantacao.ativa = true;
    plantacao.createdAt = new Date();
    this.plantacoes.set(id, plantacao);
    
    // Gerar dados climáticos históricos para a nova plantação
    this.generateClimateDataForPlantacao(id);
    
    return plantacao;
  }

  generateClimateDataForPlantacao(plantacaoId) {
    // Gerar 30 dias de dados climáticos históricos para a nova plantação
    for (let i = 30; i >= 0; i--) {
      const data = new Date();
      data.setDate(data.getDate() - i);
      
      // Simular dados mais realistas baseados na época do ano
      const dayOfYear = Math.floor((data - new Date(data.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const tempBase = 20 + 10 * Math.sin((dayOfYear / 365) * 2 * Math.PI); // Variação sazonal
      
      const dadoId = this.generateId();
      this.dadosClimaticos.set(dadoId, {
        _id: dadoId,
        plantacao: plantacaoId,
        data: data,
        temperatura: {
          maxima: Math.max(tempBase + 5 + Math.random() * 10, tempBase + 2),
          minima: Math.max(tempBase - 5 + Math.random() * 5, 5),
          media: tempBase + Math.random() * 6 - 3
        },
        umidade: {
          maxima: Math.min(70 + Math.random() * 30, 100),
          minima: Math.max(40 + Math.random() * 20, 20),
          media: 55 + Math.random() * 35
        },
        precipitacao: {
          total: Math.random() < 0.3 ? Math.random() * 40 : Math.random() * 5
        },
        vento: {
          velocidade: 2 + Math.random() * 15,
          direcao: Math.random() * 360
        },
        pressaoAtmosferica: 1010 + (Math.random() - 0.5) * 30,
        radiacaoSolar: 5 + Math.random() * 25,
        origem: 'simulado',
        qualidade: 'boa'
      });
    }
    
    console.log(`Gerados dados climáticos para plantação ${plantacaoId}: 31 registros`);
  }

  addRecomendacao(recomendacao) {
    const id = this.generateId();
    recomendacao._id = id;
    recomendacao.ativa = true;
    recomendacao.createdAt = new Date();
    this.recomendacoes.set(id, recomendacao);
    return recomendacao;
  }

  // Atualizar registros
  updateRecomendacao(id, updates) {
    const recomendacao = this.recomendacoes.get(id);
    if (recomendacao) {
      Object.assign(recomendacao, updates);
      return recomendacao;
    }
    return null;
  }

  // Buscar por ID
  findById(collection, id) {
    switch (collection) {
      case 'usuarios':
        return this.usuarios.get(id);
      case 'plantacoes':
        return this.plantacoes.get(id);
      case 'recomendacoes':
        return this.recomendacoes.get(id);
      case 'solos':
        return this.solos.get(id);
      default:
        return null;
    }
  }
}

// Exportar instância singleton
module.exports = new SimulatedDatabase();