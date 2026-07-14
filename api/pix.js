/**
 * BACKEND PROXY PARA API DE PIX (Node.js Serverless)
 * Compatível com Vercel, Netlify Functions, etc.
 * 
 * As chaves da API DEVEM ser colocadas nas variáveis de ambiente (.env) do seu provedor!
 */

export default async function handler(req, res) {
  // CORS Configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Mude para o seu domínio em produção
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Lendo de Variáveis de Ambiente (Vercel Dashboard > Environment Variables)
  // Se não existirem, usamos o padrão (apenas para fallback, não recomendado)
  const API_KEY = process.env.PIX_API_KEY || 'f94feb9a68d24e8ea4e655d5a946b6b6';
  const ENDPOINT = process.env.PIX_ENDPOINT || 'https://www.pagamentos-seguros.app/api-pix/lNc63q-nUqoQAPSkA2ieFATG6IyVQ_JOmU5w2MY7FHxU-KKPvsRuiu18fZg-RVjEpqZhXBWgQayMWy9GNgGPig';

  try {
    // ==========================================
    // ROTA GET: Verificar Status
    // ==========================================
    if (req.method === 'GET') {
      const { transactionId } = req.query;
      
      if (!transactionId) {
        return res.status(400).json({ error: "transactionId is required" });
      }

      const response = await fetch(`${ENDPOINT}?transactionId=${transactionId}`, {
        method: 'GET',
        headers: {
          'x-api-key': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        }
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // ==========================================
    // ROTA POST: Gerar PIX
    // ==========================================
    if (req.method === 'POST') {
      const payload = req.body; // payload seguro vindo do front-end

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'Authorization': `Bearer ${API_KEY}`
        },
        body: typeof payload === 'string' ? payload : JSON.stringify(payload)
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error("Backend Proxy Error:", error);
    return res.status(500).json({ error: 'Internal Server Error no Proxy' });
  }
}
