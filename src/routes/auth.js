const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Rotas de autenticação web
router.get('/login', AuthController.loginPage);
router.post('/login', AuthController.login);
router.get('/register', AuthController.registerPage);
router.post('/register', AuthController.register);
router.post('/logout', AuthController.logout);

// Rotas de perfil (protegidas)
router.get('/profile', AuthController.requireAuth, AuthController.profile);
router.post('/profile', AuthController.requireAuth, AuthController.updateProfile);

// Rotas da API para aplicações móveis/SPA
router.post('/api/login', AuthController.apiLogin);

module.exports = router;