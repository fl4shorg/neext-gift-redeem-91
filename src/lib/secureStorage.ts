import { encrypt, decrypt, encryptSessionData, decryptSessionData } from './crypto';

// Configurações de armazenamento seguro
const STORAGE_CONFIG = {
  prefix: 'akuma_',
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
  maxStorageSize: 1024 * 1024, // 1MB
};

interface StoredData {
  data: string;
  timestamp: number;
  encrypted: boolean;
  checksum: string;
}

/**
 * Classe para armazenamento seguro no localStorage
 */
export class SecureStorage {
  private static instance: SecureStorage;
  
  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * Armazenar dados de forma segura
   */
  set(key: string, value: any, encrypt: boolean = true): boolean {
    try {
      const timestamp = Date.now();
      const serialized = JSON.stringify(value);
      
      // Verificar tamanho
      if (serialized.length > STORAGE_CONFIG.maxStorageSize) {
        console.warn('⚠️ Dados muito grandes para armazenar');
        return false;
      }
      
      let storedData: StoredData;
      
      if (encrypt) {
        const encryptedData = encryptSessionData(value);
        storedData = {
          data: encryptedData,
          timestamp,
          encrypted: true,
          checksum: this.generateChecksum(encryptedData)
        };
      } else {
        storedData = {
          data: serialized,
          timestamp,
          encrypted: false,
          checksum: this.generateChecksum(serialized)
        };
      }
      
      const finalKey = STORAGE_CONFIG.prefix + key;
      localStorage.setItem(finalKey, JSON.stringify(storedData));
      
      console.log(`🔐 Dados armazenados: ${key} (criptografado: ${encrypt})`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao armazenar dados:', error);
      return false;
    }
  }

  /**
   * Recuperar dados de forma segura
   */
  get<T>(key: string): T | null {
    try {
      const finalKey = STORAGE_CONFIG.prefix + key;
      const stored = localStorage.getItem(finalKey);
      
      if (!stored) {
        return null;
      }
      
      const storedData: StoredData = JSON.parse(stored);
      
      // Verificar timestamp
      if (Date.now() - storedData.timestamp > STORAGE_CONFIG.sessionTimeout) {
        console.log('⏰ Dados expirados, removendo...');
        this.remove(key);
        return null;
      }
      
      // Verificar integridade
      const currentChecksum = this.generateChecksum(storedData.data);
      if (currentChecksum !== storedData.checksum) {
        console.warn('⚠️ Integridade comprometida, removendo dados...');
        this.remove(key);
        return null;
      }
      
      // Descriptografar se necessário
      let data: any;
      if (storedData.encrypted) {
        data = decryptSessionData(storedData.data);
      } else {
        data = JSON.parse(storedData.data);
      }
      
      console.log(`🔓 Dados recuperados: ${key}`);
      return data;
    } catch (error) {
      console.error('❌ Erro ao recuperar dados:', error);
      this.remove(key);
      return null;
    }
  }

  /**
   * Remover dados
   */
  remove(key: string): void {
    try {
      const finalKey = STORAGE_CONFIG.prefix + key;
      localStorage.removeItem(finalKey);
      console.log(`🗑️ Dados removidos: ${key}`);
    } catch (error) {
      console.error('❌ Erro ao remover dados:', error);
    }
  }

  /**
   * Limpar todos os dados do app
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(STORAGE_CONFIG.prefix)) {
          localStorage.removeItem(key);
        }
      });
      console.log('🧹 Cache limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Listar todas as chaves armazenadas
   */
  getAllKeys(): string[] {
    try {
      const keys = Object.keys(localStorage);
      return keys
        .filter(key => key.startsWith(STORAGE_CONFIG.prefix))
        .map(key => key.replace(STORAGE_CONFIG.prefix, ''));
    } catch (error) {
      console.error('❌ Erro ao listar chaves:', error);
      return [];
    }
  }

  /**
   * Verificar tamanho do armazenamento
   */
  getStorageSize(): number {
    try {
      let totalSize = 0;
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        if (key.startsWith(STORAGE_CONFIG.prefix)) {
          const value = localStorage.getItem(key);
          if (value) {
            totalSize += value.length;
          }
        }
      });
      
      return totalSize;
    } catch (error) {
      console.error('❌ Erro ao calcular tamanho:', error);
      return 0;
    }
  }

  /**
   * Limpar dados expirados
   */
  cleanExpired(): number {
    try {
      let cleaned = 0;
      const keys = this.getAllKeys();
      
      keys.forEach(key => {
        const data = this.get(key);
        if (data === null) {
          cleaned++;
        }
      });
      
      console.log(`🧹 ${cleaned} itens expirados removidos`);
      return cleaned;
    } catch (error) {
      console.error('❌ Erro ao limpar dados expirados:', error);
      return 0;
    }
  }

  /**
   * Gerar checksum para verificação de integridade
   */
  private generateChecksum(data: string): string {
    // Implementação simples de hash
    let hash = 0;
    if (data.length === 0) return hash.toString();
    
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Converter para 32bit
    }
    
    return Math.abs(hash).toString(16);
  }
}

// Instância singleton
export const secureStorage = SecureStorage.getInstance();

// Funções de conveniência
export const setSecureItem = (key: string, value: any, encrypt: boolean = true) => 
  secureStorage.set(key, value, encrypt);

export const getSecureItem = <T>(key: string): T | null => 
  secureStorage.get<T>(key);

export const removeSecureItem = (key: string) => 
  secureStorage.remove(key);

export const clearSecureStorage = () => 
  secureStorage.clear();