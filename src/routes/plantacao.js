const express = require('express');
const router = express.Router();
const PlantacaoController = require('../controllers/PlantacaoController');
const AuthController = require('../controllers/AuthController');

// Todas as rotas de plantação requerem autenticação
router.use(AuthController.requireAuth);

// Rotas web
router.get('/', PlantacaoController.index);
router.get('/nova', PlantacaoController.create);
router.post('/', PlantacaoController.store);
router.get('/:id', PlantacaoController.show);
router.get('/:id/editar', PlantacaoController.edit);
router.post('/:id', PlantacaoController.update);
router.delete('/:id', PlantacaoController.destroy);

// Rotas da API
router.get('/api/list', PlantacaoController.apiIndex);
router.get('/api/:id', PlantacaoController.apiShow);
router.get('/api/nearby', PlantacaoController.apiNearby);

module.exports = router;