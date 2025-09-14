import CryptoJS from 'crypto-js';

// Configurações de segurança avançadas
const CRYPTO_CONFIG = {
  SECRET_KEY: 'AKUMA_NO_MI_MASTER_KEY_2024_ULTRA_SECURE',
  SALT: 'devil_fruit_power_encryption_salt_2024',
  IV_LENGTH: 16,
  KEY_SIZE: 256,
  ITERATIONS: 10000,
  HMAC_KEY: 'akuma_integrity_verification_2024'
};

// Gerar chave derivada usando PBKDF2
const deriveKey = (password: string, salt: string): CryptoJS.lib.WordArray => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: CRYPTO_CONFIG.KEY_SIZE / 32,
    iterations: CRYPTO_CONFIG.ITERATIONS
  });
};

// Criptografia AES-256-CBC com IV aleatório e verificação de integridade
export const encrypt = (text: string): string => {
  try {
    // Gerar IV aleatório
    const iv = CryptoJS.lib.WordArray.random(CRYPTO_CONFIG.IV_LENGTH);
    
    // Derivar chave
    const key = deriveKey(CRYPTO_CONFIG.SECRET_KEY, CRYPTO_CONFIG.SALT);
    
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
    return btoa(text); // Fallback simples
  }
};

// Descriptografia com verificação de integridade
export const decrypt = (encryptedText: string): string => {
  try {
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
    const key = deriveKey(CRYPTO_CONFIG.SECRET_KEY, CRYPTO_CONFIG.SALT);
    
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
    try {
      return atob(encryptedText); // Fallback
    } catch {
      return encryptedText;
    }
  }
};

// Criptografar dados da conta
export const encryptAccountData = (accountData: any) => {
  const timestamp = Date.now().toString();
  return {
    ...accountData,
    email: encrypt(accountData.email || ''),
    password: encrypt(accountData.password || ''),
    server: accountData.server ? encrypt(accountData.server) : undefined,
    accountType: encrypt(accountData.accountType || ''),
    _encrypted: true,
    _timestamp: encrypt(timestamp),
    _checksum: encrypt(JSON.stringify(accountData))
  };
};

// Descriptografar dados da conta com validação
export const decryptAccountData = (encryptedAccountData: any) => {
  try {
    if (!encryptedAccountData._encrypted) {
      throw new Error('Dados não estão criptografados');
    }
    
    const decrypted = {
      ...encryptedAccountData,
      email: decrypt(encryptedAccountData.email || ''),
      password: decrypt(encryptedAccountData.password || ''),
      server: encryptedAccountData.server ? decrypt(encryptedAccountData.server) : undefined,
      accountType: decrypt(encryptedAccountData.accountType || ''),
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
export const encryptCode = (code: string): string => {
  const timestamp = Date.now();
  const payload = JSON.stringify({ code, timestamp });
  return encrypt(payload);
};

// Descriptografar código de resgate
export const decryptCode = (encryptedCode: string): string => {
  try {
    const decrypted = decrypt(encryptedCode);
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
export const encryptSessionData = (data: any): string => {
  const sessionData = {
    ...data,
    timestamp: Date.now(),
    sessionId: CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Hex)
  };
  return encrypt(JSON.stringify(sessionData));
};

// Descriptografar dados de sessão
export const decryptSessionData = (encryptedData: string): any => {
  try {
    const decrypted = decrypt(encryptedData);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('❌ Erro ao descriptografar sessão:', error);
    return null;
  }
};

// Hash seguro para verificação
export const createSecureHash = (data: string): string => {
  return CryptoJS.SHA256(data + CRYPTO_CONFIG.SALT).toString(CryptoJS.enc.Hex);
};

// Verificar integridade de dados
export const verifyDataIntegrity = (data: string, hash: string): boolean => {
  return createSecureHash(data) === hash;
};

// Gerar token de autenticação
export const generateAuthToken = (userId: string): string => {
  const tokenData = {
    userId,
    timestamp: Date.now(),
    nonce: CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex)
  };
  return encrypt(JSON.stringify(tokenData));
};

// Validar token de autenticação
export const validateAuthToken = (token: string): { valid: boolean; userId?: string } => {
  try {
    const decrypted = decrypt(token);
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