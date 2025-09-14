import { useState } from 'react';
import { FaKeyboard, FaCheck } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';

interface ManualCodeEntryProps {
  onCodeConfirmed: (code: string) => void;
  visible: boolean;
}

export const ManualCodeEntry = ({ onCodeConfirmed, visible }: ManualCodeEntryProps) => {
  const [manualCode, setManualCode] = useState('');
  const { toast } = useToast();

  if (!visible) return null;

  const handleConfirm = () => {
    if (!manualCode.trim()) {
      toast({
        title: "Código vazio",
        description: "Por favor, digite o código do gift card.",
        variant: "destructive"
      });
      return;
    }

    onCodeConfirmed(manualCode.trim());
    setManualCode('');
    
    toast({
      title: "Código definido!",
      description: "Agora preencha seu nome e clique em Consumir.",
    });
  };

  return (
    <div className="w-full mt-4 p-4 bg-background/50 border border-warning rounded-lg space-y-4">
      <div className="flex items-center gap-2 text-warning">
        <FaKeyboard />
        <span className="font-semibold">Digitação Manual</span>
      </div>
      
      <div className="space-y-3">
        <label htmlFor="manual-code" className="block text-sm font-medium text-foreground">
          Digite o código do Gift Card:
        </label>
        <input
          id="manual-code"
          type="text"
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="Ex: NEEXT-GC-XXXXXX-X"
          className="akuma-input"
          autoFocus
        />
      </div>
      
      <button
        onClick={handleConfirm}
        className="w-full akuma-button glow-button bg-success/80 hover:bg-success"
      >
        <FaCheck />
        <span>Confirmar Código</span>
      </button>
    </div>
  );
};