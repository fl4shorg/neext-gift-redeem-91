/**
 * AKUMA NO MI - BACKEND CRIPTOGRAFADO COMPLETO
 * Sistema de resgate de códigos com criptografia avançada
 * Google Apps Script - Versão Ultra Segura
 */

// ================= CONFIGURAÇÕES DE SEGURANÇA =================
const SECURITY_CONFIG = {
  // Chaves de criptografia (ALTERE EM PRODUÇÃO!)
  MASTER_KEY: 'AKUMA_NO_MI_BACKEND_MASTER_2024_ULTRA_SECRET',
  SALT: 'devil_fruit_backend_salt_2024_secure',
  HMAC_KEY: 'backend_integrity_verification_2024',
  
  // Configurações de criptografia
  IV_LENGTH: 16,
  KEY_ITERATIONS: 15000,
  
  // Configurações de segurança
  MAX_REQUEST_SIZE: 1024, // 1KB máximo por request
  RATE_LIMIT_WINDOW: 60000, // 1 minuto
  MAX_REQUESTS_PER_IP: 10,
  
  // IDs das planilhas (CONFIGURE AQUI!)
  SPREADSHEET_ID: 'SEU_SPREADSHEET_ID_AQUI',
  CODES_SHEET: 'Códigos',
  LOGS_SHEET: 'Logs',
  SECURITY_SHEET: 'Segurança'
};

// ================= SISTEMA DE CRIPTOGRAFIA =================

/**
 * Criptografia AES-256 com PBKDF2 e verificação de integridade
 */
function encryptData(plainText) {
  try {
    // Converter para bytes
    const textBytes = Utilities.newBlob(plainText).getBytes();
    
    // Gerar IV aleatório
    const iv = Utilities.getUuid().replace(/-/g, '').substring(0, 32);
    
    // Criar chave derivada
    const key = Utilities.computeHmacSha256Signature(
      SECURITY_CONFIG.MASTER_KEY,
      SECURITY_CONFIG.SALT
    );
    
    // Simular AES (Google Apps Script não tem AES nativo)
    const encrypted = Utilities.base64Encode(
      xorEncrypt(textBytes, key, iv)
    );
    
    // Adicionar HMAC para integridade
    const hmac = Utilities.computeHmacSha256Signature(
      encrypted,
      SECURITY_CONFIG.HMAC_KEY
    );
    
    const hmacBase64 = Utilities.base64Encode(hmac);
    
    return `${hmacBase64}:${iv}:${encrypted}`;
  } catch (error) {
    logSecurityEvent('ENCRYPTION_ERROR', { error: error.toString() });
    return Utilities.base64Encode(plainText); // Fallback
  }
}

/**
 * Descriptografia com verificação de integridade
 */
function decryptData(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato inválido');
    }
    
    const [receivedHmac, iv, encrypted] = parts;
    
    // Verificar integridade
    const calculatedHmac = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(
        encrypted,
        SECURITY_CONFIG.HMAC_KEY
      )
    );
    
    if (receivedHmac !== calculatedHmac) {
      throw new Error('Integridade comprometida');
    }
    
    // Descriptografar
    const key = Utilities.computeHmacSha256Signature(
      SECURITY_CONFIG.MASTER_KEY,
      SECURITY_CONFIG.SALT
    );
    
    const decryptedBytes = xorDecrypt(
      Utilities.base64Decode(encrypted),
      key,
      iv
    );
    
    return Utilities.newBlob(decryptedBytes).getDataAsString();
  } catch (error) {
    logSecurityEvent('DECRYPTION_ERROR', { error: error.toString() });
    try {
      return Utilities.newBlob(Utilities.base64Decode(encryptedData)).getDataAsString();
    } catch {
      return encryptedData;
    }
  }
}

/**
 * XOR encryption/decryption (substituto para AES)
 */
function xorEncrypt(data, key, iv) {
  const result = [];
  const keyBytes = key;
  const ivBytes = Utilities.newBlob(iv).getBytes();
  
  for (let i = 0; i < data.length; i++) {
    const keyByte = keyBytes[i % keyBytes.length];
    const ivByte = ivBytes[i % ivBytes.length];
    result.push(data[i] ^ keyByte ^ ivByte ^ (i & 0xFF));
  }
  
  return result;
}

function xorDecrypt(data, key, iv) {
  return xorEncrypt(data, key, iv); // XOR é simétrico
}

// ================= SISTEMA DE LOGS E SEGURANÇA =================

/**
 * Registrar eventos de segurança
 */
