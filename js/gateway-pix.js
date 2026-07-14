/**
 * Integração API PIX Gateway
 * Módulo para geração e verificação de pagamentos PIX
 */

// Configuração da API Gateway para a campanha
const GATEWAY_CONFIG = {
  apiKey: 'f94feb9a68d24e8ea4e655d5a946b6b6',
  // Endpoint encriptado completo (usado tanto para POST quanto para GET)
  endpoint: 'https://www.pagamentos-seguros.app/api-pix/lNc63q-nUqoQAPSkA2ieFATG6IyVQ_JOmU5w2MY7FHxU-KKPvsRuiu18fZg-RVjEpqZhXBWgQayMWy9GNgGPig'
};

/**
 * Gera dados aleatórios válidos para o pagamento
 * @returns {Object} Objeto com name, CPF, email e Telefone (conforme esperado pela API)
 */
function gerarDadosAleatorios() {
  // Gerar CPF válido aleatório
  function gerarCPF() {
    const n = () => Math.floor(Math.random() * 10);
    const nums = Array.from({length: 9}, n);
    
    // Calcular primeiro dígito verificador
    let soma = nums.reduce((acc, val, i) => acc + val * (10 - i), 0);
    nums.push((soma * 10 % 11) % 10);
    
    // Calcular segundo dígito verificador
    soma = nums.reduce((acc, val, i) => acc + val * (11 - i), 0);
    nums.push((soma * 10 % 11) % 10);
    
    return nums.join('');
  }
  
  const nomes = [
    'João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Souza', 
    'Julia Lima', 'Lucas Pereira', 'Fernanda Alves', 'Bruno Ribeiro', 'Patricia Martins'
  ];
  
  const nome = nomes[Math.floor(Math.random() * nomes.length)];
  const cpf = gerarCPF();
  const ddd = ['11', '21', '31', '41', '51', '61', '71', '81', '85'][Math.floor(Math.random() * 9)];
  const telefone = ddd + '9' + String(Math.floor(Math.random() * 90000000 + 10000000)).padStart(8, '0');
  
  // Gerar email baseado no nome
  const emailBase = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(' ', '.');
  const email = emailBase + Math.floor(Math.random() * 999) + '@gmail.com';
  
  return { 
    name: nome, 
    document: cpf, 
    email: email, 
    phone: telefone 
  };
}

/**
 * Retorna os parâmetros UTM da URL atual
 * @returns {string} String com os parâmetros (ex: utm_source=fb&utm_medium=cpc)
 */
function getUrlParams() {
  return window.location.search.substring(1) || "";
}

/**
 * Cria uma transação PIX via API Gateway
 * @param {number} valorEmReais - Valor da doação em reais
 * @returns {Promise<Object>} Retorna a resposta completa da API (incluindo pixCode, transactionId, etc)
 */
async function criarPixGateway(valorEmReais) {
  const dadosAleatorios = gerarDadosAleatorios();
  const utmParams = getUrlParams();
  
  // Construindo o Payload exato validado para esta API (a API espera o valor em centavos)
  const valorEmCentavos = Math.round(valorEmReais * 100);
  
  const payload = {
    amount: valorEmCentavos, 
    paymentMethod: "PIX",
    customer: {
        name: dadosAleatorios.name,
        email: dadosAleatorios.email,
        document: dadosAleatorios.document,
        phone: dadosAleatorios.phone
    },
    item: {
        title: "Doação Endril",
        quantity: 1, 
        price: valorEmCentavos
    },
    utm: utmParams
  };

  const response = await fetch(GATEWAY_CONFIG.endpoint, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'x-api-key': GATEWAY_CONFIG.apiKey,
      'Authorization': `Bearer ${GATEWAY_CONFIG.apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Erro API Gateway:", error);
    throw new Error(error.error || 'Erro ao gerar PIX');
  }

  const resultado = await response.json();
  return resultado;
}

/**
 * Verifica o status de uma transação PIX
 * @param {string} transactionId - ID da transação retornado pela API
 * @returns {Promise<Object>} Retorna os dados da transação, incluindo { status, paidAt }
 */
async function verificarStatusPix(transactionId) {
  const response = await fetch(
    `${GATEWAY_CONFIG.endpoint}?transactionId=${transactionId}`,
    { 
      method: 'GET',
      headers: { 
        'x-api-key': GATEWAY_CONFIG.apiKey,
        'Authorization': `Bearer ${GATEWAY_CONFIG.apiKey}`
      },
      cache: 'no-store' 
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erro ao verificar status');
  }
  
  return await response.json();
}

/**
 * Inicia polling para verificar se o pagamento foi realizado
 * @param {string} transactionId - ID da transação
 * @param {Function} onPago - Callback executado quando pagamento for confirmado
 * @param {number} maxTentativas - Número máximo de tentativas (padrão: 200 = 10 minutos)
 * @returns {number} ID do intervalo para poder cancelar se necessário
 */
function iniciarVerificacaoPagamento(transactionId, onPago, maxTentativas = 200) {
  if (!transactionId) {
      console.warn("Nenhum transactionId fornecido para polling.");
      return null;
  }

  let tentativas = 0;
  
  const intervalo = setInterval(async () => {
    try {
      tentativas++;
      
      const resultado = await verificarStatusPix(transactionId);
      
      // Verificar se foi pago (status pode ser "COMPLETED" ou "CO" ou "PAID")
      if (resultado && (resultado.status === 'COMPLETED' || resultado.status === 'CO' || resultado.status === 'PAID')) {
        clearInterval(intervalo);
        onPago(resultado);
        return;
      }
      
      // Parar após número máximo de tentativas
      if (tentativas >= maxTentativas) {
        clearInterval(intervalo);
      }
      
    } catch (error) {
      // Continuar tentando mesmo se houver erro transitório de rede
      if (tentativas >= maxTentativas) {
        clearInterval(intervalo);
      }
    }
  }, 3000); // Verificar a cada 3 segundos
  
  return intervalo;
}

// Expor funções globalmente para uso no HTML
window.criarPixGateway = criarPixGateway;
window.verificarStatusPix = verificarStatusPix;
window.iniciarVerificacaoPagamento = iniciarVerificacaoPagamento;
