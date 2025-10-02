const Plantacao = require('../models/Plantacao');
const Solo = require('../models/Solo');
const DadosClimaticos = require('../models/DadosClimaticos');

class PlantacaoController {
  // Listar plantações do usuário
  static async index(req, res) {
    try {
      const plantacoes = await Plantacao.find({ 
        usuario: req.session.user.id,
        ativa: true 
      })
      .sort({ createdAt: -1 })
      .populate('usuario', 'nome email');

      res.render('plantacao/index', {
        title: 'Minhas Plantações - Conecta Engenharias Agro',
        plantacoes
      });
    } catch (error) {
      console.error('Erro ao listar plantações:', error);
      res.status(500).render('error', {
        message: 'Erro ao carregar plantações'
      });
    }
  }

  // Formulário de nova plantação
  static async create(req, res) {
    try {
      res.render('plantacao/create', {
        title: 'Nova Plantação - Conecta Engenharias Agro'
      });
    } catch (error) {
      console.error('Erro ao carregar formulário:', error);
      res.status(500).render('error', {
        message: 'Erro interno do servidor'
      });
    }
  }

  // Salvar nova plantação
  static async store(req, res) {
    try {
      const {
        nome, especie, variedade, latitude, longitude, cidade, estado,
        hectares, numeroPlantas, dataPlantio, statusDesenvolvimento,
        tipoIrrigacao, irrigacaoAtiva, observacoes
      } = req.body;

      // Validações básicas
      if (!nome || !especie || !latitude || !longitude || !hectares || !dataPlantio) {
        return res.status(400).render('plantacao/create', {
          title: 'Nova Plantação - Conecta Engenharias Agro',
          error: 'Campos obrigatórios não preenchidos',
          formData: req.body
        });
      }

      // Validar coordenadas
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).render('plantacao/create', {
          title: 'Nova Plantação - Conecta Engenharias Agro',
          error: 'Coordenadas geográficas inválidas',
          formData: req.body
        });
      }

      // Criar plantação
      const novaPlantacao = new Plantacao({
        usuario: req.session.user.id,
        nome: nome.trim(),
        especie,
        variedade: variedade?.trim(),
        localizacao: {
          latitude: lat,
          longitude: lng,
          cidade: cidade?.trim(),
          estado: estado?.trim()
        },
        area: {
          hectares: parseFloat(hectares),
          numeroPlantas: numeroPlantas ? parseInt(numeroPlantas) : undefined
        },
        dataPlantio: new Date(dataPlantio),
        statusDesenvolvimento: statusDesenvolvimento || 'muda',
        sistemaIrrigacao: {
          tipo: tipoIrrigacao || 'nenhum',
          ativo: irrigacaoAtiva === 'on'
        },
        observacoes: observacoes?.trim()
      });

      await novaPlantacao.save();

      res.redirect('/plantacao?success=Plantação cadastrada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar plantação:', error);
      
