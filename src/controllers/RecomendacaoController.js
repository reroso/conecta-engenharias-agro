const Recomendacao = require('../models/Recomendacao');
const Plantacao = require('../models/Plantacao');
const DadosClimaticos = require('../models/DadosClimaticos');
const Solo = require('../models/Solo');
const moment = require('moment');

class RecomendacaoController {
  // Página principal de recomendações
  static async index(req, res) {
    try {
      const usuarioId = req.session.user.id;
      
      const recomendacoes = await Recomendacao.find({ 
        usuario: usuarioId,
        ativa: true 
      })
      .sort({ 'cronograma.dataRecomendada': 1, prioridade: -1 })
      .populate('plantacao', 'nome especie')
      .limit(50);

      // Agrupar por status
      const agrupadas = {
        pendentes: recomendacoes.filter(r => r.status === 'pendente'),
        em_andamento: recomendacoes.filter(r => r.status === 'em_andamento'),
        concluidas: recomendacoes.filter(r => r.status === 'concluida'),
        vencidas: recomendacoes.filter(r => r.status === 'vencida')
      };

      res.render('recomendacao/index', {
        title: 'Recomendações - Conecta Engenharias Agro',
        recomendacoes: agrupadas,
        total: recomendacoes.length
      });
    } catch (error) {
      console.error('Erro ao carregar recomendações:', error);
      res.status(500).render('error', {
        message: 'Erro ao carregar recomendações'
      });
    }
  }

