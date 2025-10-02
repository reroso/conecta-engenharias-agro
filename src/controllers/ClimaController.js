const DadosClimaticos = require('../models/DadosClimaticos');
const Plantacao = require('../models/Plantacao');
const InmetService = require('../services/InmetService');
const moment = require('moment');

class ClimaController {
  // Página principal de dados climáticos
  static async index(req, res) {
    try {
      const usuarioId = req.session.user.id;
      
      // Buscar plantações do usuário
      const plantacoes = await Plantacao.find({ 
        usuario: usuarioId, 
        ativa: true 
      });

      // Buscar dados climáticos recentes
      const dadosRecentes = await DadosClimaticos.find({
        plantacao: { $in: plantacoes.map(p => p._id) }
      })
      .sort({ data: -1 })
      .limit(50)
      .populate('plantacao', 'nome especie');

      res.render('clima/index', {
        title: 'Dados Climáticos - Conecta Engenharias Agro',
        plantacoes,
        dadosRecentes
      });
    } catch (error) {
      console.error('Erro ao carregar dados climáticos:', error);
      res.status(500).render('error', {
        message: 'Erro ao carregar dados climáticos'
      });
    }
  }

  // Buscar estações próximas a uma plantação
  static async buscarEstacoes(req, res) {
    try {
      const { plantacaoId } = req.params;
      
      const plantacao = await Plantacao.findOne({
        _id: plantacaoId,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      const estacoes = await InmetService.buscarEstacoes(
        plantacao.localizacao.latitude,
        plantacao.localizacao.longitude
      );

      // Atualizar código da estação mais próxima na plantação
      if (estacoes.length > 0) {
        plantacao.localizacao.codigoEstacaoInmet = estacoes[0].codigo;
        await plantacao.save();
      }

      res.json(estacoes);
    } catch (error) {
      console.error('Erro ao buscar estações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar dados climáticos de uma plantação
  static async atualizarDados(req, res) {
    try {
      const { plantacaoId } = req.params;
      const { dias = 7 } = req.query; // Padrão: últimos 7 dias
      
      const plantacao = await Plantacao.findOne({
        _id: plantacaoId,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      let codigoEstacao = plantacao.localizacao.codigoEstacaoInmet;
      
      // Se não há estação definida, buscar a mais próxima
      if (!codigoEstacao) {
        const estacoes = await InmetService.buscarEstacoes(
          plantacao.localizacao.latitude,
          plantacao.localizacao.longitude
        );
        
        if (estacoes.length > 0) {
          codigoEstacao = estacoes[0].codigo;
          plantacao.localizacao.codigoEstacaoInmet = codigoEstacao;
          await plantacao.save();
        } else {
          return res.status(404).json({ 
            error: 'Nenhuma estação meteorológica encontrada próxima à plantação' 
          });
        }
      }

      // Definir período
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataFim.getDate() - parseInt(dias));

      // Buscar dados do INMET
      const dadosInmet = await InmetService.buscarDadosClimaticos(
        codigoEstacao,
        dataInicio,
        dataFim
      );

      // Salvar dados no banco
      const dadosSalvos = [];
      
      for (const dado of dadosInmet) {
        // Verificar se já existe para evitar duplicatas
        const existente = await DadosClimaticos.findOne({
          plantacao: plantacao._id,
          data: {
            $gte: moment(dado.data).startOf('day').toDate(),
            $lt: moment(dado.data).endOf('day').toDate()
          }
        });

        if (!existente) {
          const novoDado = new DadosClimaticos({
            plantacao: plantacao._id,
            estacaoInmet: {
              codigo: codigoEstacao,
              nome: 'Estação INMET',
              latitude: plantacao.localizacao.latitude,
              longitude: plantacao.localizacao.longitude
            },
            ...dado
          });

          await novoDado.save();
          dadosSalvos.push(novoDado);
        }
      }

      res.json({
        message: `${dadosSalvos.length} novos registros climáticos salvos`,
        dadosSalvos: dadosSalvos.length,
        estacao: codigoEstacao,
        periodo: {
          inicio: dataInicio,
          fim: dataFim
        }
      });
    } catch (error) {
      console.error('Erro ao atualizar dados climáticos:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter dados climáticos de uma plantação para gráficos
  static async dadosGrafico(req, res) {
    try {
      const { plantacaoId } = req.params;
      const { dias = 30 } = req.query;
      
      const plantacao = await Plantacao.findOne({
        _id: plantacaoId,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - parseInt(dias));

      const dados = await DadosClimaticos.find({
        plantacao: plantacao._id,
        data: { $gte: dataInicio }
      })
      .sort({ data: 1 })
      .select('data temperatura umidade precipitacao vento radiacaoSolar');

      // Formatar dados para Chart.js
      const labels = dados.map(d => moment(d.data).format('DD/MM'));
      
      const datasets = {
        temperatura: {
          maxima: dados.map(d => d.temperatura?.maxima || null),
          minima: dados.map(d => d.temperatura?.minima || null),
          media: dados.map(d => d.temperatura?.media || null)
        },
        umidade: dados.map(d => d.umidade?.media || null),
        precipitacao: dados.map(d => d.precipitacao?.total || 0),
        vento: dados.map(d => d.vento?.velocidade || null),
        radiacao: dados.map(d => d.radiacaoSolar || null)
      };

      res.json({
        labels,
        datasets,
        plantacao: {
          nome: plantacao.nome,
          especie: plantacao.especie
        }
      });
    } catch (error) {
      console.error('Erro ao buscar dados para gráfico:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Resumo climático de uma plantação
  static async resumo(req, res) {
    try {
      const { plantacaoId } = req.params;
      
      const plantacao = await Plantacao.findOne({
        _id: plantacaoId,
        usuario: req.session.user.id
      });

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      // Dados dos últimos 7 dias
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const dadosRecentes = await DadosClimaticos.find({
        plantacao: plantacao._id,
        data: { $gte: seteDiasAtras }
      }).sort({ data: -1 });

      if (dadosRecentes.length === 0) {
        return res.json({
          message: 'Nenhum dado climático encontrado para os últimos 7 dias',
          dados: null
        });
      }

      // Calcular estatísticas
      const temperaturas = dadosRecentes.map(d => d.temperatura?.media).filter(t => t !== null);
      const precipitacoes = dadosRecentes.map(d => d.precipitacao?.total || 0);
      const umidades = dadosRecentes.map(d => d.umidade?.media).filter(u => u !== null);

      const resumo = {
        periodo: {
          inicio: seteDiasAtras,
          fim: new Date(),
          diasComDados: dadosRecentes.length
        },
        temperatura: {
          media: temperaturas.length > 0 ? temperaturas.reduce((a, b) => a + b, 0) / temperaturas.length : null,
          maxima: temperaturas.length > 0 ? Math.max(...temperaturas) : null,
          minima: temperaturas.length > 0 ? Math.min(...temperaturas) : null
        },
        precipitacao: {
          total: precipitacoes.reduce((a, b) => a + b, 0),
          dias_com_chuva: precipitacoes.filter(p => p > 0).length,
          maior_volume: precipitacoes.length > 0 ? Math.max(...precipitacoes) : 0
        },
        umidade: {
          media: umidades.length > 0 ? umidades.reduce((a, b) => a + b, 0) / umidades.length : null,
          maxima: umidades.length > 0 ? Math.max(...umidades) : null,
          minima: umidades.length > 0 ? Math.min(...umidades) : null
        },
        dadoMaisRecente: dadosRecentes[0]
      };

      res.json(resumo);
    } catch (error) {
      console.error('Erro ao gerar resumo climático:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Atualizar dados de todas as plantações do usuário
  static async atualizarTodas(req, res) {
    try {
      const usuarioId = req.session.user.id;
      
      const plantacoes = await Plantacao.find({ 
        usuario: usuarioId, 
        ativa: true 
      });

      const resultados = [];

      for (const plantacao of plantacoes) {
        try {
          let codigoEstacao = plantacao.localizacao.codigoEstacaoInmet;
          
          if (!codigoEstacao) {
            const estacoes = await InmetService.buscarEstacoes(
              plantacao.localizacao.latitude,
              plantacao.localizacao.longitude
            );
            
            if (estacoes.length > 0) {
              codigoEstacao = estacoes[0].codigo;
              plantacao.localizacao.codigoEstacaoInmet = codigoEstacao;
              await plantacao.save();
            }
          }

          if (codigoEstacao) {
            const ontem = new Date();
            ontem.setDate(ontem.getDate() - 1);
            
            const dadosRecentes = await InmetService.buscarDadosRecentes(codigoEstacao);
            
            if (dadosRecentes) {
              const existente = await DadosClimaticos.findOne({
                plantacao: plantacao._id,
                data: {
                  $gte: moment(dadosRecentes.data).startOf('day').toDate(),
                  $lt: moment(dadosRecentes.data).endOf('day').toDate()
                }
              });

              if (!existente) {
                const novoDado = new DadosClimaticos({
                  plantacao: plantacao._id,
                  estacaoInmet: {
                    codigo: codigoEstacao,
                    nome: 'Estação INMET'
                  },
                  ...dadosRecentes
                });

                await novoDado.save();
                
                resultados.push({
                  plantacao: plantacao.nome,
                  status: 'atualizada',
                  data: dadosRecentes.data
                });
              } else {
                resultados.push({
                  plantacao: plantacao.nome,
                  status: 'já_atualizada',
                  data: existente.data
                });
              }
            }
          } else {
            resultados.push({
              plantacao: plantacao.nome,
              status: 'erro',
              erro: 'Estação não encontrada'
            });
          }
        } catch (error) {
          resultados.push({
            plantacao: plantacao.nome,
            status: 'erro',
            erro: error.message
          });
        }
      }

      res.json({
        message: 'Atualização concluída',
        plantacoes_processadas: plantacoes.length,
        resultados
      });
    } catch (error) {
      console.error('Erro ao atualizar todas as plantações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Job para atualização automática (pode ser usado com cron)
  static async jobAtualizacao() {
    try {
      console.log('Iniciando job de atualização climática...');
      
      const plantacoes = await Plantacao.find({ ativa: true });
      let atualizadas = 0;
      let erros = 0;

      for (const plantacao of plantacoes) {
        try {
          const codigoEstacao = plantacao.localizacao.codigoEstacaoInmet;
          
          if (codigoEstacao) {
            const dadosRecentes = await InmetService.buscarDadosRecentes(codigoEstacao);
            
            if (dadosRecentes) {
              const existente = await DadosClimaticos.findOne({
                plantacao: plantacao._id,
                data: {
                  $gte: moment(dadosRecentes.data).startOf('day').toDate(),
                  $lt: moment(dadosRecentes.data).endOf('day').toDate()
                }
              });

              if (!existente) {
                const novoDado = new DadosClimaticos({
                  plantacao: plantacao._id,
                  estacaoInmet: { codigo: codigoEstacao },
                  ...dadosRecentes
                });

                await novoDado.save();
                atualizadas++;
              }
            }
          }
        } catch (error) {
          console.error(`Erro ao atualizar plantação ${plantacao.nome}:`, error.message);
          erros++;
        }
      }

      console.log(`Job concluído: ${atualizadas} atualizadas, ${erros} erros`);
      return { atualizadas, erros };
    } catch (error) {
      console.error('Erro no job de atualização:', error);
      throw error;
    }
  }
}

module.exports = ClimaController;