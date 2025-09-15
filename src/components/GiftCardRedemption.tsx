import { useState, useEffect, useCallback } from 'react';
import { 
  FaStar, 
  FaKey, 
  FaCopy, 
  FaInstagram, 
  FaWhatsapp, 
  FaInfoCircle, 
  FaServer,
  FaUser,
  FaClipboard 
} from 'react-icons/fa';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DevilFruitIcon } from './DevilFruitIcon';
import { LoadingSpinner } from './LoadingSpinner';
import { Toast } from './Toast';
import { RedemptionResult } from './RedemptionResult';
import { ImageCodeExtractor } from './ImageCodeExtractor';
import { useToast } from '@/hooks/use-toast';
import { API_URL, SOCIAL_LINKS } from '@/lib/config';
// Crypto imports removidos - usando nova API simplificada

interface AccountData {
  email: string;
  password: string;
  accountType: string;
  server?: string;
}

interface ApiResponse {
  mensagem: string;
  email?: string;
  senha?: string;
  tipoConta?: string;
  usuario?: string;
  servidor?: string;
  resgatadoEm?: string;
}

export const GiftCardRedemption = () => {
  const [code, setCode] = useState('');
  const [resgatante, setResgatante] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    accountData?: AccountData;
    redeemedAt?: string;
    visible: boolean;
  }>({ type: 'success', message: '', visible: false });
  const [lastAccount, setLastAccount] = useState<AccountData | null>(null);
  const [greeting, setGreeting] = useState('');
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const { toast } = useToast();

  // Frases aleatórias para confirmação
  const confirmPhrases = [
    "Poder infinito, mas o mar será seu inimigo eterno.",
    "Ganhe habilidades únicas, mas jamais voltará a nadar.",
    "A fruta te dá poder, o oceano te tira a liberdade.",
    "Ao provar, o mar nunca mais te aceitará.",
    "Poder em troca da sua ligação com o mar."
  ];

  // Generate greeting based on time of day
  const updateGreeting = useCallback(() => {
    const hour = new Date().getHours();
    let greetingText = 'Olá';
    
    if (hour >= 5 && hour < 12) {
      greetingText = 'Bom dia';
    } else if (hour >= 12 && hour < 18) {
      greetingText = 'Boa tarde';
    } else {
      greetingText = 'Boa noite';
    }
    
    setGreeting(`${greetingText} - Grand Line online`);
  }, []);

  // Generate random account count
  const generateAccountCount = useCallback(() => {
    const count = Math.floor(Math.random() * 9000) + 1000;
    setTotalAccounts(count);
  }, []);

  useEffect(() => {
    updateGreeting();
    generateAccountCount();
  }, [updateGreeting, generateAccountCount]);

  const handleRedeemClick = () => {
    if (!code.trim()) {
      toast({
        title: "Erro",
        description: "Digite o código da Akuma no Mi!",
        variant: "destructive"
      });
      return;
    }

    if (!resgatante.trim()) {
      toast({
        title: "Nome necessário",
        description: "Por favor, informe seu nome.",
        variant: "destructive"
      });
      return;
    }

    // Escolher frase aleatória e mostrar dialog
    const randomPhrase = confirmPhrases[Math.floor(Math.random() * confirmPhrases.length)];
    setConfirmPhrase(randomPhrase);
    setShowConfirmDialog(true);
  };

  const handleRedeem = async () => {
    setIsLoading(true);
    setResult(prev => ({ ...prev, visible: false }));
    setLastAccount(null);

    try {
      console.log('🎁 Enviando requisição para nova API...');
      
      const url = `${API_URL}?action=redeem&resgatante=${encodeURIComponent(resgatante)}&gift=${encodeURIComponent(code)}`;
      
      console.log('🔗 URL da requisição:', url);
      console.log('📋 Parâmetros:', { action: 'redeem', resgatante, gift: code });
      
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors'
      });
      
      console.log('📡 Status da resposta:', response.status, response.statusText);
      console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('📄 Texto bruto da resposta:', responseText);
      
      const data = JSON.parse(responseText);
      console.log('✅ JSON parseado:', data);
      console.log('📦 Resposta recebida:', data);

      if (data.status === "success") {
        let accountData: AccountData;
        
        if (data.hasOwnProperty('servidor')) {
          // É conta IPTV - mostra nome, senha e servidor
          accountData = {
            email: data.nome || 'Não informado',
            password: data.senha || 'Não informada',
            accountType: 'IPTV',
            server: data.servidor || 'Não informado',
          };
        } else {
          // É conta normal - mostra email e senha
          accountData = {
            email: data.email || 'Não informado',
            password: data.senha || 'Não informada',
            accountType: data.tipo || 'Normal',
          };
        }

        setLastAccount(accountData);
        setResult({
          type: 'success',
          message: 'GiftCard resgatado com sucesso!',
          accountData: accountData,
          visible: true
        });
      } else {
        console.log('❌ Resposta de erro da API:', data);
        setResult({
          type: 'error',
          message: data.message || 'Erro ao resgatar GiftCard.',
          visible: true
        });
      }
    } catch (error) {
      console.log('💥 Erro na requisição:', error);
      console.log('💥 Tipo do erro:', typeof error);
      console.log('💥 Stack trace:', error.stack);
      setResult({
        type: 'error',
        message: `Erro de conexão: ${error.message}`,
        visible: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAccount = async () => {
    if (!lastAccount) return;
    
    let text = '';
    if (lastAccount.accountType === 'IPTV') {
      text = `Usuário: ${lastAccount.email}\nSenha: ${lastAccount.password}\nServidor: ${lastAccount.server}\nTipo de Conta: IPTV`;
    } else {
      text = `Email: ${lastAccount.email}\nSenha: ${lastAccount.password}\nTipo de Conta: ${lastAccount.accountType}`;
    }
    
    try {
      await navigator.clipboard.writeText(text);
      setShowToast(true);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar para a área de transferência",
        variant: "destructive"
      });
    }
  };

  const handleCreditsClick = () => {
      toast({
        title: "Créditos",
        description: "Desenvolvido pelos Piratas do Chapéu de Palha",
      });
  };

  const handleCodeExtracted = (extractedCode: string) => {
    setCode(extractedCode);
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setCode(text.trim());
        toast({
          title: "Código colado!",
          description: "O código foi colado da área de transferência.",
        });
      } else {
        toast({
          title: "Área de transferência vazia",
          description: "Não há conteúdo para colar.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao colar",
        description: "Não foi possível acessar a área de transferência.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="akuma-card glow-card max-w-md w-full flex flex-col items-center space-y-6">
        {/* Logo and Title */}
        <div className="text-center">
          <div className="mb-4 text-primary glow-text flex justify-center">
            <DevilFruitIcon size={80} />
          </div>
          <h1 className="text-primary text-2xl font-semibold tracking-widest glow-text">
            Akuma no Mi
          </h1>
        </div>

        {/* Premium Badge */}
        <button className="akuma-button glow-button">
          <FaStar />
          <span>Poder Especial</span>
        </button>

        {/* Code Input and Buttons */}
        <div className="w-full space-y-6">
          {/* Etapa 1: Captura de Imagem */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">1</span>
              Escaneie sua Akuma no Mi
            </h2>
            
            <ImageCodeExtractor 
              onCodeExtracted={handleCodeExtracted}
              onCodeSuggestion={(code) => {
                if (code.trim()) {
                  setCode(code);
                }
              }}
            />
          </div>

          {/* Etapa 2: Confirmação e Resgate */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm flex items-center justify-center">2</span>
              Confirme e finalize o resgate
            </h2>
            
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código da Akuma no Mi"
              className="akuma-input"
              disabled={isLoading}
            />
            
            <input
              type="text"
              value={resgatante}
              onChange={(e) => setResgatante(e.target.value)}
              placeholder="Seu nome"
              className="akuma-input"
              disabled={isLoading}
            />
            
            <button
              onClick={handlePasteCode}
              disabled={isLoading}
              className="akuma-button glow-button"
            >
              <FaClipboard />
              <span>Colar</span>
            </button>
            
            <button
              onClick={handleRedeemClick}
              disabled={isLoading || !code.trim() || !resgatante.trim()}
              className="akuma-button glow-button"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Carregando...</span>
                </>
              ) : (
                <>
                  <FaKey />
                  <span>Consumir</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleCopyAccount}
              disabled={!lastAccount}
              className="akuma-button glow-button"
            >
              <FaCopy />
              <span>Copiar Poder</span>
            </button>
          </div>
        </div>

        {/* Result Display */}
        <RedemptionResult {...result} />

        {/* Server Status */}
        <div className="flex items-center space-x-3">
          <span className="w-4 h-4 rounded-full bg-success block"></span>
          <p className="text-muted-foreground font-semibold flex items-center gap-2">
            <FaServer className="text-primary" />
            <span>{greeting}</span>
          </p>
        </div>

        {/* Account Counter */}
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="small" />
          <p className="text-muted-foreground font-semibold">
            Total de Akuma no Mi disponíveis: {totalAccounts.toLocaleString()}
          </p>
        </div>

        {/* Social Media Buttons */}
        <div className="w-full space-y-4">
          <button 
            onClick={() => window.open(SOCIAL_LINKS.ig, '_blank')}
            className="akuma-button glow-button"
          >
            <FaInstagram />
            <span>@neet.tk</span>
          </button>
          
          <button 
            onClick={() => window.open(SOCIAL_LINKS.wa, '_blank')}
            className="akuma-button glow-button"
          >
            <FaWhatsapp />
            <span>Canal dos Piratas</span>
          </button>
          
          <button 
            onClick={() => window.open(SOCIAL_LINKS.site, '_blank')}
            className="akuma-button glow-button"
          >
            <FaUser />
            <span>Login</span>
          </button>
          
          <button 
            onClick={handleCreditsClick}
            className="akuma-button glow-button"
          >
            <FaInfoCircle />
            <span>Créditos</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      <Toast
        message="Poder copiado para a área de transferência!"
        show={showToast}
        onHide={() => setShowToast(false)}
      />

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="akuma-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary text-center flex items-center justify-center gap-2">
              <DevilFruitIcon size={32} />
              Tem certeza que deseja continuar?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground font-medium mt-4">
              {confirmPhrase}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3 mt-6">
            <AlertDialogCancel className="bg-muted text-muted-foreground hover:bg-muted/80 font-semibold px-6 py-3 rounded-xl border border-muted-foreground/20">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                setShowConfirmDialog(false);
                handleRedeem();
              }}
              className="akuma-button glow-button"
            >
              Consumir Akuma no Mi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};