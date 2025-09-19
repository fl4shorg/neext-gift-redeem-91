import { useState, useRef, useEffect } from 'react';
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
  const workerRef = useRef<Tesseract.Worker | null>(null);
  const { toast } = useToast();

  // Initialize persistent Tesseract worker
  useEffect(() => {
    const initWorker = async () => {
      try {
        const worker = await Tesseract.createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
          preserve_interword_spaces: '1'
        });
        workerRef.current = worker;
        console.log('Tesseract worker initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Tesseract worker:', error);
      }
    };
    
    initWorker();
    
    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const extractCodeFromText = (raw: string): string | null => {
    console.log('Raw OCR text:', raw);

    // Normalize with enhanced error correction
    let text = raw
      .toUpperCase()
      .replace(/[‐‑‒–—−_]/g, '-') // normalize dash types
      .replace(/[|]/g, 'I')      // common confusion
      .replace(/[^A-Z0-9\-\s]/g, ' ') // drop noise, keep spaces
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

    console.log('Normalized text:', text);

    // Universal patterns for ANY gift card combination
    const patterns = [
      // Perfect match - NEEXT-GC-XXXXXXXX-X (any combination)
      /NEEXT\s*-\s*GC\s*-\s*([A-Z0-9]{6,12})\s*-\s*([0-9])/,
      // Flexible with common OCR errors
      /N[E3]+XT\s*[-\s]*\s*G[C]\s*[-\s]*\s*([A-Z0-9]{6,12})\s*[-\s]*\s*([0-9])/,
      // Very flexible pattern (handles spacing and character confusion)
      /[NM][E3E]+[XT]\s*[-\s]*\s*[GC][C]?\s*[-\s]*\s*([A-Z0-9]{6,12})\s*[-\s]*\s*([0-9])/,
      // Collapsed format (no spaces/hyphens)
      /NEEXTGC([A-Z0-9]{6,12})([0-9])/,
      // Just the main structure without prefix
      /GC\s*[-\s]*\s*([A-Z0-9]{6,12})\s*[-\s]*\s*([0-9])/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match.length >= 3) {
        const body = match[1].replace(/\s+/g, '');
        const last = match[2];
        const candidate = `NEEXT-GC-${body}-${last}`;
        console.log('Matched pattern:', pattern.toString(), '→', candidate);
        return candidate;
      }
    }

    // Look for any NEEXT-GC pattern (even if spacing is weird)
    const simpleMatch = text.match(/NEEXT[-\s]*GC[-\s]*([A-Z0-9]{6,12})[-\s]*([0-9])/);
    if (simpleMatch) {
      const candidate = `NEEXT-GC-${simpleMatch[1]}-${simpleMatch[2]}`;
      console.log('Found simple pattern:', candidate);
      return candidate;
    }

    console.log('No match found with current rules.');
    return null;
  };

  const simplePreprocess = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple but effective preprocessing
    for (let i = 0; i < data.length; i += 4) {
      // Convert to grayscale
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      
      // Simple threshold for good contrast
      const binary = gray < 150 ? 0 : 255;
      
      data[i] = binary;
      data[i + 1] = binary;
      data[i + 2] = binary;
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
      
      // Scale image for better OCR
      const targetSize = 1200;
      const scale = Math.max(2, targetSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      console.log('Starting OCR process...');

      // Try multiple approaches
      const attempts = [
        {
          name: 'Simple preprocessing',
          image: simplePreprocess(canvas),
          psm: Tesseract.PSM.AUTO
        },
        {
          name: 'Raw image',
          image: canvas.toDataURL('image/png'),
          psm: Tesseract.PSM.SINGLE_BLOCK
        },
        {
          name: 'Single line mode',
          image: simplePreprocess(canvas),
          psm: Tesseract.PSM.SINGLE_LINE
        }
      ];

      let extractedCode = null;
      let bestText = '';

      for (const attempt of attempts) {
        try {
          console.log(`Trying ${attempt.name}...`);
          
          let result;
          if (workerRef.current) {
            await workerRef.current.setParameters({
              tessedit_pageseg_mode: attempt.psm
            });
            result = await workerRef.current.recognize(attempt.image);
          } else {
            result = await Tesseract.recognize(attempt.image, 'eng', {
              tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
            } as any);
          }
          
          console.log(`${attempt.name} result:`, result.data?.text, 'Confidence:', result.data?.confidence);
          
          if (result.data?.text) {
            bestText = result.data.text;
            extractedCode = extractCodeFromText(result.data.text);
            if (extractedCode) {
              console.log('Successfully extracted code:', extractedCode);
              break;
            }
          }
        } catch (error) {
          console.log(`${attempt.name} failed:`, error);
        }
      }

      if (extractedCode) {
        onCodeExtracted(extractedCode);
        onCodeSuggestion(extractedCode);
        toast({
          title: 'Código detectado!',
          description: `Código encontrado: ${extractedCode}`
        });
      } else {
        console.log('All OCR attempts failed. Best text:', bestText);
        
        toast({
          title: 'OCR não funcionou',
          description: bestText ? `Texto detectado: "${bestText.substring(0, 50)}..."` : 'Nenhum texto detectado. Digite manualmente.',
          variant: 'destructive'
        });
        
        // Force manual entry when OCR fails
        setTimeout(() => {
          toast({
            title: 'Digite manualmente',
            description: 'Use a entrada manual abaixo para inserir o código.',
          });
        }, 2000);
        
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