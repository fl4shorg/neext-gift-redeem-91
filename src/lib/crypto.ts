import CryptoJS from 'crypto-js';

// Função para carregar configurações de forma assíncrona
const getCryptoConfig = async () => {
  const { CRYPTO_KEYS } = await import('@/lib/config');
  return {
    SECRET_KEY: CRYPTO_KEYS[0],
    SALT: CRYPTO_KEYS[1],
    IV_LENGTH: 16,
    KEY_SIZE: 256,
    ITERATIONS: 10000,
    HMAC_KEY: CRYPTO_KEYS[2]
  };
};

// Cache da configuração
let CRYPTO_CONFIG: any = null;

// Gerar chave derivada usando PBKDF2
const deriveKey = (password: string, salt: string, config: any): CryptoJS.lib.WordArray => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: config.KEY_SIZE / 32,
    iterations: config.ITERATIONS
  });
};

// Criptografia AES-256-CBC com IV aleatório e verificação de integridade
export const encrypt = async (text: string): Promise<string> => {
  try {
    // Carregar configuração se não estiver em cache
    if (!CRYPTO_CONFIG) {
      CRYPTO_CONFIG = await getCryptoConfig();
    }
    
    // Gerar IV aleatório
    const iv = CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.IV_LENGTH);
    
    // Derivar chave
    const key = deriveKey(CRYPTO_CONFIG.SECRET_KEY, CRYPTO_CONFIG.SALT, CRYPTO_CONFIG);
    
    // Criptografar
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combinar IV + dados criptografados
    const combined = iv.concat(encrypted.ciphertext);
    
    // Adicionar HMAC para verificação de integridade
    const hmac = CryptoJS.HmacSHA256(combined.toString(CryptoJS.enc.Base64), CRYPTO_CONFIG.HMAC_KEY);
    
    // Retornar: HMAC + IV + Dados Criptografados (tudo em Base64)
    return hmac.toString(CryptoJS.enc.Base64) + ':' + combined.toString(CryptoJS.enc.Base64);
  } catch (error) {
    console.error('❌ Erro na criptografia:', error);
    throw new Error('Falha na criptografia: ' + error);
  }
};

// Descriptografia com verificação de integridade
export const decrypt = async (encryptedText: string): Promise<string> => {
  try {
    // Carregar configuração se não estiver em cache
    if (!CRYPTO_CONFIG) {
      CRYPTO_CONFIG = await getCryptoConfig();
    }
    
    // Separar HMAC dos dados
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Formato de dados criptografados inválido');
    }
    
    const [receivedHmac, encryptedData] = parts;
    
    // Verificar integridade
    const calculatedHmac = CryptoJS.HmacSHA256(encryptedData, CRYPTO_CONFIG.HMAC_KEY);
    if (receivedHmac !== calculatedHmac.toString(CryptoJS.enc.Base64)) {
      throw new Error('Verificação de integridade falhou');
    }
    
    // Converter dados de volta
    const combined = CryptoJS.enc.Base64.parse(encryptedData);
    
    // Extrair IV (primeiros 16 bytes)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    
    // Extrair dados criptografados (resto)
    const encrypted = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    // Derivar chave
    const key = deriveKey(CRYPTO_CONFIG.SECRET_KEY, CRYPTO_CONFIG.SALT, CRYPTO_CONFIG);
    
    // Descriptografar
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: encrypted } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Falha na descriptografia');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erro na descriptografia:', error);
    throw new Error('Falha na descriptografia: ' + error);
  }
};

// Criptografar dados da conta
export const encryptAccountData = async (accountData: any) => {
  const timestamp = Date.now().toString();
  return {
    ...accountData,
    email: await encrypt(accountData.email || ''),
    password: await encrypt(accountData.password || ''),
    server: accountData.server ? await encrypt(accountData.server) : undefined,
    accountType: await encrypt(accountData.accountType || ''),
    _encrypted: true,
    _timestamp: await encrypt(timestamp),
    _checksum: await encrypt(JSON.stringify(accountData))
  };
};

// Descriptografar dados da conta com validação
export const decryptAccountData = async (encryptedAccountData: any) => {
  try {
    if (!encryptedAccountData._encrypted) {
      throw new Error('Dados não estão criptografados');
    }
    
    const decrypted = {
      ...encryptedAccountData,
      email: await decrypt(encryptedAccountData.email || ''),
      password: await decrypt(encryptedAccountData.password || ''),
      server: encryptedAccountData.server ? await decrypt(encryptedAccountData.server) : undefined,
      accountType: await decrypt(encryptedAccountData.accountType || ''),
    };
    
    // Remover metadados de criptografia
    delete decrypted._encrypted;
    delete decrypted._timestamp;
    delete decrypted._checksum;
    
    return decrypted;
  } catch (error) {
    console.error('❌ Erro ao descriptografar dados da conta:', error);
    return encryptedAccountData;
  }
};

// Criptografar código de resgate
export const encryptCode = async (code: string): Promise<string> => {
  const timestamp = Date.now();
  const payload = JSON.stringify({ code, timestamp });
  return await encrypt(payload);
};

// Descriptografar código de resgate
export const decryptCode = async (encryptedCode: string): Promise<string> => {
  try {
    const decrypted = await decrypt(encryptedCode);
    const payload = JSON.parse(decrypted);
    
    // Verificar se o código não é muito antigo (24 horas)
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas em ms
    if (Date.now() - payload.timestamp > maxAge) {
      throw new Error('Código expirado');
    }
    
    return payload.code;
  } catch (error) {
    console.error('❌ Erro ao descriptografar código:', error);
    return encryptedCode;
  }
};

// Criptografar dados de sessão
export const encryptSessionData = async (data: any): Promise<string> => {
  const sessionData = {
    ...data,
    timestamp: Date.now(),
    sessionId: CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex)
  };
  return await encrypt(JSON.stringify(sessionData));
};

// Descriptografar dados de sessão
export const decryptSessionData = async (encryptedData: string): Promise<any> => {
  try {
    const decrypted = await decrypt(encryptedData);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Erro ao descriptografar sessão:', error);
    return null;
  }
};

// Hash seguro para verificação
export const createSecureHash = async (data: string): Promise<string> => {
  if (!CRYPTO_CONFIG) {
    CRYPTO_CONFIG = await getCryptoConfig();
  }
  return CryptoJS.SHA256(data + CRYPTO_CONFIG.SALT).toString(CryptoJS.enc.Hex);
};

// Verificar integridade de dados
export const verifyDataIntegrity = async (data: string, hash: string): Promise<boolean> => {
  return await createSecureHash(data) === hash;
};

// Gerar token de autenticação
export const generateAuthToken = async (userId: string): Promise<string> => {
  const tokenData = {
    userId,
    timestamp: Date.now(),
    nonce: CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex)
  };
  return await encrypt(JSON.stringify(tokenData));
};

// Validar token de autenticação
export const validateAuthToken = async (token: string): Promise<{ valid: boolean; userId?: string }> => {
  try {
    const decrypted = await decrypt(token);
    const tokenData = JSON.parse(decrypted);
    
    // Token válido por 1 hora
    const maxAge = 60 * 60 * 1000; // 1 hora em ms
    if (Date.now() - tokenData.timestamp > maxAge) {
      return { valid: false };
    }
    
    return { valid: true, userId: tokenData.userId };
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return { valid: false };
  }
};