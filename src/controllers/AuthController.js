const Usuario = require('../models/Usuario');
const jwt = require('jsonwebtoken');

class AuthController {
  // Página de login
  static async loginPage(req, res) {
    try {
      if (req.session.user) {
        return res.redirect('/');
      }
      res.render('auth/login', { 
        title: 'Login - Conecta Engenharias Agro',
        error: null 
      });
    } catch (error) {
      console.error('Erro ao carregar página de login:', error);
      res.status(500).render('error', { 
        message: 'Erro interno do servidor',
        error: error 
      });
    }
  }

  // Página de registro
  static async registerPage(req, res) {
    try {
      if (req.session.user) {
        return res.redirect('/');
      }
      res.render('auth/register', { 
        title: 'Cadastro - Conecta Engenharias Agro',
        error: null 
      });
    } catch (error) {
      console.error('Erro ao carregar página de registro:', error);
      res.status(500).render('error', { 
        message: 'Erro interno do servidor',
        error: error 
      });
    }
  }

  // Processar login
  static async login(req, res) {
    try {
      const { email, senha } = req.body;

      // Validações básicas
      if (!email || !senha) {
        return res.status(400).render('auth/login', {
          title: 'Login - Conecta Engenharias Agro',
          error: 'Email e senha são obrigatórios'
        });
      }

      // Buscar usuário
      const usuario = await Usuario.findOne({ email: email.toLowerCase() });
      if (!usuario) {
        return res.status(401).render('auth/login', {
          title: 'Login - Conecta Engenharias Agro',
          error: 'Email ou senha incorretos'
        });
      }

      // Verificar senha
      const senhaCorreta = await usuario.compararSenha(senha);
      if (!senhaCorreta) {
        return res.status(401).render('auth/login', {
          title: 'Login - Conecta Engenharias Agro',
          error: 'Email ou senha incorretos'
        });
      }

      // Verificar se usuário está ativo
      if (!usuario.ativo) {
        return res.status(401).render('auth/login', {
          title: 'Login - Conecta Engenharias Agro',
          error: 'Conta desativada. Entre em contato com o suporte'
        });
      }

      // Criar sessão
      req.session.user = {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email
      };

      res.redirect('/');
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).render('auth/login', {
        title: 'Login - Conecta Engenharias Agro',
        error: 'Erro interno do servidor. Tente novamente'
      });
    }
  }

  // Processar registro
  static async register(req, res) {
    try {
      const { nome, email, senha, confirmarSenha, telefone, cidade, estado, cep } = req.body;

      // Validações
      if (!nome || !email || !senha) {
        return res.status(400).render('auth/register', {
          title: 'Cadastro - Conecta Engenharias Agro',
          error: 'Nome, email e senha são obrigatórios'
        });
      }

      if (senha !== confirmarSenha) {
        return res.status(400).render('auth/register', {
          title: 'Cadastro - Conecta Engenharias Agro',
          error: 'Senhas não coincidem'
        });
      }

      if (senha.length < 6) {
        return res.status(400).render('auth/register', {
          title: 'Cadastro - Conecta Engenharias Agro',
          error: 'Senha deve ter pelo menos 6 caracteres'
        });
      }

      // Verificar se email já existe
      const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
      if (usuarioExistente) {
        return res.status(400).render('auth/register', {
          title: 'Cadastro - Conecta Engenharias Agro',
          error: 'Email já cadastrado'
        });
      }

      // Criar usuário
      const novoUsuario = new Usuario({
        nome: nome.trim(),
        email: email.toLowerCase().trim(),
        senha,
        telefone: telefone?.trim(),
        endereco: {
          cidade: cidade?.trim(),
          estado: estado?.trim(),
          cep: cep?.trim()
        }
      });

      await novoUsuario.save();

      // Criar sessão
      req.session.user = {
        id: novoUsuario._id,
        nome: novoUsuario.nome,
        email: novoUsuario.email
      };

      res.redirect('/');
    } catch (error) {
      console.error('Erro no registro:', error);
      
      let errorMessage = 'Erro interno do servidor. Tente novamente';
      
      // Tratar erros de validação do Mongoose
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        errorMessage = errors.join(', ');
      }

      res.status(500).render('auth/register', {
        title: 'Cadastro - Conecta Engenharias Agro',
        error: errorMessage
      });
    }
  }

  // Logout
  static async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Erro ao destruir sessão:', err);
          return res.status(500).json({ error: 'Erro ao fazer logout' });
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Middleware de autenticação
  static requireAuth(req, res, next) {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    next();
  }

  // API - Login para aplicações móveis/SPA
  static async apiLogin(req, res) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ 
          error: 'Email e senha são obrigatórios' 
        });
      }

      const usuario = await Usuario.findOne({ email: email.toLowerCase() });
      if (!usuario || !(await usuario.compararSenha(senha))) {
        return res.status(401).json({ 
          error: 'Credenciais inválidas' 
        });
      }

      if (!usuario.ativo) {
        return res.status(401).json({ 
          error: 'Conta desativada' 
        });
      }

      // Gerar JWT
      const token = jwt.sign(
        { 
          id: usuario._id, 
          email: usuario.email 
        },
        process.env.JWT_SECRET || 'conecta-agro-secret',
        { expiresIn: '7d' }
      );

      res.json({
        token,
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email
        }
      });
    } catch (error) {
      console.error('Erro no login da API:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Middleware de autenticação para API
  static async apiAuth(req, res, next) {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Token de acesso requerido' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'conecta-agro-secret');
      const usuario = await Usuario.findById(decoded.id);
      
      if (!usuario || !usuario.ativo) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      req.user = usuario;
      next();
    } catch (error) {
      console.error('Erro na autenticação da API:', error);
      res.status(401).json({ error: 'Token inválido' });
    }
  }

  // Obter perfil do usuário
  static async profile(req, res) {
    try {
      const usuario = await Usuario.findById(req.session.user.id);
      if (!usuario) {
        return res.status(404).render('error', {
          message: 'Usuário não encontrado'
        });
      }

      res.render('auth/profile', {
        title: 'Perfil - Conecta Engenharias Agro',
        usuario
      });
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      res.status(500).render('error', {
        message: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar perfil
  static async updateProfile(req, res) {
    try {
      const { nome, telefone, cidade, estado, cep } = req.body;
      
      const usuario = await Usuario.findByIdAndUpdate(
        req.session.user.id,
        {
          nome: nome?.trim(),
          telefone: telefone?.trim(),
          endereco: {
            cidade: cidade?.trim(),
            estado: estado?.trim(),
            cep: cep?.trim()
          }
        },
        { new: true, runValidators: true }
      );

      if (!usuario) {
        return res.status(404).render('error', {
          message: 'Usuário não encontrado'
        });
      }

      // Atualizar sessão
      req.session.user.nome = usuario.nome;

      res.render('auth/profile', {
        title: 'Perfil - Conecta Engenharias Agro',
        usuario,
        success: 'Perfil atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      
      let errorMessage = 'Erro interno do servidor';
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        errorMessage = errors.join(', ');
      }

      const usuario = await Usuario.findById(req.session.user.id);
      res.status(500).render('auth/profile', {
        title: 'Perfil - Conecta Engenharias Agro',
        usuario,
        error: errorMessage
      });
    }
  }
}

module.exports = AuthController;