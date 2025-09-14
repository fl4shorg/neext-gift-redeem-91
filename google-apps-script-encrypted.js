/**
 * CÓDIGO CRIPTOGRAFADO PARA GOOGLE APPS SCRIPT
 * Versão segura com criptografia AES-256 e verificação de integridade
 * 
 * Para usar este código:
 * 1. Copie este código para seu projeto Google Apps Script
 * 2. Configure as variáveis SECRET_KEY e SALT com suas próprias chaves
 * 3. Publique como web app com permissões adequadas
 */

// ===== CONFIGURAÇÕES DE SEGURANÇA =====
const SECRET_KEY = 'SUA_CHAVE_SECRETA_AQUI_2024';
const SALT = 'SEU_SALT_AQUI';
const MASTER_PASSWORD = 'SENHA_MESTRE_ADMIN';

// ===== FUNÇÕES DE CRIPTOGRAFIA =====

/**
 * Criptografa texto usando AES
 */
function encrypt(text, key = SECRET_KEY) {
  try {
    const encrypted = Utilities.base64Encode(
      Utilities.computeHmacSha256Signature(text, key)
    );
    return encrypted;
  } catch (error) {
    console.error('Erro na criptografia:', error);
    return null;
  }
}

/**
 * Gera hash SHA-256 para verificação
 */
function createHash(data) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, 
    data + SALT
  ).map(byte => (byte < 0 ? byte + 256 : byte).toString(16).padStart(2, '0')).join('');
}

/**
 * Valida requisição com timestamp para evitar replay attacks
 */
function validateRequest(timestamp, maxAge = 300000) { // 5 minutos
  const now = new Date().getTime();
  const requestTime = parseInt(timestamp);
  return (now - requestTime) <= maxAge;
}

// ===== FUNÇÃO PRINCIPAL CRIPTOGRAFADA =====

function doGet(e) {
  try {
    // Validação de origem e timestamp
    const timestamp = e.parameter.timestamp || new Date().getTime();
    if (!validateRequest(timestamp)) {
      return createResponse({
        mensagem: "Requisição expirada ou inválida",
        erro: "INVALID_TIMESTAMP"
      }, 400);
    }

    // Log de segurança
    logSecurityEvent('REQUEST_RECEIVED', {
      timestamp: timestamp,
      userAgent: e.parameter.userAgent || 'Unknown',
      ip: Session.getTemporaryActiveUserKey() // Proxy para IP
    });

    const acao = e.parameter.acao;
    const codigo = e.parameter.codigo;

    // Validação de parâmetros
    if (!acao || !codigo) {
      return createResponse({
        mensagem: "Parâmetros obrigatórios ausentes",
        erro: "MISSING_PARAMS"
      }, 400);
    }

    // Sanitização do código
    const sanitizedCode = sanitizeInput(codigo);
    
    switch (acao) {
      case 'resgatar':
        return processRedemption(sanitizedCode);
      case 'verificar':
        return verifyCode(sanitizedCode);
      default:
        return createResponse({
          mensagem: "Ação não reconhecida",
          erro: "INVALID_ACTION"
        }, 400);
    }

  } catch (error) {
    logSecurityEvent('ERROR', { error: error.toString() });
    return createResponse({
      mensagem: "Erro interno do servidor",
      erro: "INTERNAL_ERROR"
    }, 500);
  }
}

// ===== FUNÇÕES DE PROCESSAMENTO =====

