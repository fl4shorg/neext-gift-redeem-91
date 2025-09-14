import { useState, useRef } from 'react';
import { FaCamera } from 'react-icons/fa';
import { LoadingSpinner } from './LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import Tesseract from 'tesseract.js';

interface ImageCodeExtractorProps {
  onCodeExtracted: (code: string) => void;
  onCodeSuggestion: (code: string) => void;
}

export const ImageCodeExtractor = ({ onCodeExtracted, onCodeSuggestion }: ImageCodeExtractorProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const extractCodeFromText = (raw: string): string | null => {
    console.log('Raw OCR text:', raw);

    // Normalize (keep hyphens and spaces for flexible matching)
    const text = raw
      .toUpperCase()
      .replace(/[‐‑‒–—−]/g, '-') // normalize dash types
      .replace(/[|]/g, 'I')      // common confusion
      .replace(/_/g, '-')
      .replace(/[^A-Z0-9\-\s]/g, ' ') // drop noise, keep spaces
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

    console.log('Normalized text:', text);

    // 1) Flexible match allowing separators or spaces between parts
    const flex = text.match(/N[E3]EXT\s*[-\s:]*\s*G[C]\s*[-\s:]*\s*([A-Z0-9]{5,16})\s*[-\s:]*\s*([0-9])/);
    if (flex) {
      const body = flex[1].replace(/\s+/g, '');
      const last = flex[2];
      const candidate = `NEEXT-GC-${body}-${last}`;
      console.log('Matched (flex):', candidate);
      return candidate;
    }

    // 2) Strict hyphenated pattern
    const strictMatches = text.match(/NEEXT\s*-\s*GC\s*-\s*([A-Z0-9]{5,16})\s*-\s*([0-9])/);
    if (strictMatches) {
      const body = strictMatches[1].replace(/\s+/g, '');
      const last = strictMatches[2];
      const candidate = `NEEXT-GC-${body}-${last}`;
      console.log('Matched (strict):', candidate);
      return candidate;
    }

    // 3) No-hyphen fallback (fully collapsed)
    const collapsed = text.replace(/[^A-Z0-9]/g, '');
    const collapsedMatch = collapsed.match(/NEEXTGC([A-Z0-9]{5,16})([0-9])/);
    if (collapsedMatch) {
      const candidate = `NEEXT-GC-${collapsedMatch[1]}-${collapsedMatch[2]}`;
      console.log('Matched (collapsed):', candidate);
      return candidate;
    }

    console.log('No match found with current rules.');
    return null;
  };

  const preprocessImage = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale and increase contrast
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Increase contrast and make binary (black/white)
      const binary = gray > 128 ? 255 : 0;
      
      data[i] = binary;     // Red
      data[i + 1] = binary; // Green  
      data[i + 2] = binary; // Blue
      // Alpha stays the same
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  };

  const processImage = async (file: File) => {
    setIsProcessing(true);

    try {
      // Read file to data URL and set preview
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setPreviewImage(dataUrl);

      // Create canvas for image preprocessing
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Scale image for better OCR (larger images work better)
      const scale = Math.max(1, 800 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Preprocess image for better OCR
      const processedDataUrl = preprocessImage(canvas);

      console.log('Starting Tesseract OCR process...');
      
      // Try multiple OCR configurations
      const configs = [
        {
          tessedit_pageseg_mode: '8', // SINGLE_WORD
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
        },
        {
          tessedit_pageseg_mode: '7', // SINGLE_TEXTLINE  
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
        },
        {
          tessedit_pageseg_mode: '6', // SINGLE_UNIFORM_BLOCK
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789- ',
        }
      ];

      let bestResult = '';
      let bestConfidence = 0;

      for (const config of configs) {
        try {
          const { data } = await Tesseract.recognize(processedDataUrl, 'eng', {
            logger: (m) => console.log(`Tesseract (${config.tessedit_pageseg_mode}):`, m),
            ...config
          } as any);

          console.log(`Config ${config.tessedit_pageseg_mode} - Text:`, data?.text, 'Confidence:', data?.confidence);
          
          if (data?.confidence > bestConfidence && data?.text?.trim()) {
            bestResult = data.text;
            bestConfidence = data.confidence;
          }
        } catch (configError) {
          console.log(`Config ${config.tessedit_pageseg_mode} failed:`, configError);
        }
      }

      console.log('Best OCR result:', bestResult, 'with confidence:', bestConfidence);
      
      const extractedCode = extractCodeFromText(bestResult || '');
      console.log('Extracted code result:', extractedCode);

      if (extractedCode) {
        onCodeExtracted(extractedCode);
        onCodeSuggestion(extractedCode);
        toast({
          title: 'Código detectado!',
          description: `Código encontrado: ${extractedCode}`
        });
      } else {
        // Show what was actually detected for debugging
        const cleanText = bestResult?.replace(/\s+/g, ' ').trim() || '';
        console.log('Clean text for debugging:', cleanText);
        
        toast({
          title: 'OCR não funcionou',
          description: bestResult ? `Texto: "${cleanText}"` : 'Digite o código manualmente',
          variant: 'destructive'
        });
        
        // Force manual entry when OCR fails
        setTimeout(() => {
          toast({
            title: 'Digite manualmente',
            description: 'OCR falhou. Use a entrada manual abaixo.',
          });
        }, 1500);
        
        // Trigger manual entry by passing empty code
        onCodeSuggestion('');
      }
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao processar a imagem',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        processImage(file);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione uma imagem",
          variant: "destructive"
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        style={{ display: 'none' }}
      />
      
      {/* Scan Button */}
      <div className="text-center">
        <button
          type="button"
          onClick={handleUploadClick}
          disabled={isProcessing}
          className="akuma-button glow-button w-full"
        >
          {isProcessing ? (
            <>
              <LoadingSpinner size="small" />
              <span>Escaneando Akuma no Mi...</span>
            </>
          ) : (
            <>
              <FaCamera />
              <span>Escanear Akuma no Mi</span>
            </>
          )}
        </button>
      </div>

      {/* Image Preview */}
      {previewImage && (
        <div className="mt-4">
          <img
            src={previewImage}
            alt="Preview do gift card"
            className="max-w-full max-h-60 rounded-lg mx-auto shadow-lg"
          />
        </div>
      )}
    </div>
  );
};