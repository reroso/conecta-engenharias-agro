const express = require('express');
const router = express.Router();
const ClimaController = require('../controllers/ClimaController');
const AuthController = require('../controllers/AuthController');

// Todas as rotas de clima requerem autenticação
router.use(AuthController.requireAuth);

// Rotas web
router.get('/', ClimaController.index);

// Rotas da API
router.get('/estacoes/:plantacaoId', ClimaController.buscarEstacoes);
router.post('/atualizar/:plantacaoId', ClimaController.atualizarDados);
router.post('/atualizar-todas', ClimaController.atualizarTodas);
router.get('/dados/:plantacaoId', ClimaController.dadosGrafico);
router.get('/resumo/:plantacaoId', ClimaController.resumo);

module.exports = router;