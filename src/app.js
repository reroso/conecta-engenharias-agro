const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const app = express();

// Configuração da conexão com MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conecta-agro')
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

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
  cookie: { secure: false } // Para desenvolvimento
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

// Rotas
const authRoutes = require('./routes/auth');
const plantacaoRoutes = require('./routes/plantacao');
const climaRoutes = require('./routes/clima');
const recomendacaoRoutes = require('./routes/recomendacao');

app.use('/auth', authRoutes);
app.use('/plantacao', plantacaoRoutes);
app.use('/clima', climaRoutes);
app.use('/recomendacao', recomendacaoRoutes);

// Rota principal - Dashboard
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('dashboard', { 
    title: 'Dashboard - Conecta Engenharias Agro',
    user: req.session.user 
  });
});

// Rota de login
app.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Login - Conecta Engenharias Agro' });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
  res.status(404).render('404', { title: '404 - Página não encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📱 Acesse: http://localhost:${PORT}`);
});