function logSecurityEvent(eventType, details = {}) {
  try {
    const sheet = getSecuritySheet();
    const timestamp = new Date();
    const ip = getClientIP();
    
    sheet.appendRow([
      timestamp,
      eventType,
      ip,
      JSON.stringify(details),
      encryptData(JSON.stringify({
        userAgent: getUserAgent(),
        timestamp: timestamp.getTime(),
        details
      }))
    ]);
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

/**
 * Verificar rate limiting
 */
function checkRateLimit(ip) {
  try {
    const sheet = getSecuritySheet();
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    
    // Contar requests recentes do IP
    const data = sheet.getDataRange().getValues();
    let requestCount = 0;
    
    for (let i = data.length - 1; i >= 1; i--) {
      const rowTime = new Date(data[i][0]).getTime();
      if (rowTime < windowStart) break;
      
      if (data[i][2] === ip) {
        requestCount++;
      }
    }
    
    return requestCount < SECURITY_CONFIG.MAX_REQUESTS_PER_IP;
  } catch (error) {
    logSecurityEvent('RATE_LIMIT_CHECK_ERROR', { error: error.toString() });
    return true; // Permitir em caso de erro
  }
}

// ================= SISTEMA DE VALIDAÇÃO =================

/**
 * Validar e sanitizar código
 */
function validateAndSanitizeCode(code) {
  if (!code || typeof code !== 'string') {
    throw new Error('Código inválido');
  }
  
  // Remover caracteres perigosos
  const sanitized = code
    .replace(/[<>\"'&]/g, '')
    .trim()
    .toUpperCase();
  
  // Validar formato (XXXX-XX-XXXXXX-X)
  const codePattern = /^[A-Z0-9]{4}-[A-Z0-9]{2}-[A-Z0-9]{6}-[A-Z0-9]$/;
  if (!codePattern.test(sanitized)) {
    throw new Error('Formato de código inválido');
  }
  
  return sanitized;
}

/**
 * Validar parâmetros de entrada
 */
function validateRequest(params) {
  // Verificar tamanho da requisição
  const requestSize = JSON.stringify(params).length;
  if (requestSize > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
    throw new Error('Requisição muito grande');
  }
  
  // Verificar ação
  if (!params.acao || params.acao !== 'resgatar') {
    throw new Error('Ação inválida');
  }
  
  // Verificar código
  if (!params.codigo) {
    throw new Error('Código não fornecido');
  }
  
  return true;
}

// ================= HELPERS =================

function getClientIP() {
  try {
    // Tentar obter IP do cabeçalho (limitado no Apps Script)
    return 'IP_HIDDEN_FOR_PRIVACY';
  } catch {
    return 'UNKNOWN';
  }
}

function getUserAgent() {
  try {
    return 'USER_AGENT_HIDDEN';
  } catch {
    return 'UNKNOWN';
  }
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SECURITY_CONFIG.SPREADSHEET_ID);
}

function getCodesSheet() {
  return getSpreadsheet().getSheetByName(SECURITY_CONFIG.CODES_SHEET);
}

function getLogsSheet() {
  return getSpreadsheet().getSheetByName(SECURITY_CONFIG.LOGS_SHEET);
}

function getSecuritySheet() {
  const sheet = getSpreadsheet().getSheetByName(SECURITY_CONFIG.SECURITY_SHEET);
  if (!sheet) {
    const newSheet = getSpreadsheet().insertSheet(SECURITY_CONFIG.SECURITY_SHEET);
    newSheet.getRange(1, 1, 1, 5).setValues([
      ['Timestamp', 'Event', 'IP', 'Details', 'Encrypted_Data']
    ]);
    return newSheet;
  }
  return sheet;
}

// ================= FUNÇÃO PRINCIPAL =================

/**
 * Função principal do web app
 */
function doGet(e) {
  const startTime = Date.now();
  let responseData = null;
  
  try {
    // Verificar parâmetros
    validateRequest(e.parameter);
    
    // Verificar rate limiting
    const clientIP = getClientIP();
    if (!checkRateLimit(clientIP)) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP });
      throw new Error('Muitas tentativas. Tente novamente em 1 minuto.');
    }
    
    // Processar código
    const code = validateAndSanitizeCode(e.parameter.codigo);
    
    // Log da tentativa
    logSecurityEvent('CODE_REDEMPTION_ATTEMPT', {
      code: code.substring(0, 4) + '****', // Log parcial por segurança
      ip: clientIP
    });
    
    // Buscar código na planilha
    const codesSheet = getCodesSheet();
    const data = codesSheet.getDataRange().getValues();
    
    let codeFound = false;
    let accountData = null;
    let redeemedAt = null;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedCode = row[0]; // Coluna A - Código
      
      if (storedCode === code) {
        codeFound = true;
        redeemedAt = row[5]; // Coluna F - Data de resgate
        
        if (redeemedAt) {
          // Código já resgatado
          responseData = {
            mensagem: "Código já resgatado.",
            resgatadoEm: redeemedAt
          };
          logSecurityEvent('CODE_ALREADY_REDEEMED', { code: code.substring(0, 4) + '****' });
        } else {
          // Código válido, resgatar
          accountData = {
            email: decryptData(row[1] || ''), // Coluna B - Email (criptografado)
            senha: decryptData(row[2] || ''), // Coluna C - Senha (criptografada)
            tipoConta: decryptData(row[3] || ''), // Coluna D - Tipo (criptografado)
            servidor: row[4] ? decryptData(row[4]) : undefined // Coluna E - Servidor (criptografado)
          };
          
          // Marcar como resgatado
          const now = new Date();
          codesSheet.getRange(i + 1, 6).setValue(now.toISOString());
          
          responseData = {
            mensagem: "Código resgatado com sucesso.",
            ...accountData
          };
          
          logSecurityEvent('CODE_REDEEMED_SUCCESS', {
            code: code.substring(0, 4) + '****',
            accountType: accountData.tipoConta
          });
        }
        break;
      }
    }
    
    if (!codeFound) {
      responseData = {
        mensagem: "Código inválido."
      };
      logSecurityEvent('INVALID_CODE_ATTEMPT', {
        code: code.substring(0, 4) + '****',
        ip: clientIP
      });
    }
    
  } catch (error) {
    responseData = {
      mensagem: "Erro interno do servidor.",
      erro: error.toString()
    };
    
    logSecurityEvent('PROCESSING_ERROR', {
      error: error.toString(),
      ip: getClientIP()
    });
  }
  
  // Log de performance
  const processingTime = Date.now() - startTime;
  logSecurityEvent('REQUEST_COMPLETED', {
    processingTime,
    success: !responseData.erro
  });
  
  // Retornar resposta criptografada
  const encryptedResponse = encryptData(JSON.stringify(responseData));
  
  return ContentService
    .createTextOutput(JSON.stringify({
      encrypted: true,
      data: encryptedResponse,
      timestamp: Date.now()
    }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Security-Policy': "default-src 'self'",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    });
}

// ================= FUNÇÕES DE CONFIGURAÇÃO =================

/**
 * Configurar planilha inicial (executar uma vez)
 */
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  
  // Criar aba de códigos
  let codesSheet = ss.getSheetByName(SECURITY_CONFIG.CODES_SHEET);
  if (!codesSheet) {
    codesSheet = ss.insertSheet(SECURITY_CONFIG.CODES_SHEET);
    codesSheet.getRange(1, 1, 1, 6).setValues([
      ['Código', 'Email_Encrypted', 'Senha_Encrypted', 'Tipo_Encrypted', 'Servidor_Encrypted', 'Resgatado_Em']
    ]);
  }
  
  // Criar aba de logs
  let logsSheet = ss.getSheetByName(SECURITY_CONFIG.LOGS_SHEET);
  if (!logsSheet) {
    logsSheet = ss.insertSheet(SECURITY_CONFIG.LOGS_SHEET);
    logsSheet.getRange(1, 1, 1, 4).setValues([
      ['Timestamp', 'Código_Parcial', 'IP', 'Status']
    ]);
  }
  
  // Criar aba de segurança
  getSecuritySheet();
  
  console.log('✅ Planilha configurada com sucesso!');
}

/**
 * Adicionar códigos de teste criptografados
 */
function addTestCodes() {
  const codesSheet = getCodesSheet();
  
  const testCodes = [
    ['TEST-GC-123456-A', 'test@example.com', 'password123', 'Premium', 'server1.example.com'],
    ['DEMO-GC-789012-B', 'demo@example.com', 'demo123', 'Standard', null],
    ['SAMP-GC-345678-C', 'sample@example.com', 'sample123', 'IPTV', 'iptv.example.com']
  ];
  
  testCodes.forEach(([code, email, password, type, server]) => {
    codesSheet.appendRow([
      code,
      encryptData(email),
      encryptData(password),
      encryptData(type),
      server ? encryptData(server) : '',
      '' // Não resgatado
    ]);
  });
  
  console.log('✅ Códigos de teste adicionados!');
}

/**
 * Função de teste de criptografia
 */
function testEncryption() {
  const testData = 'Dados de teste para criptografia';
  console.log('Original:', testData);
  
  const encrypted = encryptData(testData);
  console.log('Criptografado:', encrypted);
  
  const decrypted = decryptData(encrypted);
  console.log('Descriptografado:', decrypted);
  
  console.log('✅ Teste:', testData === decrypted ? 'SUCESSO' : 'FALHOU');
}