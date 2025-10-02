const express = require('express');
const router = express.Router();
const RecomendacaoController = require('../controllers/RecomendacaoController');
const AuthController = require('../controllers/AuthController');

// Todas as rotas de recomendação requerem autenticação
router.use(AuthController.requireAuth);

// Rotas web
router.get('/', RecomendacaoController.index);

// Rotas da API
router.post('/gerar/:plantacaoId', RecomendacaoController.gerar);
router.post('/gerar-todas', RecomendacaoController.gerarTodas);
router.post('/:id/aplicada', RecomendacaoController.marcarAplicada);
router.post('/:id/avaliar', RecomendacaoController.avaliar);
router.get('/dashboard', RecomendacaoController.dashboard);

module.exports = router;