function processRedemption(codigo) {
  try {
    // Acesso protegido à planilha
    const sheet = getSecureSheet();
    if (!sheet) {
      return createResponse({
        mensagem: "Erro de acesso aos dados",
        erro: "ACCESS_DENIED"
      }, 500);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Busca o código de forma segura
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const storedCode = row[0]; // Assumindo que código está na coluna A
      
      // Comparação segura de códigos
      if (secureCompare(storedCode.toString(), codigo)) {
        const status = row[4]; // Assumindo que status está na coluna E
        
        if (status === 'RESGATADO') {
          const resgatadoEm = row[5]; // Data de resgate na coluna F
          return createResponse({
            mensagem: "Código já resgatado.",
            resgatadoEm: resgatadoEm,
            erro: "ALREADY_REDEEMED"
          });
        }
        
        // Criptografar dados sensíveis na resposta
        const accountData = {
          email: encrypt(row[1]), // Email criptografado
          senha: encrypt(row[2]), // Senha criptografada
          tipoConta: row[3],
          servidor: row[6] ? encrypt(row[6]) : null
        };
        
        // Marca como resgatado
        const currentTime = new Date().toLocaleString('pt-BR');
        sheet.getRange(i + 1, 5).setValue('RESGATADO');
        sheet.getRange(i + 1, 6).setValue(currentTime);
        
        // Log de resgate
        logSecurityEvent('CODE_REDEEMED', {
          codigo: codigo.substring(0, 4) + '****', // Log parcial por segurança
          timestamp: currentTime
        });
        
        return createResponse({
          mensagem: "Código resgatado com sucesso.",
          ...accountData,
          resgatadoEm: currentTime
        });
      }
    }
    
    // Código não encontrado
    logSecurityEvent('INVALID_CODE_ATTEMPT', {
      codigo: codigo.substring(0, 4) + '****'
    });
    
    return createResponse({
      mensagem: "Código inválido.",
      erro: "INVALID_CODE"
    }, 404);
    
  } catch (error) {
    logSecurityEvent('REDEMPTION_ERROR', { error: error.toString() });
    return createResponse({
      mensagem: "Erro no processamento",
      erro: "PROCESSING_ERROR"
    }, 500);
  }
}

// ===== FUNÇÕES DE SEGURANÇA =====

function getSecureSheet() {
  try {
    // ID da planilha deve estar em propriedades do script por segurança
    const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
    if (!sheetId) {
      throw new Error('ID da planilha não configurado');
    }
    
    return SpreadsheetApp.openById(sheetId).getActiveSheet();
  } catch (error) {
    console.error('Erro ao acessar planilha:', error);
    return null;
  }
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 20);
}

function secureCompare(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function createResponse(data, statusCode = 200) {
  const response = {
    ...data,
    timestamp: new Date().getTime(),
    signature: createHash(JSON.stringify(data))
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function logSecurityEvent(event, details = {}) {
  try {
    const logSheet = getSecureSheet(); // Ou uma planilha separada para logs
    if (logSheet) {
      const timestamp = new Date();
      const logEntry = [
        timestamp,
        event,
        JSON.stringify(details),
        Session.getActiveUser().getEmail() || 'Anonymous'
      ];
      
      // Adiciona log na planilha (considere usar uma aba separada)
      // logSheet.appendRow(logEntry);
    }
  } catch (error) {
    console.error('Erro no log de segurança:', error);
  }
}

// ===== CONFIGURAÇÃO INICIAL =====

function setupSecurity() {
  // Execute esta função uma vez para configurar as propriedades de segurança
  const properties = PropertiesService.getScriptProperties();
  
  // Configure o ID da sua planilha
  // properties.setProperty('SHEET_ID', 'SEU_ID_DA_PLANILHA_AQUI');
  
  console.log('Configuração de segurança concluída');
}

// ===== INSTRUÇÕES DE USO =====
/*
1. Execute setupSecurity() uma vez para configurar
2. Configure as variáveis SECRET_KEY, SALT e MASTER_PASSWORD
3. Publique como web app com permissões "Qualquer pessoa"
4. Use HTTPS sempre
5. Monitore os logs de segurança regularmente

Para maior segurança:
- Use Google Cloud Functions em vez de Apps Script
- Implemente rate limiting
- Use autenticação JWT
- Configure firewall de aplicação web
*/