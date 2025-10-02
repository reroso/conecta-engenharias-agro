# Conecta Engenharias - Sistema Agrícola

Sistema web que integra dados climáticos do INMET com recomendações de manejo para plantas perenes.

## Arquitetura MVC

### Models
- **Usuario**: Cadastro e autenticação
- **Plantacao**: Dados da plantação (espécie, localização, área)
- **DadosClimaticos**: Dados do INMET (temperatura, chuva, umidade, radiação)
- **Solo**: Características do solo (pH, tipo, nutrientes)
- **Recomendacoes**: Sugestões de manejo geradas pelo sistema

### Controllers
- **AuthController**: Login/registro de usuários
- **PlantacaoController**: CRUD das plantações
- **ClimaController**: Integração com API do INMET
- **RecomendacaoController**: Geração de recomendações

### Views
- Dashboard com gráficos climáticos
- Status das plantações
- Recomendações atuais
- Histórico em gráfico

## Instalação

```bash
npm install
npm run dev
```

## Funcionalidades

- Integração com API do INMET
- Recomendações automáticas de irrigação
- Alertas climáticos
- Dashboard interativo
- Gestão de múltiplas plantações

## Regras de Recomendação

- Chuva < 20mm em 7 dias → irrigação necessária
- pH < 5.5 → correção com calcário
- Temperatura > 32°C + umidade < 30% → alerta estresse hídrico
- Chuva > 80mm/semana → alerta risco de fungos