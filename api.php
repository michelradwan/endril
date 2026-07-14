<?php
/**
 * BACKEND PROXY PARA API DE PIX
 * Este arquivo protege suas chaves de API. O front-end chama este arquivo,
 * e este arquivo faz a chamada real para a API de pagamentos.
 * Dessa forma, ninguém pode roubar sua chave pelo navegador.
 */

// ==========================================
// CONFIGURAÇÕES SEGURAS
// ==========================================
$API_KEY = "f94feb9a68d24e8ea4e655d5a946b6b6";
$ENDPOINT = "https://www.pagamentos-seguros.app/api-pix/lNc63q-nUqoQAPSkA2ieFATG6IyVQ_JOmU5w2MY7FHxU-KKPvsRuiu18fZg-RVjEpqZhXBWgQayMWy9GNgGPig";

// (Opcional) Segurança contra Bots/CORS:
// Se quiser permitir apenas o seu domínio, descomente e altere a linha abaixo:
// header("Access-Control-Allow-Origin: https://seusite.com.br");
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$method = $_SERVER['REQUEST_METHOD'];

// ==========================================
// ROTA GET: Verificar Status do PIX
// ==========================================
if ($method === 'GET') {
    if (!isset($_GET['transactionId'])) {
        http_response_code(400);
        echo json_encode(["error" => "transactionId is required"]);
        exit;
    }

    $transactionId = $_GET['transactionId'];
    $url = $ENDPOINT . "?transactionId=" . urlencode($transactionId);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "x-api-key: " . $API_KEY,
        "Authorization: Bearer " . $API_KEY
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($httpCode);
    echo $response;
    exit;
}

// ==========================================
// ROTA POST: Gerar PIX
// ==========================================
if ($method === 'POST') {
    // Recebe o Payload do Javascript (sem a API KEY)
    $inputJSON = file_get_contents('php://input');
    
    // Podemos fazer validações extras aqui no backend (Rate Limiting, IP check, etc)
    // para segurança "Nível Sênior", mas por padrão vamos apenas repassar o payload seguro.

    $ch = curl_init($ENDPOINT);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $inputJSON);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Content-Type: application/json",
        "x-api-key: " . $API_KEY,
        "Authorization: Bearer " . $API_KEY
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    http_response_code($httpCode);
    echo $response;
    exit;
}

// Se não for GET nem POST
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
?>
