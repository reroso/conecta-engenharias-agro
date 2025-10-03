// Conecta Engenharias Agro - JavaScript Principal

class AgroApp {
  constructor() {
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.initCharts();
    this.setupFormValidation();
    this.checkNotifications();
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('show');
      });
    }

    // Auto-hide alerts
    setTimeout(() => {
      const alerts = document.querySelectorAll('.alert');
      alerts.forEach(alert => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
      });
    }, 5000);

    // Confirmation dialogs
    document.querySelectorAll('[data-confirm]').forEach(element => {
      element.addEventListener('click', (e) => {
        const message = element.getAttribute('data-confirm');
        if (!confirm(message)) {
          e.preventDefault();
        }
      });
    });

    // Copy to clipboard
    document.querySelectorAll('[data-copy]').forEach(element => {
      element.addEventListener('click', () => {
        const text = element.getAttribute('data-copy');
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('Copiado para área de transferência!', 'success');
        });
      });
    });
  }

  setupFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        if (!this.validateForm(form)) {
          e.preventDefault();
        }
      });

      // Real-time validation
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('blur', () => {
          this.validateField(input);
        });
      });
    });
  }

  validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const type = field.type;
    let isValid = true;
    let message = '';

    // Required validation
    if (field.hasAttribute('required') && !value) {
      isValid = false;
      message = 'Este campo é obrigatório';
    }

    // Email validation
    if (type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        isValid = false;
        message = 'Email inválido';
      }
    }

    // Number validation
    if (type === 'number' && value) {
      const min = parseFloat(field.getAttribute('min'));
      const max = parseFloat(field.getAttribute('max'));
      
      if (!isNaN(min) && parseFloat(value) < min) {
        isValid = false;
        message = `Valor deve ser maior que ${min}`;
      }
      
      if (!isNaN(max) && parseFloat(value) > max) {
        isValid = false;
        message = `Valor deve ser menor que ${max}`;
      }
    }

    // Password confirmation
    if (field.name === 'confirmarSenha') {
      const senhaField = document.querySelector('input[name="senha"]');
      if (senhaField && value !== senhaField.value) {
        isValid = false;
        message = 'Senhas não coincidem';
      }
    }

    this.showFieldValidation(field, isValid, message);
    return isValid;
  }

  showFieldValidation(field, isValid, message) {
    // Remove existing validation
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }

    field.classList.remove('error', 'success');

    if (!isValid && message) {
      field.classList.add('error');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'field-error';
      errorDiv.textContent = message;
      field.parentNode.appendChild(errorDiv);
    } else if (isValid && field.value.trim()) {
      field.classList.add('success');
    }
  }

  initCharts() {
    // Inicializar gráficos se Chart.js estiver disponível
    if (typeof Chart !== 'undefined') {
      this.initClimateCharts();
      this.initDashboardCharts();
    }
  }

  initClimateCharts() {
    const tempChart = document.getElementById('temperatureChart');
    const rainChart = document.getElementById('precipitationChart');
    const humidityChart = document.getElementById('humidityChart');

    if (tempChart) {
      this.createTemperatureChart(tempChart);
    }

    if (rainChart) {
      this.createPrecipitationChart(rainChart);
    }

    if (humidityChart) {
      this.createHumidityChart(humidityChart);
    }
  }

  createTemperatureChart(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Dados do gráfico virão do backend via AJAX
    const plantacaoId = canvas.getAttribute('data-plantacao');
    
    if (plantacaoId) {
      this.loadChartData(`/clima/dados/${plantacaoId}`, (data) => {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'Temperatura Máxima',
                data: data.datasets.temperatura.maxima,
                borderColor: '#ff6b35',
                backgroundColor: 'rgba(255, 107, 53, 0.1)',
                tension: 0.4
              },
              {
                label: 'Temperatura Mínima',
                data: data.datasets.temperatura.minima,
                borderColor: '#2e8b57',
                backgroundColor: 'rgba(46, 139, 87, 0.1)',
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: false,
                title: {
                  display: true,
                  text: 'Temperatura (°C)'
                }
              }
            },
            plugins: {
              legend: {
                position: 'top'
              },
              title: {
                display: true,
                text: 'Temperatura - Últimos 30 dias'
              }
            }
          }
        });
      });
    }
  }

  createPrecipitationChart(canvas) {
    const ctx = canvas.getContext('2d');
    const plantacaoId = canvas.getAttribute('data-plantacao');
    
    if (plantacaoId) {
      this.loadChartData(`/clima/dados/${plantacaoId}`, (data) => {
        new Chart(ctx, {
          type: 'bar',
          data: {
            labels: data.labels,
            datasets: [{
              label: 'Precipitação (mm)',
              data: data.datasets.precipitacao,
              backgroundColor: '#17a2b8',
              borderColor: '#138496',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Precipitação (mm)'
                }
              }
            },
            plugins: {
              legend: {
                position: 'top'
              },
              title: {
                display: true,
                text: 'Precipitação - Últimos 30 dias'
              }
            }
          }
        });
      });
    }
  }

  createHumidityChart(canvas) {
    const ctx = canvas.getContext('2d');
    const plantacaoId = canvas.getAttribute('data-plantacao');
    
    if (plantacaoId) {
      this.loadChartData(`/clima/dados/${plantacaoId}`, (data) => {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [{
              label: 'Umidade Relativa (%)',
              data: data.datasets.umidade,
              borderColor: '#28a745',
              backgroundColor: 'rgba(40, 167, 69, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                title: {
                  display: true,
                  text: 'Umidade (%)'
                }
              }
            },
            plugins: {
              legend: {
                position: 'top'
              },
              title: {
                display: true,
                text: 'Umidade Relativa - Últimos 30 dias'
              }
            }
          }
        });
      });
    }
  }

  initDashboardCharts() {
    const recomendacoesChart = document.getElementById('recomendacoesChart');
    
    if (recomendacoesChart) {
      // Método mais robusto para limpar canvas
      try {
        // Destruir qualquer chart existente com esse ID
        const existingChart = Chart.getChart(recomendacoesChart);
        if (existingChart) {
          existingChart.destroy();
        }
        
        // Limpar contexto do canvas
        const ctx = recomendacoesChart.getContext('2d');
        ctx.clearRect(0, 0, recomendacoesChart.width, recomendacoesChart.height);
        
        // Destruir instância local se existir
        if (this.chartInstances && this.chartInstances.recomendacoes) {
          this.chartInstances.recomendacoes.destroy();
          delete this.chartInstances.recomendacoes;
        }
      } catch (error) {
        console.log('🧹 Limpeza de canvas:', error.message);
      }
      
      this.loadChartData('/api/recomendacoes/dashboard', (data) => {
        const ctx = recomendacoesChart.getContext('2d');
        
        // Inicializar array de instâncias se não existir
        if (!this.chartInstances) {
          this.chartInstances = {};
        }
        
        this.chartInstances.recomendacoes = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: data.estatisticas.porStatus.map(s => this.statusLabel(s._id)),
            datasets: [{
              data: data.estatisticas.porStatus.map(s => s.count),
              backgroundColor: [
                '#ffc107', // pendente
                '#17a2b8', // em_andamento
                '#28a745', // concluida
                '#dc3545'  // vencida
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom'
              },
              title: {
                display: true,
                text: 'Status das Recomendações'
              }
            }
          }
        });
      });
    }
  }

  loadChartData(url, callback) {
    fetch(url)
      .then(response => response.json())
      .then(data => callback(data))
      .catch(error => {
        console.error('Erro ao carregar dados do gráfico:', error);
        this.showToast('Erro ao carregar dados do gráfico', 'error');
      });
  }

  // AJAX utilities
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  }

  // Atualizar dados climáticos
  async updateClimateData(plantacaoId) {
    try {
      this.showLoading('Atualizando dados climáticos...');
      
      const result = await this.makeRequest('/api/clima/atualizar', {
        method: 'POST'
      });

      this.hideLoading();
      this.showToast(result.message, 'success');
      
      // Recarregar gráficos se estivermos na página de clima
      if (window.location.pathname === '/clima' && typeof loadClimateData === 'function') {
        const select = document.getElementById('plantacaoSelect');
        if (select && select.value) {
          setTimeout(() => {
            loadClimateData(select.value);
          }, 500);
        }
      }
      
    } catch (error) {
      this.hideLoading();
      this.showToast('Erro ao atualizar dados climáticos', 'error');
    }
  }

  // Gerar recomendações
  async generateRecommendations(plantacaoId = null) {
    try {
      this.showLoading('Gerando recomendações...');
      
      const result = await this.makeRequest('/api/recomendacoes/gerar', {
        method: 'POST'
      });

      this.hideLoading();
      this.showToast(result.message, 'success');
      
      // Recarregar dados de recomendações se estivermos na página correta
      if (window.location.pathname === '/recomendacao' && typeof loadRecomendacoes === 'function') {
        setTimeout(() => {
          loadRecomendacoes();
        }, 500);
      } else {
        // Recarregar página se não estivermos na página de recomendações
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
      
    } catch (error) {
      this.hideLoading();
      this.showToast('Erro ao gerar recomendações', 'error');
    }
  }

  // Marcar recomendação como aplicada
  async markRecommendationApplied(recomendacaoId, observacoes = '') {
    try {
      const result = await this.makeRequest(`/api/recomendacoes/${recomendacaoId}/aplicada`, {
        method: 'POST',
        body: JSON.stringify({ observacoes })
      });

      this.showToast(result.message, 'success');
      
      // Atualizar UI
      const card = document.querySelector(`[data-recomendacao="${recomendacaoId}"]`);
      if (card) {
        card.querySelector('.badge').textContent = 'CONCLUÍDA';
        card.querySelector('.badge').className = 'badge badge-success';
      }
      
    } catch (error) {
      this.showToast('Erro ao marcar recomendação como aplicada', 'error');
    }
  }

  // UI utilities
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.remove();
    }, 5000);

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.remove();
    });
  }

  showLoading(message = 'Carregando...') {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = `
      <div class="loading-content">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;

    document.body.appendChild(loading);
  }

  hideLoading() {
    const loading = document.querySelector('.loading-overlay');
    if (loading) {
      loading.remove();
    }
  }

  checkNotifications() {
    // Verificar recomendações urgentes
    const urgentRecommendations = document.querySelectorAll('.recommendation-card.priority-urgente');
    
    if (urgentRecommendations.length > 0) {
      this.showToast(`Você tem ${urgentRecommendations.length} recomendação(ões) urgente(s)!`, 'warning');
    }
  }

  // Utility functions
  statusLabel(status) {
    const labels = {
      'pendente': 'Pendente',
      'em_andamento': 'Em Andamento',
      'concluida': 'Concluída',
      'vencida': 'Vencida'
    };
    return labels[status] || status;
  }

  formatDate(date) {
    return new Date(date).toLocaleDateString('pt-BR');
  }

  formatNumber(number, decimals = 1) {
    return Number(number).toFixed(decimals);
  }
}

// Inicializar aplicação quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.agroApp = new AgroApp();
});

// Expor funções globais para uso nos templates
window.updateClimateData = (plantacaoId) => window.agroApp.updateClimateData(plantacaoId);
window.generateRecommendations = (plantacaoId) => {
  // Se não há plantacaoId, chamar a função sem parâmetro (para uso geral)
  if (plantacaoId === undefined) {
    return window.agroApp.generateRecommendations();
  }
  return window.agroApp.generateRecommendations(plantacaoId);
};
window.markRecommendationApplied = (recomendacaoId, observacoes) => window.agroApp.markRecommendationApplied(recomendacaoId, observacoes);