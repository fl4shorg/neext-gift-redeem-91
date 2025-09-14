import CryptoJS from 'crypto-js';

// Chaves seguras para criptografia avançada
const SECRET_KEY = 'AKUMA_NO_MI_GRAND_LINE_SECRET_2024_V2';
const SALT = 'MUGIWARA_PIRATES_SALT_HASH';

// Gera uma chave derivada mais segura
const getDerivedKey = (password: string, salt: string) => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  });
};

// Criptografia AES-256 com PBKDF2
export const encrypt = (text: string): string => {
  try {
    const key = getDerivedKey(SECRET_KEY, SALT);
    const iv = CryptoJS.lib.WordArray.random(128/8);
    
    const encrypted = CryptoJS.AES.encrypt(text, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // Combina IV + dados criptografados
    const combined = iv.concat(encrypted.ciphertext);
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    return text;
  }
};

// Descriptografia AES-256 com PBKDF2
export const decrypt = (encryptedText: string): string => {
  try {
    const key = getDerivedKey(SECRET_KEY, SALT);
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    
    // Separa IV dos dados criptografados
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }), 
      key, 
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );
    
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return encryptedText;
  }
};

// Hash seguro para validação
export const createHash = (data: string): string => {
  return CryptoJS.SHA256(data + SALT).toString();
};

// Criptografia de dados de conta com verificação de integridade
export const encryptAccountData = (accountData: any) => {
  const timestamp = Date.now().toString();
  const integrity = createHash(JSON.stringify(accountData) + timestamp);
  
  return {
    ...accountData,
    email: encrypt(accountData.email || ''),
    password: encrypt(accountData.password || ''),
    server: accountData.server ? encrypt(accountData.server) : undefined,
    _timestamp: encrypt(timestamp),
    _integrity: integrity,
  };
};

// Descriptografia com verificação de integridade
export const decryptAccountData = (encryptedAccountData: any) => {
  try {
    const decryptedData = {
      ...encryptedAccountData,
      email: decrypt(encryptedAccountData.email || ''),
      password: decrypt(encryptedAccountData.password || ''),
      server: encryptedAccountData.server ? decrypt(encryptedAccountData.server) : undefined,
    };
    
    // Verifica integridade dos dados
    const timestamp = decrypt(encryptedAccountData._timestamp || '');
    const originalData = { ...decryptedData };
    delete originalData._timestamp;
    delete originalData._integrity;
    
    const expectedHash = createHash(JSON.stringify(originalData) + timestamp);
    
    if (expectedHash !== encryptedAccountData._integrity) {
      console.warn('Dados podem ter sido corrompidos ou adulterados');
    }
    
    return decryptedData;
  } catch (error) {
    console.error('Erro ao descriptografar dados da conta:', error);
    return encryptedAccountData;
  }
};

// Função para criptografar códigos de resgate
export const encryptRedeemCode = (code: string): string => {
  const timestamp = Date.now();
  const codeWithTimestamp = `${code}|${timestamp}`;
  return encrypt(codeWithTimestamp);
};

// Função para descriptografar e validar códigos
export const decryptRedeemCode = (encryptedCode: string): { code: string; timestamp: number; isValid: boolean } => {
  try {
    const decrypted = decrypt(encryptedCode);
    const [code, timestampStr] = decrypted.split('|');
    const timestamp = parseInt(timestampStr);
    
    // Código válido por 24 horas
    const isValid = (Date.now() - timestamp) < (24 * 60 * 60 * 1000);
    
    return { code, timestamp, isValid };
  } catch (error) {
    return { code: '', timestamp: 0, isValid: false };
  }
};