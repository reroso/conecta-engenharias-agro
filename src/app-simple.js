const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Importar banco de dados simulado
const simulatedDB = require('./database/SimulatedDatabase');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Configuração da sessão
app.use(session({
  secret: process.env.SESSION_SECRET || 'conecta-agro-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Configuração do EJS
app.use(expressLayouts);
app.set('layout', 'layout');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para disponibilizar usuário nas views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  next();
}

// ROTAS

// Página de login
app.get('/auth/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { 
    title: 'Login - Conecta Engenharias Agro',
    error: null,
    layout: false
  });
});

// Processar login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.render('auth/login', {
        title: 'Login - Conecta Engenharias Agro',
        error: 'Email e senha são obrigatórios',
        layout: false
      });
    }

    const usuario = simulatedDB.findUsuarioPorEmail(email.toLowerCase());
    if (!usuario) {
      return res.render('auth/login', {
        title: 'Login - Conecta Engenharias Agro',
        error: 'Email ou senha incorretos',
        layout: false
      });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      return res.render('auth/login', {
        title: 'Login - Conecta Engenharias Agro',
        error: 'Email ou senha incorretos',
        layout: false
      });
    }

    req.session.user = {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email
    };

    res.redirect('/');
  } catch (error) {
    console.error('Erro no login:', error);
    res.render('auth/login', {
      title: 'Login - Conecta Engenharias Agro',
      error: 'Erro interno do servidor',
      layout: false
    });
  }
});

// Página de registro
app.get('/auth/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { 
    title: 'Cadastro - Conecta Engenharias Agro',
    error: null,
    layout: false
  });
});

// Processar registro
app.post('/auth/register', async (req, res) => {
  try {
    const { nome, email, senha, confirmarSenha } = req.body;

    if (!nome || !email || !senha) {
      return res.render('auth/register', {
        title: 'Cadastro - Conecta Engenharias Agro',
        error: 'Nome, email e senha são obrigatórios',
        layout: false
      });
    }

    if (senha !== confirmarSenha) {
      return res.render('auth/register', {
        title: 'Cadastro - Conecta Engenharias Agro',
        error: 'Senhas não coincidem',
        layout: false
      });
    }

    if (simulatedDB.findUsuarioPorEmail(email.toLowerCase())) {
      return res.render('auth/register', {
        title: 'Cadastro - Conecta Engenharias Agro',
        error: 'Email já cadastrado',
        layout: false
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const novoUsuario = simulatedDB.addUsuario({
      nome: nome.trim(),
      email: email.toLowerCase().trim(),
      senha: senhaHash,
      ativo: true,
      criadoEm: new Date()
    });

    req.session.user = {
      id: novoUsuario._id,
      nome: novoUsuario.nome,
      email: novoUsuario.email
    };

    res.redirect('/');
  } catch (error) {
    console.error('Erro no registro:', error);
    res.render('auth/register', {
      title: 'Cadastro - Conecta Engenharias Agro',
      error: 'Erro interno do servidor',
      layout: false
    });
  }
});

// Logout
app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
      return res.status(500).json({ error: 'Erro ao fazer logout' });
    }
    res.clearCookie('connect.sid');
    res.redirect('/auth/login');
  });
});

// Redirecionamentos para compatibilidade
app.get('/login', (req, res) => {
  res.redirect('/auth/login');
});

app.get('/register', (req, res) => {
  res.redirect('/auth/register');
});

// Dashboard (página principal com geração automática de recomendações)
app.get('/', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    
    // Verificar e gerar recomendações automaticamente se necessário
    await verificarEGerarRecomendacoesAutomaticas(usuarioId);
    
    res.render('dashboard', { 
      title: 'Dashboard - Conecta Engenharias Agro'
    });
  } catch (error) {
    console.error('Erro no dashboard:', error);
    res.render('dashboard', { 
      title: 'Dashboard - Conecta Engenharias Agro'
    });
  }
});