  // Gerar recomendações para uma plantação específica
  static async gerar(req, res) {
    try {
      const { plantacaoId } = req.params;
      const usuarioId = req.session.user.id;
      
      const plantacao = await Plantacao.findOne({
        _id: plantacaoId,
        usuario: usuarioId
      });

      if (!plantacao) {
        return res.status(404).json({ error: 'Plantação não encontrada' });
      }

      // Buscar dados recentes
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const dadosClimaticos = await DadosClimaticos.find({
        plantacao: plantacao._id,
        data: { $gte: seteDiasAtras }
      }).sort({ data: -1 });

      const dadosSolo = await Solo.findOne({
        plantacao: plantacao._id
      }).sort({ dataAnalise: -1 });

      // Gerar recomendações usando o algoritmo
      const recomendacoes = await this.algoritmoRecomendacoes(plantacao, dadosClimaticos, dadosSolo, usuarioId);

      res.json({
        message: `${recomendacoes.length} recomendações geradas`,
        recomendacoes: recomendacoes.map(r => ({
          id: r._id,
          tipo: r.tipo,
          prioridade: r.prioridade,
          titulo: r.titulo,
          dataRecomendada: r.cronograma.dataRecomendada
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar recomendações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Gerar recomendações para todas as plantações do usuário
  static async gerarTodas(req, res) {
    try {
      const usuarioId = req.session.user.id;
      
      const plantacoes = await Plantacao.find({ 
        usuario: usuarioId, 
        ativa: true 
      });

      let totalRecomendacoes = 0;
      const resultados = [];

      for (const plantacao of plantacoes) {
        try {
          const seteDiasAtras = new Date();
          seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

          const dadosClimaticos = await DadosClimaticos.find({
            plantacao: plantacao._id,
            data: { $gte: seteDiasAtras }
          }).sort({ data: -1 });

          const dadosSolo = await Solo.findOne({
            plantacao: plantacao._id
          }).sort({ dataAnalise: -1 });

          const recomendacoes = await this.algoritmoRecomendacoes(plantacao, dadosClimaticos, dadosSolo, usuarioId);
          
          totalRecomendacoes += recomendacoes.length;
          resultados.push({
            plantacao: plantacao.nome,
            recomendacoes: recomendacoes.length,
            status: 'sucesso'
          });
        } catch (error) {
          resultados.push({
            plantacao: plantacao.nome,
            recomendacoes: 0,
            status: 'erro',
            erro: error.message
          });
        }
      }

      res.json({
        message: `${totalRecomendacoes} recomendações geradas para ${plantacoes.length} plantações`,
        totalRecomendacoes,
        resultados
      });
    } catch (error) {
      console.error('Erro ao gerar recomendações para todas as plantações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Algoritmo principal de geração de recomendações
  static async algoritmoRecomendacoes(plantacao, dadosClimaticos, dadosSolo, usuarioId) {
    const recomendacoes = [];
    const hoje = new Date();
    const necessidadeHidrica = plantacao.getNecessidadeHidrica();

    try {
      // 1. ANÁLISE DE IRRIGAÇÃO
      if (dadosClimaticos.length > 0) {
        const precipitacaoTotal = dadosClimaticos.reduce((total, dado) => total + (dado.precipitacao?.total || 0), 0);
        const precipitacaoMedia = precipitacaoTotal / 7; // mm/dia
        const precipitacaoSemanal = precipitacaoTotal;

        // Regra: Se chuva < 20mm nos últimos 7 dias → recomendar irrigação
        if (precipitacaoSemanal < 20) {
          const deficitHidrico = necessidadeHidrica.mmPorSemana - precipitacaoSemanal;
          
          const recomendacao = new Recomendacao({
            plantacao: plantacao._id,
            usuario: usuarioId,
            tipo: 'irrigacao',
            prioridade: deficitHidrico > 30 ? 'alta' : 'media',
            titulo: 'Irrigação Necessária',
            descricao: `A precipitação dos últimos 7 dias (${precipitacaoSemanal.toFixed(1)}mm) está abaixo do ideal para ${plantacao.especie}. Déficit hídrico estimado: ${deficitHidrico.toFixed(1)}mm.`,
            acaoRecomendada: `Aplicar irrigação de ${deficitHidrico.toFixed(1)}mm (aproximadamente ${(deficitHidrico * plantacao.area.hectares * 10).toFixed(0)} litros por hectare).`,
            parametrosUsados: {
              dadosClimaticos: {
                precipitacaoTotal: precipitacaoSemanal,
                periodo: 'últimos 7 dias'
              },
              dadosPlantacao: {
                especie: plantacao.especie,
                necessidadeHidrica: necessidadeHidrica.mmPorSemana
              }
            },
            calculos: {
              deficit_hidrico: {
                valor: deficitHidrico,
                unidade: 'mm'
              },
              quantidade_irrigacao: {
                valor: deficitHidrico * plantacao.area.hectares * 10,
                unidade: 'litros'
              }
            },
            cronograma: {
              dataRecomendada: new Date(hoje.getTime() + 24 * 60 * 60 * 1000), // amanhã
              dataLimite: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 dias
            },
            algoritmoUsado: {
              versao: '1.0',
              regrasAplicadas: ['deficit_hidrico_semanal']
            }
          });

          await recomendacao.save();
          recomendacoes.push(recomendacao);
        }

        // 2. ANÁLISE DE ESTRESSE TÉRMICO
        const temperaturasMaximas = dadosClimaticos
          .map(d => d.temperatura?.maxima)
          .filter(t => t !== null && t !== undefined);
        
        const umidades = dadosClimaticos
          .map(d => d.umidade?.media)
          .filter(u => u !== null && u !== undefined);

        if (temperaturasMaximas.length > 0 && umidades.length > 0) {
          const tempMaxMedia = temperaturasMaximas.reduce((a, b) => a + b, 0) / temperaturasMaximas.length;
          const umidadeMedia = umidades.reduce((a, b) => a + b, 0) / umidades.length;

          // Regra: Se temperatura > 32°C e umidade < 30% → alerta de estresse hídrico
          if (tempMaxMedia > 32 && umidadeMedia < 30) {
            const recomendacao = new Recomendacao({
              plantacao: plantacao._id,
              usuario: usuarioId,
              tipo: 'alerta_climatico',
              prioridade: 'alta',
              titulo: 'Alerta: Estresse Hídrico',
              descricao: `Condições de estresse hídrico detectadas: temperatura média máxima de ${tempMaxMedia.toFixed(1)}°C e umidade relativa média de ${umidadeMedia.toFixed(1)}%. Estas condições podem prejudicar o desenvolvimento da plantação.`,
              acaoRecomendada: 'Aumentar frequência de irrigação, aplicar cobertura morta e considerar sombreamento temporário nas horas mais quentes.',
              parametrosUsados: {
                dadosClimaticos: {
                  temperaturaMedia: tempMaxMedia,
                  umidadeRelativa: umidadeMedia,
                  periodo: 'últimos 7 dias'
                }
              },
              cronograma: {
                dataRecomendada: hoje,
                dataLimite: new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
              },
              alertas: [{
                tipo: 'temperatura_extrema',
                severidade: 'alta',
                dataAlerta: hoje,
                validoAte: new Date(hoje.getTime() + 3 * 24 * 60 * 60 * 1000),
                mensagem: 'Temperatura e baixa umidade podem causar estresse nas plantas'
              }],
              algoritmoUsado: {
                versao: '1.0',
                regrasAplicadas: ['estresse_termico_hidrico']
              }
            });

            await recomendacao.save();
            recomendacoes.push(recomendacao);
          }
        }

        // 3. ANÁLISE DE EXCESSO DE CHUVA
        // Regra: Se chuva > 80mm na semana → alerta de risco de fungos
        if (precipitacaoSemanal > 80) {
          const recomendacao = new Recomendacao({
            plantacao: plantacao._id,
            usuario: usuarioId,
            tipo: 'alerta_climatico',
            prioridade: 'media',
            titulo: 'Alerta: Excesso de Precipitação',
            descricao: `Precipitação excessiva detectada (${precipitacaoSemanal.toFixed(1)}mm em 7 dias). Alto risco de desenvolvimento de doenças fúngicas e problemas de drenagem.`,
            acaoRecomendada: 'Monitorar sinais de doenças fúngicas, melhorar drenagem se necessário, evitar irrigação adicional e considerar aplicação preventiva de fungicidas.',
            parametrosUsados: {
              dadosClimaticos: {
                precipitacaoTotal: precipitacaoSemanal,
                periodo: 'últimos 7 dias'
              }
            },
            cronograma: {
              dataRecomendada: hoje,
              dataLimite: new Date(hoje.getTime() + 5 * 24 * 60 * 60 * 1000)
            },
            alertas: [{
              tipo: 'excesso_chuva',
              severidade: 'media',
              dataAlerta: hoje,
              validoAte: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000),
              mensagem: 'Excesso de umidade favorece desenvolvimento de fungos'
            }],
            algoritmoUsado: {
              versao: '1.0',
              regrasAplicadas: ['excesso_precipitacao']
            }
          });

          await recomendacao.save();
          recomendacoes.push(recomendacao);
        }
      }

      // 4. ANÁLISE DO SOLO (se disponível)
      if (dadosSolo) {
        // Regra: Se pH < 5.5 → recomendar correção com calcário
        if (dadosSolo.ph && dadosSolo.ph.valor < 5.5) {
          const necessidadeCalagem = dadosSolo.verificarNecessidadeCalagem();
          
          if (necessidadeCalagem) {
            const recomendacao = new Recomendacao({
              plantacao: plantacao._id,
              usuario: usuarioId,
              tipo: 'correcao_ph',
              prioridade: dadosSolo.ph.valor < 5.0 ? 'alta' : 'media',
              titulo: 'Correção de pH Necessária',
              descricao: `O pH do solo (${dadosSolo.ph.valor}) está abaixo do ideal para ${plantacao.especie}. Solo ácido pode limitar a absorção de nutrientes.`,
              acaoRecomendada: `Aplicar ${dadosSolo.recomendacoes.calagem.quantidade || 'calcário conforme análise'} de ${dadosSolo.recomendacoes.calagem.tipoCalcario || 'calcário'} por hectare.`,
              parametrosUsados: {
                dadosSolo: {
                  ph: dadosSolo.ph.valor,
                  dataAnalise: dadosSolo.dataAnalise
                }
              },
              calculos: {
                quantidade_corretivo: {
                  valor: dadosSolo.recomendacoes.calagem.quantidade || 2,
                  unidade: 't/ha'
                }
              },
              cronograma: {
                dataRecomendada: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), // próxima semana
                dataLimite: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias
              },
              algoritmoUsado: {
                versao: '1.0',
                regrasAplicadas: ['correcao_ph_solo']
              }
            });

            await recomendacao.save();
            recomendacoes.push(recomendacao);
          }
        }

        // 5. ANÁLISE DE NUTRIENTES
        const resumoFertilidade = dadosSolo.getResumoFertilidade();
        
        if (resumoFertilidade.problemas.length > 0) {
          const recomendacao = new Recomendacao({
            plantacao: plantacao._id,
            usuario: usuarioId,
            tipo: 'adubacao',
            prioridade: 'media',
            titulo: 'Adubação Recomendada',
            descricao: `Deficiências nutricionais detectadas: ${resumoFertilidade.problemas.join(', ')}. Análise de solo de ${moment(dadosSolo.dataAnalise).format('DD/MM/YYYY')}.`,
            acaoRecomendada: 'Realizar adubação conforme análise de solo. Considerar adubação foliar para correção rápida de deficiências.',
            parametrosUsados: {
              dadosSolo: {
                dataAnalise: dadosSolo.dataAnalise,
                problemas: resumoFertilidade.problemas
              }
            },
            cronograma: {
              dataRecomendada: new Date(hoje.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 semanas
              dataLimite: new Date(hoje.getTime() + 45 * 24 * 60 * 60 * 1000) // 45 dias
            },
            algoritmoUsado: {
              versao: '1.0',
              regrasAplicadas: ['deficiencia_nutrientes']
            }
          });

          await recomendacao.save();
          recomendacoes.push(recomendacao);
        }
      }

      // 6. RECOMENDAÇÕES SAZONAIS BASEADAS NA ESPÉCIE E IDADE
      const idade = plantacao.calcularIdade();
      const recomendacaoSazonal = this.getRecomendacaoSazonal(plantacao, idade, hoje);
      
      if (recomendacaoSazonal) {
        const recomendacao = new Recomendacao({
          plantacao: plantacao._id,
          usuario: usuarioId,
          tipo: 'manejo_cultural',
          prioridade: 'baixa',
          titulo: recomendacaoSazonal.titulo,
          descricao: recomendacaoSazonal.descricao,
          acaoRecomendada: recomendacaoSazonal.acao,
          parametrosUsados: {
            dadosPlantacao: {
              especie: plantacao.especie,
              idade: idade.dias,
              statusDesenvolvimento: plantacao.statusDesenvolvimento
            }
          },
          cronograma: {
            dataRecomendada: recomendacaoSazonal.dataRecomendada,
            dataLimite: recomendacaoSazonal.dataLimite
          },
          algoritmoUsado: {
            versao: '1.0',
            regrasAplicadas: ['manejo_sazonal']
          }
        });

        await recomendacao.save();
        recomendacoes.push(recomendacao);
      }

    } catch (error) {
      console.error('Erro no algoritmo de recomendações:', error);
    }

    return recomendacoes;
  }

  // Obter recomendações sazonais baseadas na espécie
  static getRecomendacaoSazonal(plantacao, idade, hoje) {
    const mes = hoje.getMonth() + 1; // 1-12
    const especie = plantacao.especie;
    
    // Recomendações básicas por espécie e época do ano
    const recomendacoesSazonais = {
      cafe: {
        // Poda (julho-agosto)
        7: { titulo: 'Época de Poda', descricao: 'Período ideal para poda do cafeeiro', acao: 'Realizar poda de limpeza e formação' },
        8: { titulo: 'Época de Poda', descricao: 'Período ideal para poda do cafeeiro', acao: 'Realizar poda de limpeza e formação' },
        // Adubação pré-florada (setembro-outubro)
        9: { titulo: 'Adubação Pré-Florada', descricao: 'Preparar a planta para floração', acao: 'Aplicar adubação rica em fósforo e potássio' },
        10: { titulo: 'Adubação Pré-Florada', descricao: 'Preparar a planta para floração', acao: 'Aplicar adubação rica em fósforo e potássio' }
      },
      uva: {
        6: { titulo: 'Poda de Inverno', descricao: 'Período de dormência para poda', acao: 'Realizar poda de formação e produção' },
        7: { titulo: 'Poda de Inverno', descricao: 'Período de dormência para poda', acao: 'Realizar poda de formação e produção' },
        9: { titulo: 'Brotação', descricao: 'Início da brotação', acao: 'Monitorar brotação e aplicar defensivos preventivos' }
      },
      laranja: {
        4: { titulo: 'Adubação de Outono', descricao: 'Preparação para período seco', acao: 'Aplicar adubação potássica' },
        8: { titulo: 'Poda de Limpeza', descricao: 'Remoção de galhos secos', acao: 'Realizar poda sanitária' },
        10: { titulo: 'Floração', descricao: 'Período de floração', acao: 'Evitar aplicação de defensivos durante floração' }
      },
      banana: {
        // Ano todo, mas com atenção especial ao inverno
        6: { titulo: 'Proteção de Inverno', descricao: 'Proteção contra frio', acao: 'Monitorar temperatura e proteger se necessário' },
        7: { titulo: 'Proteção de Inverno', descricao: 'Proteção contra frio', acao: 'Monitorar temperatura e proteger se necessário' }
      }
    };

    const recomendacoesMes = recomendacoesSazonais[especie];
    
    if (recomendacoesMes && recomendacoesMes[mes]) {
      const rec = recomendacoesMes[mes];
      
      return {
        titulo: rec.titulo,
        descricao: rec.descricao,
        acao: rec.acao,
        dataRecomendada: new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000), // próxima semana
        dataLimite: new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 dias
      };
    }

    return null;
  }

  // Marcar recomendação como aplicada
  static async marcarAplicada(req, res) {
    try {
      const { id } = req.params;
      const { observacoes } = req.body;
      
      const recomendacao = await Recomendacao.findOne({
        _id: id,
        usuario: req.session.user.id
      });

      if (!recomendacao) {
        return res.status(404).json({ error: 'Recomendação não encontrada' });
      }

      await recomendacao.marcarComoAplicada(observacoes);

      res.json({ 
        message: 'Recomendação marcada como aplicada',
        recomendacao: {
          id: recomendacao._id,
          status: recomendacao.status,
          dataAplicacao: recomendacao.feedback.dataAplicacao
        }
      });
    } catch (error) {
      console.error('Erro ao marcar recomendação como aplicada:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Avaliar efetividade de uma recomendação
  static async avaliar(req, res) {
    try {
      const { id } = req.params;
      const { nota, observacoes } = req.body;
      
      if (!nota || nota < 1 || nota > 5) {
        return res.status(400).json({ error: 'Nota deve ser entre 1 e 5' });
      }

      const recomendacao = await Recomendacao.findOne({
        _id: id,
        usuario: req.session.user.id
      });

      if (!recomendacao) {
        return res.status(404).json({ error: 'Recomendação não encontrada' });
      }

      await recomendacao.avaliarEfetividade(nota, observacoes);

      res.json({ 
        message: 'Avaliação registrada com sucesso',
        avaliacao: {
          nota,
          observacoes: recomendacao.feedback.observacoes
        }
      });
    } catch (error) {
      console.error('Erro ao avaliar recomendação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter dashboard de recomendações
  static async dashboard(req, res) {
    try {
      const usuarioId = req.session.user.id;
      
      // Estatísticas gerais
      const estatisticas = await Recomendacao.aggregate([
        { $match: { usuario: usuarioId, ativa: true } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      // Recomendações urgentes (próximas ao vencimento)
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      
      const urgentes = await Recomendacao.find({
        usuario: usuarioId,
        status: 'pendente',
        'cronograma.dataLimite': { $lte: amanha },
        ativa: true
      })
      .populate('plantacao', 'nome especie')
      .sort({ 'cronograma.dataLimite': 1 });

      // Recomendações por tipo
      const porTipo = await Recomendacao.aggregate([
        { $match: { usuario: usuarioId, ativa: true } },
        {
          $group: {
            _id: '$tipo',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        estatisticas: {
          total: estatisticas.reduce((acc, stat) => acc + stat.count, 0),
          porStatus: estatisticas,
          porTipo
        },
        urgentes: urgentes.map(r => ({
          id: r._id,
          titulo: r.titulo,
          plantacao: r.plantacao.nome,
          prioridade: r.prioridade,
          dataLimite: r.cronograma.dataLimite,
          diasRestantes: r.getDiasParaAplicacao()
        }))
      });
    } catch (error) {
      console.error('Erro ao gerar dashboard de recomendações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}

module.exports = RecomendacaoController;