      let errorMessage = 'Erro interno do servidor';
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        errorMessage = errors.join(', ');
      }

      res.status(500).render('plantacao/create', {
        title: 'Nova Plantação - Conecta Engenharias Agro',
        error: errorMessage,
        formData: req.body
      });
    }
  }

  // Exibir detalhes de uma plantação
  static async show(req, res) {
    try {
      const { id } = req.params;
      
      const plantacao = await Plantacao.findOne({
        _id: id,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).render('error', {
          message: 'Plantação não encontrada'
        });
      }

      // Buscar dados relacionados
      const dadosSolo = await Solo.findOne({ plantacao: id })
        .sort({ dataAnalise: -1 });

      const dadosClimaticos = await DadosClimaticos.find({ plantacao: id })
        .sort({ data: -1 })
        .limit(30); // Últimos 30 dias

      // Calcular estatísticas
      const idade = plantacao.calcularIdade();
      const necessidadeHidrica = plantacao.getNecessidadeHidrica();

      res.render('plantacao/show', {
        title: `${plantacao.nome} - Conecta Engenharias Agro`,
        plantacao,
        dadosSolo,
        dadosClimaticos,
        idade,
        necessidadeHidrica
      });
    } catch (error) {
      console.error('Erro ao exibir plantação:', error);
      res.status(500).render('error', {
        message: 'Erro ao carregar plantação'
      });
    }
  }

  // Formulário de edição
  static async edit(req, res) {
    try {
      const { id } = req.params;
      
      const plantacao = await Plantacao.findOne({
        _id: id,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).render('error', {
          message: 'Plantação não encontrada'
        });
      }

      res.render('plantacao/edit', {
        title: `Editar ${plantacao.nome} - Conecta Engenharias Agro`,
        plantacao
      });
    } catch (error) {
      console.error('Erro ao carregar formulário de edição:', error);
      res.status(500).render('error', {
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar plantação
  static async update(req, res) {
    try {
      const { id } = req.params;
      const {
        nome, especie, variedade, latitude, longitude, cidade, estado,
        hectares, numeroPlantas, dataPlantio, statusDesenvolvimento,
        tipoIrrigacao, irrigacaoAtiva, observacoes
      } = req.body;

      const plantacao = await Plantacao.findOne({
        _id: id,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).render('error', {
          message: 'Plantação não encontrada'
        });
      }

      // Atualizar dados
      plantacao.nome = nome?.trim() || plantacao.nome;
      plantacao.especie = especie || plantacao.especie;
      plantacao.variedade = variedade?.trim();
      
      if (latitude && longitude) {
        plantacao.localizacao.latitude = parseFloat(latitude);
        plantacao.localizacao.longitude = parseFloat(longitude);
      }
      
      plantacao.localizacao.cidade = cidade?.trim();
      plantacao.localizacao.estado = estado?.trim();
      
      if (hectares) {
        plantacao.area.hectares = parseFloat(hectares);
      }
      
      if (numeroPlantas) {
        plantacao.area.numeroPlantas = parseInt(numeroPlantas);
      }
      
      if (dataPlantio) {
        plantacao.dataPlantio = new Date(dataPlantio);
      }
      
      plantacao.statusDesenvolvimento = statusDesenvolvimento || plantacao.statusDesenvolvimento;
      plantacao.sistemaIrrigacao.tipo = tipoIrrigacao || plantacao.sistemaIrrigacao.tipo;
      plantacao.sistemaIrrigacao.ativo = irrigacaoAtiva === 'on';
      plantacao.observacoes = observacoes?.trim();

      await plantacao.save();

      res.redirect(`/plantacao/${id}?success=Plantação atualizada com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar plantação:', error);
      
      let errorMessage = 'Erro interno do servidor';
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        errorMessage = errors.join(', ');
      }

      const plantacao = await Plantacao.findById(req.params.id);
      res.status(500).render('plantacao/edit', {
        title: `Editar ${plantacao?.nome} - Conecta Engenharias Agro`,
        plantacao,
        error: errorMessage
      });
    }
  }

  // Deletar plantação (soft delete)
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      
      const plantacao = await Plantacao.findOneAndUpdate(
        {
          _id: id,
          usuario: req.session.user.id
        },
        { ativa: false },
        { new: true }
      );

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      res.redirect('/plantacao?success=Plantação removida com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar plantação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // API - Listar plantações (JSON)
  static async apiIndex(req, res) {
    try {
      const plantacoes = await Plantacao.find({ 
        usuario: req.user._id,
        ativa: true 
      })
      .sort({ createdAt: -1 })
      .select('-__v');

      res.json(plantacoes);
    } catch (error) {
      console.error('Erro na API de plantações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // API - Obter plantação específica
  static async apiShow(req, res) {
    try {
      const { id } = req.params;
      
      const plantacao = await Plantacao.findOne({
        _id: id,
        usuario: req.user._id
      }).select('-__v');

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      // Incluir dados adicionais
      const idade = plantacao.calcularIdade();
      const necessidadeHidrica = plantacao.getNecessidadeHidrica();

      res.json({
        ...plantacao.toObject(),
        idade,
        necessidadeHidrica
      });
    } catch (error) {
      console.error('Erro na API de plantação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // API - Buscar plantações por proximidade
  static async apiNearby(req, res) {
    try {
      const { latitude, longitude, raio = 50 } = req.query; // raio em km

      if (!latitude || !longitude) {
        return res.status(400).json({ 
          error: 'Latitude e longitude são obrigatórias' 
        });
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const maxDistance = parseFloat(raio) * 1000; // converter para metros

      // Busca por proximidade (simplificada)
      const plantacoes = await Plantacao.find({
        usuario: req.user._id,
        ativa: true,
        'localizacao.latitude': {
          $gte: lat - (maxDistance / 111000), // aproximadamente 1 grau = 111km
          $lte: lat + (maxDistance / 111000)
        },
        'localizacao.longitude': {
          $gte: lng - (maxDistance / 111000),
          $lte: lng + (maxDistance / 111000)
        }
      }).select('-__v');

      res.json(plantacoes);
    } catch (error) {
      console.error('Erro na busca por proximidade:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = PlantacaoController;