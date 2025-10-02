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

// Dashboard (página principal)
app.get('/', requireAuth, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - Conecta Engenharias Agro'
  });
});

// Páginas principais do sistema
app.get('/plantacao', requireAuth, (req, res) => {
  res.render('plantacao/index', { 
    title: 'Plantações - Conecta Engenharias Agro'
  });
});

app.get('/plantacao/nova', requireAuth, (req, res) => {
  res.render('plantacao/nova', { 
    title: 'Nova Plantação - Conecta Engenharias Agro'
  });
});

app.get('/clima', requireAuth, (req, res) => {
  res.render('clima/index', { 
    title: 'Dados Climáticos - Conecta Engenharias Agro'
  });
});

app.get('/recomendacao', requireAuth, (req, res) => {
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

// API: Criar nova plantação
app.post('/api/plantacoes', requireAuth, (req, res) => {
  try {
    const { nome, especie, variedade, area, latitude, longitude, cidade, estado, observacoes } = req.body;

    if (!nome || !especie || !area || !latitude || !longitude || !cidade || !estado) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' });
    }

    const novaPlantacao = {
      usuario: req.session.user.id,
      nome: nome.trim(),
      especie,
      variedade: variedade || '',
      area: parseFloat(area),
      localizacao: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        cidade: cidade.trim(),
        estado
      },
      observacoes: observacoes || '',
      ativo: true,
      criadoEm: new Date()
    };

    const plantacao = simulatedDB.addPlantacao(novaPlantacao);
    res.status(201).json({ 
      message: 'Plantação cadastrada com sucesso!',
      plantacao: { id: plantacao._id, nome: plantacao.nome }
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
        criadaEm: r.criadaEm,
        diasRestantes: { dias: diasRestantes }
      };
    });

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

// API: Gerar recomendações (simulado)
app.post('/api/recomendacoes/gerar', requireAuth, (req, res) => {
  try {
    const usuarioId = req.session.user.id;
    const plantacoes = simulatedDB.findPlantacoesPorUsuario(usuarioId);
    
    if (plantacoes.length === 0) {
      return res.json({ 
        message: 'Nenhuma plantação encontrada. Cadastre uma plantação primeiro.',
        totalRecomendacoes: 0
      });
    }
    
    // Tipos de recomendações possíveis
    const tiposRecomendacoes = [
      {
        tipo: 'irrigacao',
        titulos: [
          'Irrigação Necessária - Baixa Umidade',
          'Ajuste na Irrigação - Déficit Hídrico',
          'Irrigação Preventiva - Previsão de Seca'
        ],
        descricoes: [
          'A precipitação dos últimos 7 dias está abaixo do ideal. Déficit hídrico detectado.',
          'Baixa umidade do solo detectada. Plantas podem entrar em estresse hídrico.',
          'Previsão meteorológica indica período seco. Irrigação preventiva recomendada.'
        ],
        acoes: [
          'Aplicar irrigação de 15mm (aproximadamente 780 litros por hectare).',
          'Aumentar frequência de irrigação para 3x por semana.',
          'Aplicar irrigação suplementar de 10mm nas próximas 48h.'
        ],
        prioridades: ['alta', 'media', 'alta']
      },
      {
        tipo: 'fertilizacao',
        titulos: [
          'Aplicação de Fertilizante NPK',
          'Correção Nutricional - Deficiência de Potássio',
          'Adubação Foliar Recomendada'
        ],
        descricoes: [
          'Análise foliar indica necessidade de reposição nutricional.',
          'Sintomas de deficiência nutricional observados nas folhas.',
          'Período ideal para aplicação de fertilizante com base no ciclo da cultura.'
        ],
        acoes: [
          'Aplicar 250kg/ha de fertilizante NPK 20-10-20.',
          'Aplicar 150kg/ha de cloreto de potássio.',
          'Realizar adubação foliar com micronutrientes.'
        ],
        prioridades: ['media', 'alta', 'baixa']
      },
      {
        tipo: 'defensivos',
        titulos: [
          'Controle Preventivo de Pragas',
          'Aplicação de Fungicida - Risco de Doenças',
          'Monitoramento de Pragas Intensificado'
        ],
        descricoes: [
          'Condições climáticas favorecem o desenvolvimento de pragas.',
          'Alta umidade e temperatura podem propiciar doenças fúngicas.',
          'Época do ano com maior incidência de pragas na região.'
        ],
        acoes: [
          'Aplicar inseticida sistêmico conforme recomendação técnica.',
          'Aplicar fungicida preventivo nas próximas 72h.',
          'Intensificar monitoramento visual 2x por semana.'
        ],
        prioridades: ['media', 'alta', 'baixa']
      },
      {
        tipo: 'manejo',
        titulos: [
          'Poda de Limpeza Recomendada',
          'Controle de Ervas Daninhas',
          'Análise de Solo Necessária'
        ],
        descricoes: [
          'Período ideal para poda de limpeza e formação.',
          'Crescimento acelerado de ervas daninhas detectado.',
          'Última análise de solo realizada há mais de 6 meses.'
        ],
        acoes: [
          'Realizar poda de limpeza removendo galhos secos e doentes.',
          'Aplicar herbicida seletivo ou realizar capina manual.',
          'Coletar amostras de solo para análise química.'
        ],
        prioridades: ['baixa', 'media', 'media']
      }
    ];
    
    let novasRecomendacoes = 0;
    
    plantacoes.forEach(plantacao => {
      // Gerar 1-3 recomendações por plantação
      const numRecomendacoes = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numRecomendacoes; i++) {
        // Escolher tipo de recomendação aleatório
        const tipoEscolhido = tiposRecomendacoes[Math.floor(Math.random() * tiposRecomendacoes.length)];
        const indiceVariacao = Math.floor(Math.random() * tipoEscolhido.titulos.length);
        
        // Calcular datas
        const agora = new Date();
        const dataRecomendada = new Date(agora.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000); // 1-4 dias
        const dataLimite = new Date(dataRecomendada.getTime() + (Math.random() * 7 + 3) * 24 * 60 * 60 * 1000); // 3-10 dias após recomendada
        
        simulatedDB.addRecomendacao({
          plantacao: plantacao._id,
          usuario: usuarioId,
          tipo: tipoEscolhido.tipo,
          prioridade: tipoEscolhido.prioridades[indiceVariacao],
          titulo: tipoEscolhido.titulos[indiceVariacao],
          descricao: tipoEscolhido.descricoes[indiceVariacao],
          acaoRecomendada: tipoEscolhido.acoes[indiceVariacao],
          cronograma: {
            dataRecomendada: dataRecomendada,
            dataLimite: dataLimite
          },
          status: 'pendente',
          criadaEm: new Date()
        });
        
        novasRecomendacoes++;
      }
    });

    res.json({ 
      message: `${novasRecomendacoes} nova${novasRecomendacoes === 1 ? '' : 's'} recomendação${novasRecomendacoes === 1 ? '' : 'ões'} gerada${novasRecomendacoes === 1 ? '' : 's'} com sucesso!`,
      totalRecomendacoes: novasRecomendacoes,
      plantacoesAnalisadas: plantacoes.length
    });
    
  } catch (error) {
    console.error('Erro ao gerar recomendações:', error);
    res.status(500).json({ error: 'Erro interno ao gerar recomendações' });
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

// API: Atualizar dados climáticos (simulado)
app.post('/api/clima/atualizar', requireAuth, (req, res) => {
  try {
    // Simular atualização de dados climáticos
    // Na implementação real, isso faria uma requisição para o INMET
    
    // Verificar se há plantações sem dados climáticos e gerar para elas
    const plantacoes = simulatedDB.findPlantacoesPorUsuario(req.session.user.id);
    let dadosAtualizados = 0;
    
    plantacoes.forEach(plantacao => {
      const dadosExistentes = simulatedDB.findDadosClimaticosPorPlantacao(plantacao._id, 1);
      if (dadosExistentes.length === 0) {
        simulatedDB.generateClimateDataForPlantacao(plantacao._id);
        dadosAtualizados++;
      }
    });
    
    res.json({ 
      message: `Dados climáticos atualizados com sucesso! ${dadosAtualizados > 0 ? `Gerados dados para ${dadosAtualizados} plantações.` : '(simulado)'}`,
      dadosSalvos: dadosAtualizados || Math.floor(Math.random() * 5) + 1
    });
  } catch (error) {
    console.error('Erro ao atualizar dados climáticos:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados climáticos' });
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