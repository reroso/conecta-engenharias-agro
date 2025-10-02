const mongoose = require('mongoose');
require('dotenv').config();

// Importar models
const Usuario = require('./src/models/Usuario');
const Plantacao = require('./src/models/Plantacao');
const Solo = require('./src/models/Solo');
const DadosClimaticos = require('./src/models/DadosClimaticos');

async function initDatabase() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/conecta-agro');
    console.log('✅ Conectado ao MongoDB');

    // Limpar dados existentes (cuidado em produção!)
    await Usuario.deleteMany({});
    await Plantacao.deleteMany({});
    await Solo.deleteMany({});
    await DadosClimaticos.deleteMany({});
    console.log('🧹 Dados existentes limpos');

    // Criar usuário de exemplo
    const usuario = new Usuario({
      nome: 'João Silva',
      email: 'joao@example.com',
      senha: '123456',
      telefone: '(11) 99999-9999',
      endereco: {
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01000-000'
      }
    });
    await usuario.save();
    console.log('👤 Usuário de exemplo criado');

    // Criar plantações de exemplo
    const plantacoes = [
      {
        usuario: usuario._id,
        nome: 'Café Fazenda Sul',
        especie: 'cafe',
        variedade: 'Arábica',
        localizacao: {
          latitude: -23.5505,
          longitude: -46.6333,
          cidade: 'São Paulo',
          estado: 'SP'
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
        observacoes: 'Plantação principal de café, boa produtividade'
      },
      {
        usuario: usuario._id,
        nome: 'Laranjal Norte',
        especie: 'laranja',
        variedade: 'Pêra',
        localizacao: {
          latitude: -23.4505,
          longitude: -46.5333,
          cidade: 'São Paulo',
          estado: 'SP'
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
        observacoes: 'Plantação de laranjas para suco'
      },
      {
        usuario: usuario._id,
        nome: 'Banana Experimental',
        especie: 'banana',
        variedade: 'Nanica',
        localizacao: {
          latitude: -23.6505,
          longitude: -46.7333,
          cidade: 'São Paulo',
          estado: 'SP'
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
        observacoes: 'Plantação experimental de bananas'
      }
    ];

    const plantacoesSalvas = await Plantacao.insertMany(plantacoes);
    console.log('🌱 Plantações de exemplo criadas');

    // Criar dados de solo para a primeira plantação
    const dadosSolo = new Solo({
      plantacao: plantacoesSalvas[0]._id,
      dataAnalise: new Date('2024-01-15'),
      ph: {
        valor: 5.2
      },
      tipoSolo: {
        textura: 'franco_argiloso',
        drenagem: 'boa',
        cor: 'marrom escuro',
        profundidade: 80
      },
      nutrientes: {
        nitrogenio: {
          valor: 25
        },
        fosforo: {
          valor: 15
        },
        potassio: {
          valor: 0.25
        },
        calcio: {
          valor: 3.2
        },
        magnesio: {
          valor: 1.1
        }
      },
      caracteristicasFisicas: {
        materiaOrganica: 3.2,
        ctc: 8.5,
        saturacaoBases: 65
      },
      observacoes: 'Solo em boas condições, necessita correção de pH'
    });
    await dadosSolo.save();
    console.log('🧪 Dados de solo de exemplo criados');

    // Criar dados climáticos simulados para os últimos 30 dias
    const hoje = new Date();
    for (let i = 30; i >= 0; i--) {
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - i);

      // Gerar dados simulados para cada plantação
      for (const plantacao of plantacoesSalvas) {
        const dadosClimaticos = new DadosClimaticos({
          plantacao: plantacao._id,
          estacaoInmet: {
            codigo: 'A001',
            nome: 'Estação São Paulo',
            latitude: plantacao.localizacao.latitude,
            longitude: plantacao.localizacao.longitude
          },
          data: data,
          temperatura: {
            maxima: 20 + Math.random() * 15 + Math.sin((data.getMonth() / 12) * 2 * Math.PI) * 5,
            minima: 10 + Math.random() * 10 + Math.sin((data.getMonth() / 12) * 2 * Math.PI) * 3
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
            direcao: Math.random() * 360,
            rajada: Math.random() * 25
          },
          pressaoAtmosferica: 1010 + (Math.random() - 0.5) * 30,
          radiacaoSolar: Math.random() * 25,
          insolacao: Math.random() * 10,
          origem: 'simulado',
          qualidade: 'boa'
        });

        // Calcular temperatura média
        dadosClimaticos.temperatura.media = 
          (dadosClimaticos.temperatura.maxima + dadosClimaticos.temperatura.minima) / 2;

        await dadosClimaticos.save();
      }
    }
    console.log('🌤️ Dados climáticos simulados criados');

    console.log('\n✅ Banco de dados inicializado com sucesso!');
    console.log('\n📝 Credenciais de teste:');
    console.log('Email: joao@example.com');
    console.log('Senha: 123456');
    console.log('\n🚀 Agora você pode executar: npm run dev');

  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar inicialização
initDatabase();