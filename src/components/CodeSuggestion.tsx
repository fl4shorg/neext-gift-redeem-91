import { FaCheck, FaTimes, FaKeyboard } from 'react-icons/fa';

interface CodeSuggestionProps {
  suggestedCode: string;
  onAccept: () => void;
  onReject: () => void;
  visible: boolean;
}

export const CodeSuggestion = ({ 
  suggestedCode, 
  onAccept, 
  onReject, 
  visible 
}: CodeSuggestionProps) => {
  if (!visible) return null;

  return (
    <div className="w-full mt-4 p-4 bg-background/50 border border-info rounded-lg space-y-3">
      <div className="flex items-center gap-2 text-info">
        <FaKeyboard />
        <span className="font-semibold">Código detectado!</span>
      </div>
      
      <div className="p-3 bg-muted rounded-md">
        <p className="text-sm text-muted-foreground mb-2">
          <strong>Encontramos um possível código:</strong>
        </p>
        <p className="text-lg font-mono font-bold text-foreground break-all">
          {suggestedCode}
        </p>
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={onAccept}
          className="flex-1 akuma-button glow-button bg-success/80 hover:bg-success"
        >
          <FaCheck />
          <span>Usar este código</span>
        </button>
        
        <button
          onClick={onReject}
          className="flex-1 akuma-button glow-button bg-muted-foreground/80 hover:bg-muted-foreground"
        >
          <FaTimes />
          <span>Digitar manualmente</span>
        </button>
      </div>
    </div>
  );
};