// Função auxiliar para verificar e gerar recomendações automaticamente
async function verificarEGerarRecomendacoesAutomaticas(usuarioId) {
  try {
    const CafeAlgorithm = require('./services/CafeAlgorithm');
    const algoritmo = new CafeAlgorithm();
    
    const plantacoes = simulatedDB.findPlantacoesPorUsuario(usuarioId);
    const agora = new Date();
    
    for (const plantacao of plantacoes) {
      // Apenas plantações de café
      if (plantacao.especie !== 'cafe') continue;
      
      // Verificar se precisa de novas recomendações
      const recomendacoesExistentes = simulatedDB.findRecomendacoesPorUsuario(usuarioId)
        .filter(r => r.plantacao === plantacao._id && r.status === 'pendente');
      
      // Verificar última geração de recomendações
      const ultimaRecomendacao = recomendacoesExistentes
        .sort((a, b) => {
          const dateA = new Date(a.criadaEm || a.createdAt);
          const dateB = new Date(b.criadaEm || b.createdAt);
          return dateB - dateA;
        })[0];
      
      let precisaGerar = false;
      
      if (!ultimaRecomendacao) {
        precisaGerar = true; // Nunca gerou recomendações
      } else {
        const dataUltimaRecomendacao = new Date(ultimaRecomendacao.criadaEm || ultimaRecomendacao.createdAt);
        const horasDesdeUltima = (agora - dataUltimaRecomendacao) / (1000 * 60 * 60);
        precisaGerar = horasDesdeUltima > 24; // Gerar novas a cada 24 horas
      }
      
      if (precisaGerar) {
        // Buscar dados climáticos
        let dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
        
        // Verificar se dados climáticos são recentes (últimas 48h)
        if (dadosClimaticos.length > 0) {
          const dadoMaisRecente = dadosClimaticos[0];
          const horasDesdeUltimoDado = (agora - new Date(dadoMaisRecente.data)) / (1000 * 60 * 60);
          
          if (horasDesdeUltimoDado > 48) {
            // Atualizar dados climáticos se muito antigos
            await simulatedDB.generateClimateDataForPlantacao(plantacao._id, 7);
            dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
          }
        } else {
          // Gerar dados climáticos se não existirem
          await simulatedDB.generateClimateDataForPlantacao(plantacao._id, 7);
          dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
        }
        
        // Preparar dados do solo
        const dadosSolo = {
          ph: plantacao.ph_solo || 6.0,
          tipo_solo: plantacao.tipo_solo || 'medio'
        };
        
        // Buscar previsão do tempo para análise preditiva
        let previsao5Dias = null;
        try {
          const PrevisaoService = require('./services/PrevisaoService');
          previsao5Dias = await PrevisaoService.buscarPrevisao5Dias(
            plantacao.localizacao.latitude, 
            plantacao.localizacao.longitude
          );
        } catch (error) {
          console.warn('⚠️ Erro ao buscar previsão para verificação automática:', error.message);
        }
        
        // Gerar novas recomendações (históricas + preditivas)
        const recomendacoes = await algoritmo.gerarRecomendacoes(plantacao, dadosClimaticos, dadosSolo, previsao5Dias);
        
        // Salvar recomendações
        recomendacoes.forEach(rec => {
          const recomendacaoFormatada = algoritmo.formatarRecomendacao(rec, plantacao._id, usuarioId);
          simulatedDB.addRecomendacao(recomendacaoFormatada);
        });
        
        if (recomendacoes.length > 0) {
          const preditivas = recomendacoes.filter(r => r.parametros?.tipo_analise === 'preditiva').length;
          console.log(`✅ ${recomendacoes.length} recomendações automáticas geradas para ${plantacao.nome} (${preditivas} preditivas)`);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️ Erro na geração automática de recomendações:', error.message);
  }
}

// Páginas principais do sistema
app.get('/plantacao', requireAuth, async (req, res) => {
  // Verificar recomendações automáticas
  await verificarEGerarRecomendacoesAutomaticas(req.session.user.id);
  
  res.render('plantacao/index', { 
    title: 'Plantações - Conecta Engenharias Agro'
  });
});

app.get('/plantacao/nova', requireAuth, (req, res) => {
  res.render('plantacao/nova', { 
    title: 'Nova Plantação - Conecta Engenharias Agro'
  });
});

app.get('/clima', requireAuth, async (req, res) => {
  // Verificar recomendações automáticas
  await verificarEGerarRecomendacoesAutomaticas(req.session.user.id);
  
  res.render('clima/index', { 
    title: 'Dados Climáticos - Conecta Engenharias Agro'
  });
});

app.get('/recomendacao', requireAuth, async (req, res) => {
  // Verificar recomendações automáticas
  await verificarEGerarRecomendacoesAutomaticas(req.session.user.id);
  
  res.render('recomendacao/index', { 
    title: 'Recomendações - Conecta Engenharias Agro'
  });
});

app.get('/auth/profile', requireAuth, (req, res) => {
  res.render('auth/profile', { 
    title: 'Perfil - Conecta Engenharias Agro'
  });
});

// API: Listar plantações
app.get('/api/plantacoes', requireAuth, (req, res) => {
  const plantacoes = simulatedDB.findPlantacoesPorUsuario(req.session.user.id);
  res.json(plantacoes);
});

// API: Criar nova plantação (especializado em café)
app.post('/api/plantacoes', requireAuth, async (req, res) => {
  try {
    const { 
      nome, especie, variedade_cafe, fase_fenologica, area, 
      latitude, longitude, cidade, estado, 
      ph_solo, tipo_solo, data_plantio, ultima_adubacao,
      observacoes 
    } = req.body;

    // Validação campos obrigatórios
    if (!nome || !especie || !variedade_cafe || !fase_fenologica || !area || 
        !latitude || !longitude || !cidade || !estado || !ph_solo || !tipo_solo || !data_plantio) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    // Validação específica para café
    if (especie !== 'cafe') {
      return res.status(400).json({ error: 'Este sistema é especializado em cafeicultura. Apenas plantações de café são aceitas.' });
    }

    // Validação pH
    const ph = parseFloat(ph_solo);
    if (ph < 3.0 || ph > 9.0) {
      return res.status(400).json({ error: 'pH do solo deve estar entre 3.0 e 9.0' });
    }

    const novaPlantacao = {
      usuario: req.session.user.id,
      nome: nome.trim(),
      especie,
      variedade_cafe, // Nova: variedade específica do café
      fase_fenologica, // Nova: fase atual da planta
      variedade: variedade_cafe, // Mantém compatibilidade
      area: parseFloat(area),
      localizacao: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        cidade: cidade.trim(),
        estado
      },
      // Novos campos específicos para café
      ph_solo: ph,
      tipo_solo,
      data_plantio: new Date(data_plantio),
      ultima_adubacao: ultima_adubacao ? new Date(ultima_adubacao) : null,
      observacoes: observacoes || '',
      ativo: true,
      criadoEm: new Date()
    };

    const plantacao = simulatedDB.addPlantacao(novaPlantacao);
    
    // Gerar dados climáticos iniciais para a nova plantação
    await simulatedDB.generateClimateDataForPlantacao(plantacao._id, 7);
    
    // Gerar recomendações automaticamente após criar plantação
    try {
      const CafeAlgorithm = require('./services/CafeAlgorithm');
      const algoritmo = new CafeAlgorithm();
      
      // Buscar dados climáticos recém-criados
      const dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
      
      // Preparar dados do solo
      const dadosSolo = {
        ph: plantacao.ph_solo,
        tipo_solo: plantacao.tipo_solo
      };
      
      // Buscar previsão do tempo para análise preditiva
      let previsao5Dias = null;
      try {
        const PrevisaoService = require('./services/PrevisaoService');
        previsao5Dias = await PrevisaoService.buscarPrevisao5Dias(
          plantacao.localizacao.latitude, 
          plantacao.localizacao.longitude
        );
        console.log(`✅ Previsão obtida para ${plantacao.nome}: ${previsao5Dias.length} dias`);
      } catch (error) {
        console.warn('⚠️ Erro ao buscar previsão, continuando sem análise preditiva:', error.message);
      }
      
      // Gerar recomendações usando algoritmo determinístico + preditivo
      const recomendacoes = await algoritmo.gerarRecomendacoes(plantacao, dadosClimaticos, dadosSolo, previsao5Dias);
      
      // Salvar recomendações
      recomendacoes.forEach(rec => {
        const recomendacaoFormatada = algoritmo.formatarRecomendacao(rec, plantacao._id, req.session.user.id);
        simulatedDB.addRecomendacao(recomendacaoFormatada);
      });
      
      const recomendacoesPreditivas = recomendacoes.filter(r => r.parametros?.tipo_analise === 'preditiva').length;
      console.log(`${recomendacoes.length} recomendações geradas para ${plantacao.nome} (${recomendacoesPreditivas} preditivas)`);
    } catch (error) {
      console.warn('Erro ao gerar recomendações automáticas:', error.message);
      // Não falhar o cadastro se recomendações falharem
    }
    
    res.status(201).json({ 
      message: 'Plantação de café cadastrada com sucesso!',
      plantacao: { 
        id: plantacao._id, 
        nome: plantacao.nome,
        variedade: plantacao.variedade_cafe,
        fase: plantacao.fase_fenologica
      },
      recomendacoesGeradas: true // Indica que recomendações foram geradas automaticamente
    });

  } catch (error) {
    console.error('Erro ao criar plantação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API: Dados climáticos para gráficos
app.get('/api/clima/:plantacaoId', requireAuth, (req, res) => {
  try {
    const { plantacaoId } = req.params;
    const dados = simulatedDB.findDadosClimaticosPorPlantacao(plantacaoId, 30);
    
    if (dados.length === 0) {
      return res.json({ 
        labels: [], 
        datasets: {
          temperatura: { maxima: [], minima: [], media: [] },
          umidade: [],
          precipitacao: [],
          vento: []
        },
        message: 'Nenhum dado climático encontrado'
      });
    }
    
    // Formatar dados para Chart.js (ordenar por data crescente para o gráfico)
    const dadosOrdenados = dados.sort((a, b) => new Date(a.data) - new Date(b.data));
    const labels = dadosOrdenados.map(d => new Date(d.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
    
    const datasets = {
      temperatura: {
        maxima: dadosOrdenados.map(d => d.temperatura?.maxima || 0),
        minima: dadosOrdenados.map(d => d.temperatura?.minima || 0),
        media: dadosOrdenados.map(d => d.temperatura?.media || 0)
      },
      umidade: dadosOrdenados.map(d => d.umidade?.media || 0),
      precipitacao: dadosOrdenados.map(d => d.precipitacao?.total || 0),
      vento: dadosOrdenados.map(d => d.vento?.velocidade || 0)
    };

    res.json({ labels, datasets });
  } catch (error) {
    console.error('Erro ao buscar dados climáticos:', error);
    res.status(500).json({ error: 'Erro ao carregar dados climáticos' });
  }
});

// API: Listar todas as recomendações
app.get('/api/recomendacoes', requireAuth, (req, res) => {
  try {
    const recomendacoes = simulatedDB.findRecomendacoesPorUsuario(req.session.user.id);
    console.log(`🔍 Debug - Recomendações encontradas: ${recomendacoes.length}`);
    
    const hoje = new Date();
    
    const recomendacoesFormatadas = recomendacoes.map(r => {
      const plantacao = simulatedDB.findById('plantacoes', r.plantacao);
      const diasRestantes = Math.ceil((new Date(r.cronograma.dataLimite) - hoje) / (1000 * 60 * 60 * 24));
      
      return {
        id: r._id,
        titulo: r.titulo,
        tipo: r.tipo,
        plantacao: plantacao ? plantacao.nome : 'Plantação não encontrada',
        plantacaoId: r.plantacao,
        prioridade: r.prioridade,
        status: r.status,
        descricao: r.descricao,
        acaoRecomendada: r.acaoRecomendada,
        dataRecomendada: r.cronograma.dataRecomendada,
        dataLimite: r.cronograma.dataLimite,
        criadaEm: r.criadaEm || r.createdAt,
        diasRestantes: { dias: diasRestantes }
      };
    });

    console.log(`📋 Debug - Recomendações formatadas: ${recomendacoesFormatadas.length}`);
    res.json(recomendacoesFormatadas);
  } catch (error) {
    console.error('Erro ao listar recomendações:', error);
    res.status(500).json({ error: 'Erro interno ao listar recomendações' });
  }
});

// API: Recomendações dashboard
app.get('/api/recomendacoes/dashboard', requireAuth, (req, res) => {
  const recomendacoes = simulatedDB.findRecomendacoesPorUsuario(req.session.user.id);
  
  const estatisticas = {
    total: recomendacoes.length,
    porStatus: [
      { _id: 'pendente', count: recomendacoes.filter(r => r.status === 'pendente').length },
      { _id: 'concluida', count: recomendacoes.filter(r => r.status === 'concluida').length },
      { _id: 'vencida', count: recomendacoes.filter(r => r.status === 'vencida').length }
    ]
  };

  const hoje = new Date();
  const urgentes = recomendacoes
    .filter(r => r.status === 'pendente' && new Date(r.cronograma.dataLimite) <= new Date(hoje.getTime() + 2 * 24 * 60 * 60 * 1000))
    .map(r => {
      const plantacao = simulatedDB.findById('plantacoes', r.plantacao);
      const diasRestantes = Math.ceil((new Date(r.cronograma.dataLimite) - hoje) / (1000 * 60 * 60 * 24));
      
      return {
        id: r._id,
        titulo: r.titulo,
        plantacao: plantacao ? plantacao.nome : 'Plantação não encontrada',
        prioridade: r.prioridade,
        dataLimite: r.cronograma.dataLimite,
        diasRestantes: { dias: diasRestantes }
      };
    });

  res.json({ estatisticas, urgentes });
});

// API: Resumo climático
app.get('/api/clima/resumo/:plantacaoId', requireAuth, (req, res) => {
  try {
    const { plantacaoId } = req.params;
    const dados = simulatedDB.findDadosClimaticosPorPlantacao(plantacaoId, 7);
    
    if (dados.length === 0) {
      return res.json({ dados: null, message: 'Nenhum dado climático disponível' });
    }

    const temperaturas = dados.map(d => d.temperatura?.media).filter(t => t !== null && t !== undefined);
    const precipitacoes = dados.map(d => d.precipitacao?.total || 0);
    const umidades = dados.map(d => d.umidade?.media).filter(u => u !== null && u !== undefined);

    const resumo = {
      periodo: {
        diasComDados: dados.length
      },
      temperatura: {
        media: temperaturas.length > 0 ? temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length : null
      },
      precipitacao: {
        total: precipitacoes.reduce((a, b) => a + b, 0)
      },
      umidade: {
        media: umidades.length > 0 ? umidades.reduce((a, b) => a + b, 0) / umidades.length : null
      },
      dadoMaisRecente: dados[0],
      dados: true
    };

    res.json(resumo);
  } catch (error) {
    console.error('Erro ao buscar resumo climático:', error);
    res.status(500).json({ dados: null, error: 'Erro ao carregar resumo climático' });
  }
});

// API: Gerar recomendações (algoritmo determinístico para café)
app.post('/api/recomendacoes/gerar', requireAuth, (req, res) => {
  try {
    const CafeAlgorithm = require('./services/CafeAlgorithm');
    const algoritmo = new CafeAlgorithm();
    
    const usuarioId = req.session.user.id;
    const plantacoes = simulatedDB.findPlantacoesPorUsuario(usuarioId);
    
    if (plantacoes.length === 0) {
      return res.json({ 
        message: 'Nenhuma plantação encontrada. Cadastre uma plantação primeiro.',
        totalRecomendacoes: 0
      });
    }
    
    let totalRecomendacoes = 0;
    let plantacoesAnalisadas = 0;
    let erros = [];
    
    plantacoes.forEach(plantacao => {
      try {
        // Verificar se é café
        if (plantacao.especie !== 'cafe') {
          return; // Pular plantações que não são café
        }
        
        plantacoesAnalisadas++;
        
        // Verificar se já existem recomendações pendentes recentes (últimas 24h)
        const recomendacoesExistentes = simulatedDB.findRecomendacoesPorUsuario(usuarioId)
          .filter(r => r.plantacao === plantacao._id && 
                      r.status === 'pendente' &&
                      (new Date() - new Date(r.criadaEm)) < 24 * 60 * 60 * 1000);
        
        if (recomendacoesExistentes.length > 0) {
          console.log(`Plantação ${plantacao.nome} já possui recomendações recentes (${recomendacoesExistentes.length})`);
          return; // Pular se já tem recomendações recentes
        }
        
        // Buscar dados climáticos dos últimos 7 dias
        const dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
        
        // Preparar dados do solo
        const dadosSolo = {
          ph: plantacao.ph_solo || 6.0,
          tipo_solo: plantacao.tipo_solo || 'medio'
        };
        
        // Gerar recomendações usando algoritmo determinístico
        const recomendacoes = algoritmo.gerarRecomendacoes(plantacao, dadosClimaticos, dadosSolo);
        
        // Salvar cada recomendação
        recomendacoes.forEach(rec => {
          const recomendacaoFormatada = algoritmo.formatarRecomendacao(rec, plantacao._id, usuarioId);
          simulatedDB.addRecomendacao(recomendacaoFormatada);
          totalRecomendacoes++;
        });
        
      } catch (error) {
        console.error(`Erro ao processar plantação ${plantacao.nome}:`, error);
        erros.push(`${plantacao.nome}: ${error.message}`);
      }
    });
    
    let message = '';
    if (totalRecomendacoes > 0) {
      message = `${totalRecomendacoes} nova${totalRecomendacoes === 1 ? '' : 's'} recomendação${totalRecomendacoes === 1 ? '' : 'ões'} gerada${totalRecomendacoes === 1 ? '' : 's'} com sucesso!`;
    } else if (plantacoesAnalisadas === 0) {
      message = 'Nenhuma plantação de café encontrada. Este sistema é especializado em cafeicultura.';
    } else {
      message = 'Nenhuma recomendação nova gerada. Suas plantações já possuem recomendações recentes ou as condições estão adequadas.';
    }
    
    if (erros.length > 0) {
      message += ` Avisos: ${erros.join('; ')}`;
    }

    res.json({ 
      message,
      totalRecomendacoes,
      plantacoesAnalisadas,
      algoritmo: 'deterministico_cafe_v1',
      erros: erros.length > 0 ? erros : undefined
    });
    
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    res.status(500).json({ error: 'Erro interno ao gerar recomendações: ' + error.message });
  }
});

// API: Marcar recomendação como aplicada
app.post('/api/recomendacoes/:id/aplicada', requireAuth, (req, res) => {
  const { id } = req.params;
  const { observacoes } = req.body;
  
  const recomendacao = simulatedDB.updateRecomendacao(id, {
    status: 'concluida',
    'feedback.aplicada': true,
    'feedback.dataAplicacao': new Date(),
    'feedback.observacoes': observacoes
  });

  if (!recomendacao) {
    return res.status(404).json({ error: 'Recomendação não encontrada' });
  }

  res.json({ 
    message: 'Recomendação marcada como aplicada com sucesso!',
    recomendacao: { id, status: 'concluida' }
  });
});

// API: Atualizar dados climáticos (INMET real + fallback simulado)
app.post('/api/clima/atualizar', requireAuth, async (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    const plantacoes = simulatedDB.findPlantacoesPorUsuario(usuarioId);
    
    if (plantacoes.length === 0) {
      return res.json({ 
        message: 'Nenhuma plantação encontrada.',
        dadosAtualizados: 0
      });
    }

    let dadosAtualizados = 0;
    let statusDetalhado = [];
    
    for (const plantacao of plantacoes) {
      try {
        // Verificar se já existem dados climáticos recentes (últimas 24h)
        const dadosExistentes = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 1);
        const agora = new Date();
        const ultimoRegistro = dadosExistentes[0];
        
        let precisaAtualizar = true;
        if (ultimoRegistro) {
          const horasDesdeUltimo = (agora - new Date(ultimoRegistro.data)) / (1000 * 60 * 60);
          precisaAtualizar = horasDesdeUltimo > 12; // Atualizar a cada 12 horas
        }
        
        if (precisaAtualizar) {
          // Tentar buscar dados do INMET
          await simulatedDB.generateClimateDataForPlantacao(plantacao._id, 7);
          dadosAtualizados++;
          
          statusDetalhado.push({
            plantacao: plantacao.nome,
            status: 'atualizado',
            fonte: 'inmet_ou_simulado'
          });
        } else {
          statusDetalhado.push({
            plantacao: plantacao.nome,
            status: 'dados_recentes',
            ultimaAtualizacao: ultimoRegistro.data
          });
        }
      } catch (error) {
        console.error(`Erro ao atualizar dados da plantação ${plantacao.nome}:`, error);
        statusDetalhado.push({
          plantacao: plantacao.nome,
          status: 'erro',
          erro: error.message
        });
      }
    }

    res.json({ 
      message: `Dados climáticos atualizados para ${dadosAtualizados} plantação${dadosAtualizados === 1 ? '' : 'ões'}!`,
      dadosAtualizados,
      totalPlantacoes: plantacoes.length,
      detalhes: statusDetalhado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar dados climáticos:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar dados climáticos' });
  }
});

// API: Previsão do tempo e alertas preditivos
app.get('/api/previsao/:plantacaoId', requireAuth, async (req, res) => {
  try {
    const plantacaoId = req.params.plantacaoId;
    const plantacao = simulatedDB.findById('plantacoes', plantacaoId);
    
    if (!plantacao || plantacao.usuario !== req.session.user.id) {
      return res.status(404).json({ error: 'Plantação não encontrada' });
    }

    const PrevisaoService = require('./services/PrevisaoService');
    
    // Buscar previsão de 5 dias
    const previsao5Dias = await PrevisaoService.buscarPrevisao5Dias(
      plantacao.localizacao.latitude,
      plantacao.localizacao.longitude
    );
    
    // Analisar riscos futuros
    const alertasPreditivos = PrevisaoService.analisarRiscosFuturos(previsao5Dias, plantacao);
    
    res.json({
      plantacao: {
        id: plantacao._id,
        nome: plantacao.nome,
        variedade: plantacao.variedade_cafe,
        localizacao: plantacao.localizacao
      },
      previsao: previsao5Dias,
      alertas: alertasPreditivos,
      resumo: {
        totalAlertas: alertasPreditivos.length,
        alertasUrgentes: alertasPreditivos.filter(a => a.prioridade === 'urgente').length,
        alertasAltos: alertasPreditivos.filter(a => a.prioridade === 'alta').length,
        proximoRisco: alertasPreditivos.length > 0 ? alertasPreditivos[0] : null
      }
    });
    
  } catch (error) {
    console.error('Erro ao buscar previsão:', error);
    res.status(500).json({ error: 'Erro interno ao buscar previsão' });
  }
});

// API: Gerar recomendações com análise preditiva
app.post('/api/recomendacoes/gerar-preditivas', requireAuth, async (req, res) => {
  try {
    const { plantacaoId } = req.body;
    
    if (plantacaoId) {
      // Gerar para plantação específica
      const plantacao = simulatedDB.findById('plantacoes', plantacaoId);
      if (!plantacao || plantacao.usuario !== req.session.user.id) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }
      
      await gerarRecomendacoesPreditivas(plantacao, req.session.user.id);
      res.json({ message: `Recomendações preditivas geradas para ${plantacao.nome}` });
      
    } else {
      // Gerar para todas as plantações do usuário
      const plantacoes = simulatedDB.findPlantacoesPorUsuario(req.session.user.id);
      
      for (const plantacao of plantacoes) {
        if (plantacao.especie === 'cafe') {
          await gerarRecomendacoesPreditivas(plantacao, req.session.user.id);
        }
      }
      
      res.json({ 
        message: `Recomendações preditivas geradas para ${plantacoes.length} plantações`,
        plantacoes: plantacoes.length
      });
    }
    
  } catch (error) {
    console.error('Erro ao gerar recomendações preditivas:', error);
    res.status(500).json({ error: 'Erro interno ao gerar recomendações' });
  }
});

// Função auxiliar para gerar recomendações preditivas
async function gerarRecomendacoesPreditivas(plantacao, usuarioId) {
  try {
    const CafeAlgorithm = require('./services/CafeAlgorithm');
    const PrevisaoService = require('./services/PrevisaoService');
    const algoritmo = new CafeAlgorithm();
    
    // VERIFICAR SE JÁ EXISTEM RECOMENDAÇÕES PREDITIVAS RECENTES
    const agora = new Date();
    const recomendacoesExistentes = simulatedDB.findRecomendacoesPorUsuario(usuarioId)
      .filter(r => r.plantacao === plantacao._id && r.status === 'pendente' && r.ativa);
    
    // Verificar se há recomendações preditivas nas últimas 6 horas
    const recomendacoesPreditivasRecentes = recomendacoesExistentes.filter(r => {
      const isPreditiva = r.parametrosUsados?.parametros?.tipo_analise === 'preditiva' ||
                         r.tipo?.includes('_preditivo');
      if (!isPreditiva) return false;
      
      const criadaEm = new Date(r.criadaEm || r.createdAt);
      const horasDesde = (agora - criadaEm) / (1000 * 60 * 60);
      return horasDesde < 6; // Menos de 6 horas
    });
    
    if (recomendacoesPreditivasRecentes.length > 0) {
      console.log(`⏭️ Pulando geração preditiva para ${plantacao.nome} - já existem ${recomendacoesPreditivasRecentes.length} recomendações preditivas recentes`);
      return;
    }
    
    // Buscar dados necessários
    const dadosClimaticos = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 7);
    const dadosSolo = {
      ph: plantacao.ph_solo || 6.0,
      tipo_solo: plantacao.tipo_solo || 'medio'
    };
    
    // Buscar previsão
    const previsao5Dias = await PrevisaoService.buscarPrevisao5Dias(
      plantacao.localizacao.latitude,
      plantacao.localizacao.longitude
    );
    
    // Gerar apenas recomendações preditivas
    const alertasPreditivos = PrevisaoService.analisarRiscosFuturos(previsao5Dias, plantacao);
    
    if (alertasPreditivos.length === 0) {
      console.log(`✅ Nenhum risco preditivo detectado para ${plantacao.nome}`);
      return;
    }
    
    // Converter em recomendações e salvar
    alertasPreditivos.forEach(alerta => {
      const recomendacao = {
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
          gerada_em: agora.toISOString()
        }
      };
      
      const recomendacaoFormatada = algoritmo.formatarRecomendacao(recomendacao, plantacao._id, usuarioId);
      simulatedDB.addRecomendacao(recomendacaoFormatada);
    });
    
    console.log(`🔮 ${alertasPreditivos.length} novas recomendações preditivas geradas para ${plantacao.nome}`);
    
  } catch (error) {
    console.warn(`Erro ao gerar recomendações preditivas para ${plantacao.nome}:`, error.message);
  }
}

app.get('/api/clima/testar-inmet', requireAuth, async (req, res) => {
  try {
    const InmetService = require('./services/InmetService');
    
    // Coordenadas de exemplo (Brasília)
    const latitude = -15.7801;
    const longitude = -47.9292;
    
    console.log('Testando conexão com INMET...');
    
    // Buscar estações próximas
    const estacoes = await InmetService.buscarEstacoes(latitude, longitude, 100);
    
    if (estacoes.length > 0) {
      const estacaoTeste = estacoes[0];
      console.log(`Testando estação: ${estacaoTeste.nome}`);
      
      // Buscar dados recentes
      const dadosRecentes = await InmetService.buscarDadosRecentes(estacaoTeste.codigo);
      
      res.json({
        status: 'sucesso',
        message: 'Conexão com INMET funcionando!',
        estacao: estacaoTeste,
        dadosRecentes,
        totalEstacoes: estacoes.length
      });
    } else {
      res.json({
        status: 'sem_estacoes',
        message: 'Nenhuma estação INMET encontrada na região',
        coordenadas: { latitude, longitude }
      });
    }
    
  } catch (error) {
    console.error('Erro ao testar INMET:', error);
    res.json({
      status: 'erro',
      message: 'Erro ao conectar com INMET, usando dados simulados',
      erro: error.message
    });
  }
});

// Página 404
app.use((req, res) => {
  res.status(404).render('404', { 
    title: '404 - Página não encontrada'
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Erro - Conecta Engenharias Agro',
    message: 'Erro interno do servidor',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
  console.log(`\n👤 Credenciais de teste:`);
  console.log(`Email: joao@example.com`);
  console.log(`Senha: 123456`);
  console.log(`\n🌱 Sistema Conecta Engenharias Agro - Protótipo v1.0`);
});

module.exports = app;