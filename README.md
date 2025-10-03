# ☕ Conecta Engenharias Agro

## Sistema Inteligente de Recomendações para Cafeicultura

Um sistema web especializado em cafeicultura que fornece recomendações agronômicas automatizadas baseadas em dados climáticos reais do INMET e algoritmos determinísticos específicos para diferentes variedades de café.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)
![Express](https://img.shields.io/badge/Express-4.18-blue)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow)
![INMET](https://img.shields.io/badge/INMET-API%20Integrada-orange)

## 🎯 Características Principais

### 🤖 Recomendações Automáticas
- **Geração automática** de recomendações sem intervenção do usuário
- **Algoritmo determinístico** baseado em regras agronômicas científicas
- **Atualização contínua** a cada 24 horas
- **Prevenção de duplicatas** inteligente

### 🌡️ Dados Climáticos Reais
- **Integração com INMET** (Instituto Nacional de Meteorologia)
- **Estações meteorológicas** próximas à plantação
- **Dados históricos** dos últimos 7-30 dias
- **Fallback inteligente** para dados simulados

### ☕ Especialização em Café
- **5 variedades suportadas**: Mundo Novo, Catuaí, Bourbon, Acaiá, Conilon
- **Análise de fases fenológicas**: Repouso, Brotação, Floração, Granação, Maturação
- **Parâmetros específicos**: pH do solo, tipo de solo, idade da plantação
- **Regras varietais**: Cada variedade com seus parâmetros ideais

## 📋 Funcionalidades

### 🌱 Gestão de Plantações
- Cadastro especializado para cafeicultura
- Geolocalização automática com dados climáticos
- Informações detalhadas sobre variedade e solo
- Fases fenológicas automáticas baseadas na época

### 📊 Análise Climática
- Temperatura, umidade, precipitação em tempo real
- Alertas automáticos para condições críticas
- Visualização gráfica com Chart.js
- Histórico de dados meteorológicos

### 🎯 Recomendações Inteligentes
- **Irrigação**: Déficit hídrico, estresse térmico
- **Solo**: Correção de pH, calagem, tipo de solo
- **Fitossanidade**: Alertas para ferrugem, condições de doenças
- **Manejo**: Recomendações por fase fenológica

### 📈 Dashboard Analítico
- Estatísticas em tempo real
- Recomendações urgentes destacadas
- Visão geral das plantações
- Alertas prioritários

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **EJS** - Template engine
- **Express Session** - Gerenciamento de sessões
- **Axios** - Cliente HTTP para APIs
- **Moment.js** - Manipulação de datas

### Frontend
- **HTML5** + **CSS3** + **JavaScript ES6+**
- **Chart.js** - Visualização de dados
- **Responsive Design** - Layout adaptativo
- **Progressive Web App** ready

### APIs e Integrações
- **INMET API** - Dados meteorológicos oficiais do governo
- **OpenStreetMap Nominatim** - Geocodificação reversa
- **Browser Geolocation API** - Localização automática

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ instalado
- NPM ou Yarn
- Conexão com internet (para APIs)

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/seu-usuario/conecta-engenharias-agro.git
cd conecta-engenharias-agro
```

2. **Instale as dependências**
```bash
npm install
```

3. **Execute o servidor**
```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

4. **Acesse a aplicação**
```
http://localhost:3000
```

## 📖 Como Usar

### 1. 🔐 Autenticação
- Crie uma conta ou faça login
- Sistema de sessões seguro

### 2. 🌱 Cadastre uma Plantação
- Preencha os dados básicos (nome, área)
- Selecione a variedade de café
- Informe pH e tipo do solo
- Defina a fase fenológica atual
- Use geolocalização automática

### 3. 📊 Acompanhe os Dados
- Dados climáticos atualizados automaticamente
- Gráficos interativos de temperatura, umidade e chuva
- Histórico meteorológico

### 4. 🎯 Receba Recomendações
- **Automáticas**: Geradas ao cadastrar plantação
- **Atualizadas**: Verificadas a cada 24h
- **Inteligentes**: Baseadas em dados reais
- **Específicas**: Para sua variedade e região

## 🧠 Algoritmo de Recomendações

### Regras Implementadas

#### 🌡️ **Análise Climática**
```javascript
// Exemplos de regras determinísticas
- Temperatura < 12°C (Arábica) → Alerta de geada
- Temperatura > 30°C (Arábica) → Estresse térmico
- Precipitação < 10mm/semana → Irrigação urgente
- Umidade > 80% + Temp 22-25°C → Alerta ferrugem
```

#### 🧪 **Análise de Solo**
```javascript
- pH < 4.5 → Calagem urgente
- pH 4.5-6.5 → Faixa ideal para café
- pH > 7.0 → Solo alcalino, baixa absorção
- Solo arenoso → Irrigação mais frequente
```

#### 📅 **Manejo por Fase**
```javascript
- Floração + chuva < 25mm → Irrigação obrigatória
- Granação + temp > 30°C → Proteção contra calor
- Maturação + chuva > 50mm → Risco para qualidade
```

## 📁 Estrutura do Projeto

```
conecta-engenharias-agro/
├── public/                 # Arquivos estáticos
│   ├── css/               # Estilos CSS
│   └── js/                # JavaScript frontend
├── src/
│   ├── app-simple.js      # Servidor principal
│   ├── services/          # Serviços (INMET, algoritmos)
│   ├── database/          # Simulação de banco de dados
│   └── views/             # Templates EJS
│       ├── auth/          # Páginas de autenticação
│       ├── plantacao/     # Gestão de plantações
│       ├── clima/         # Dados climáticos
│       └── recomendacao/  # Recomendações
├── package.json
└── README.md
```

## 🌟 Diferenciais

### 🎯 **Especialização**
- **100% focado em café** - Não é um sistema genérico
- **Variedades específicas** - Cada café tem suas regras
- **Conhecimento agronômico** - Baseado em ciência

### 🤖 **Automação Inteligente**
- **Zero cliques** - Recomendações automáticas
- **Dados reais** - Integração governamental
- **Fallback robusto** - Funciona offline

### 📊 **Dados Confiáveis**
- **INMET oficial** - Instituto Nacional de Meteorologia
- **Estações próximas** - Dados da sua região
- **Histórico completo** - Análise temporal

## 🔮 Roadmap Futuro

### 📈 **Próximas Funcionalidades**
- [ ] **Machine Learning** para predições avançadas
- [ ] **Imagens de satélite** para monitoramento
- [ ] **Sensores IoT** integração
- [ ] **Previsão de safra** baseada em IA
- [ ] **Mercado** - Preços e tendências

### 🌐 **Expansão**
- [ ] **App móvel** nativo
- [ ] **API pública** para terceiros
- [ ] **Multi-culturas** (cana, soja, milho)

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

## 📄 Licença

Este projeto está sob a licença **ISC**.

## 👨‍💻 Autor

**Felipe Soares**
- GitHub: [@felipe-soares](https://github.com/reroso)
- LinkedIn: [Felipe Soares](https://linkedin.com/in/felipe-soares)
