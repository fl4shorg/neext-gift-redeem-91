import CryptoJS from 'crypto-js';

// Chave secreta para criptografia (em produção, use variável de ambiente)
const SECRET_KEY = 'AKUMA_NO_MI_SECRET_KEY_2024';

export const encrypt = (text: string): string => {
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (error) {
    console.error('Erro ao criptografar:', error);
    return text;
  }
};

export const decrypt = (encryptedText: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Erro ao descriptografar:', error);
    return encryptedText;
  }
};

export const encryptAccountData = (accountData: any) => {
  return {
    ...accountData,
    email: encrypt(accountData.email || ''),
    password: encrypt(accountData.password || ''),
    server: accountData.server ? encrypt(accountData.server) : undefined,
  };
};

export const decryptAccountData = (encryptedAccountData: any) => {
  return {
    ...encryptedAccountData,
    email: decrypt(encryptedAccountData.email || ''),
    password: decrypt(encryptedAccountData.password || ''),
    server: encryptedAccountData.server ? decrypt(encryptedAccountData.server) : undefined,
  };
};