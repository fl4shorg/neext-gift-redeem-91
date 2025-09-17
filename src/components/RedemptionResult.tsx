import { 
  FaCheckCircle, 
  FaInfoCircle, 
  FaExclamationTriangle, 
  FaUser, 
  FaKey, 
  FaTv, 
  FaServer,
  FaAndroid,
  FaApple,
  FaExternalLinkAlt
} from 'react-icons/fa';

interface AccountData {
  email: string;
  password: string;
  accountType: string;
  server?: string;
}

interface RedemptionResultProps {
  type: 'success' | 'warning' | 'error';
  message: string;
  accountData?: AccountData;
  redeemedAt?: string;
  visible: boolean;
}

export const RedemptionResult = ({ 
  type, 
  message, 
  accountData, 
  redeemedAt, 
  visible 
}: RedemptionResultProps) => {
  if (!visible) return null;

  // Os dados já vem em texto simples da API, não precisam ser descriptografados
  const displayAccountData = accountData;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-success text-xl flex-shrink-0" />;
      case 'warning':
        return <FaInfoCircle className="text-warning text-xl flex-shrink-0" />;
      case 'error':
        return <FaExclamationTriangle className="text-destructive text-xl flex-shrink-0" />;
    }
  };

  const getContainerClass = () => {
    switch (type) {
      case 'success':
        return 'result-success';
      case 'warning':
        return 'result-warning';
      case 'error':
        return 'result-error';
    }
  };

  return (
    <div className={`w-full mt-4 space-y-3 ${getContainerClass()}`} role="alert" aria-live="assertive">
      <div className="flex items-center gap-3 font-semibold">
        {getIcon()}
        <span>{message}</span>
      </div>
      
      {displayAccountData && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <FaUser className="text-purple-light min-w-[20px] text-center flex-shrink-0" />
            <span className="break-all">{displayAccountData.email}</span>
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <FaKey className="text-purple-light min-w-[20px] text-center flex-shrink-0" />
            <span className="break-all">{displayAccountData.password}</span>
          </div>
          
          {displayAccountData.server && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <FaServer className="text-purple-light min-w-[20px] text-center flex-shrink-0" />
              <span className="break-all">{displayAccountData.server}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-muted-foreground">
            <FaTv className="text-purple-light min-w-[20px] text-center flex-shrink-0" />
            <span className="break-all">{displayAccountData.accountType}</span>
          </div>
          
          {/* Instruções específicas para IPTV */}
          {displayAccountData.accountType === 'IPTV' && (
            <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <h3 className="text-primary font-semibold mb-3 flex items-center gap-2">
                <FaTv className="text-primary" />
                Instruções de uso IPTV
              </h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <span className="text-primary font-semibold min-w-[20px]">1.</span>
                  <div className="space-y-3">
                    <span>Ao resgatar, baixe um aplicativo de IPTV na Play Store (Android) ou App Store (iOS).</span>
                    
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Para Android, recomendamos:</div>
                      <button
                        onClick={() => window.open('https://tekmods.com/iptv-smarters-pro-player-android-apk-mod/', '_blank')}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg transition-colors"
                      >
                        <FaAndroid />
                        <span>IPTV Smarters Pro (APK)</span>
                        <FaExternalLinkAlt className="text-xs" />
                      </button>
                      
                      <div className="text-xs text-muted-foreground mt-2">Para iOS, recomendamos:</div>
                      <button
                        onClick={() => window.open('https://apps.apple.com/br/app/smarters-player-lite/id1628995509', '_blank')}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
                      >
                        <FaApple />
                        <span>Smarters Player Lite</span>
                        <FaExternalLinkAlt className="text-xs" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-primary font-semibold min-w-[20px]">2.</span>
                  <span>Cole o servidor na parte solicitada. Caso apareça https no início, retire o s e deixe apenas http. Se não fizer isso, a conta não funcionará.</span>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-primary font-semibold min-w-[20px]">3.</span>
                  <span>Pronto! Bom uso e aproveite. ✅</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {redeemedAt && (
        <div className="text-muted-foreground">
          Resgatado em: {new Date(redeemedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
};