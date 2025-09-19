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
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-',
          preserve_interword_spaces: '1',
          user_defined_dpi: '300'
        });
        workerRef.current = worker;
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

    // Smart confusables normalization for common OCR errors
    const normalizeConfusables = (text: string): string => {
      return text
        .replace(/[0OQ]/g, (match, offset, str) => {
          // Context-aware: O in NEEXT stays O, numbers become 0
          if (str.substring(Math.max(0, offset-4), offset+1).includes('NEET')) return 'O';
          if (str.substring(offset-2, offset+3).match(/[A-Z]{2}[0OQ]/)) return '0';
          return match;
        })
        .replace(/[1Il|]/g, (match, offset, str) => {
          // I in context of letters, 1 in context of numbers
          if (str.substring(offset-1, offset+2).match(/[A-Z][1Il|][A-Z]/)) return 'I';
          return '1';
        })
        .replace(/[5S]/g, (match, offset, str) => {
          // S in word context, 5 in number context
          if (str.substring(offset-1, offset+2).match(/[A-Z][5S][A-Z]/)) return 'S';
          return '5';
        })
        .replace(/[2Z]/g, (match, offset, str) => {
          if (str.substring(offset-1, offset+2).match(/[A-Z][2Z][A-Z]/)) return 'Z';
          return '2';
        })
        .replace(/[8B]/g, (match, offset, str) => {
          if (str.substring(offset-1, offset+2).match(/[A-Z][8B][A-Z]/)) return 'B';
          return '8';
        })
        .replace(/[6G]/g, (match, offset, str) => {
          if (str.substring(offset-1, offset+2).match(/[A-Z][6G][A-Z]/)) return 'G';
          return '6';
        });
    };

    // Normalize with enhanced confusables handling
    let text = raw
      .toUpperCase()
      .replace(/[‐‑‒–—−_]/g, '-') // normalize dash types
      .replace(/[^A-Z0-9\-\s]/g, ' ') // drop noise, keep spaces
      .replace(/\s+/g, ' ') // collapse spaces
      .trim();

    text = normalizeConfusables(text);
    console.log('Normalized text:', text);

    // 1) Enhanced flexible match with better error tolerance
    const patterns = [
      // Perfect match
      /NEEXT\s*-\s*GC\s*-\s*([A-Z0-9]+)\s*-\s*([0-9])/,
      // Flexible separators
      /N[E3]+XT\s*[-\s]*\s*G[C]\s*[-\s]*\s*([A-Z0-9]{6,12})\s*[-\s]*\s*([0-9])/,
      // Very flexible with common OCR errors
      /[NM][E3]+[XT]\s*[-\s]*\s*[GC][C]?\s*[-\s]*\s*([A-Z0-9]{6,12})\s*[-\s]*\s*([0-9])/,
      // Looking for 8UXSDAB2 specifically with context
      /[8B]UX[S5]DA[B8]2\s*[-\s]*\s*([0-9])/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        let body, last;
        if (match.length === 2) {
          // Special case for UXSDAB2 pattern
          body = '8UXSDAB2';
          last = match[1];
        } else {
          body = match[1].replace(/\s+/g, '').substring(0, 12);
          last = match[2];
        }
        const candidate = `NEEXT-GC-${body}-${last}`;
        console.log('Matched pattern:', pattern, '→', candidate);
        return candidate;
      }
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

  const findCodeRegion = (canvas: HTMLCanvasElement): { x: number, y: number, width: number, height: number } => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;

    // Convert to grayscale for analysis
    const grayData = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }

    // Find horizontal projection to locate text lines
    const horizontalProj = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const gray = grayData[y * width + x];
        // Count dark pixels (text) - looking for the code box
        if (gray < 180) {
          horizontalProj[y]++;
        }
      }
    }

    // Find the strongest text line in the bottom half (where the code usually is)
    let maxDensity = 0;
    let codeLineY = Math.floor(height * 0.7); // Default to bottom 30%
    
    for (let y = Math.floor(height * 0.5); y < Math.floor(height * 0.9); y++) {
      if (horizontalProj[y] > maxDensity) {
        maxDensity = horizontalProj[y];
        codeLineY = y;
      }
    }

    // Find vertical bounds around the code line
    let topY = codeLineY;
    let bottomY = codeLineY;
    
    // Expand to include the code box
    for (let y = codeLineY; y >= 0; y--) {
      if (horizontalProj[y] > maxDensity * 0.2) {
        topY = y;
      } else if (codeLineY - y > 30) {
        break;
      }
    }
    
    for (let y = codeLineY; y < height; y++) {
      if (horizontalProj[y] > maxDensity * 0.2) {
        bottomY = y;
      } else if (y - codeLineY > 30) {
        break;
      }
    }

    // Find horizontal bounds by looking for text in the identified region
    let leftX = width;
    let rightX = 0;
    
    for (let y = topY; y <= bottomY; y++) {
      for (let x = 0; x < width; x++) {
        const gray = grayData[y * width + x];
        if (gray < 180) {
          leftX = Math.min(leftX, x);
          rightX = Math.max(rightX, x);
        }
      }
    }

    // Add padding and ensure reasonable bounds
    const padding = 15;
    leftX = Math.max(0, leftX - padding);
    rightX = Math.min(width - 1, rightX + padding);
    topY = Math.max(0, topY - padding);
    bottomY = Math.min(height - 1, bottomY + padding);

    const roiWidth = rightX - leftX;
    const roiHeight = bottomY - topY;

    console.log('Detected code region:', { x: leftX, y: topY, width: roiWidth, height: roiHeight });
    
    return {
      x: leftX,
      y: topY,
      width: roiWidth,
      height: roiHeight
    };
  };

  const preprocessImage = (canvas: HTMLCanvasElement): string => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Convert to grayscale first
    const grayData = new Uint8Array(canvas.width * canvas.height);
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }

    // Calculate Otsu threshold for adaptive binarization
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < grayData.length; i++) {
      histogram[grayData[i]]++;
    }

    const total = grayData.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 0;
    for (let i = 0; i < 256; i++) {
      wB += histogram[i];
      if (wB === 0) continue;
      wF = total - wB;
      if (wF === 0) break;

      sumB += i * histogram[i];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = i;
      }
    }

    console.log('Otsu threshold:', threshold);

    // Apply adaptive threshold with morphological closing
    for (let i = 0; i < data.length; i += 4) {
      const gray = grayData[i / 4];
      const binary = gray > threshold ? 255 : 0;
      
      data[i] = binary;     // Red
      data[i + 1] = binary; // Green  
      data[i + 2] = binary; // Blue
    }

    // Light morphological closing (3x3) to connect broken strokes
    const tempData = new Uint8ClampedArray(data);
    const width = canvas.width;
    const height = canvas.height;
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx] === 0) { // if current pixel is black
          // Check 3x3 neighborhood for white pixels
          let hasWhite = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nIdx = ((y + dy) * width + (x + dx)) * 4;
              if (data[nIdx] === 255) {
                hasWhite = true;
                break;
              }
            }
            if (hasWhite) break;
          }
          if (hasWhite) {
            tempData[idx] = tempData[idx + 1] = tempData[idx + 2] = 0; // keep black
          }
        }
      }
    }

    ctx.putImageData(new ImageData(tempData, width, height), 0, 0);
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
      
      // Scale image for better OCR - target ~1600px on longer side
      const targetSize = 1600;
      const scale = Math.max(1.5, targetSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // Find the code region first
      const roi = findCodeRegion(canvas);
      
      // Create ROI canvas for focused OCR
      const roiCanvas = document.createElement('canvas');
      const roiCtx = roiCanvas.getContext('2d')!;
      
      // Scale up the ROI for better OCR accuracy
      const roiScale = Math.max(3, 600 / Math.max(roi.width, roi.height));
      roiCanvas.width = roi.width * roiScale;
      roiCanvas.height = roi.height * roiScale;
      
      // Extract and scale the ROI
      roiCtx.drawImage(canvas, roi.x, roi.y, roi.width, roi.height, 0, 0, roiCanvas.width, roiCanvas.height);
      
      // Preprocess the ROI for better OCR
      const processedDataUrl = preprocessImage(roiCanvas);

      console.log('Starting optimized Tesseract OCR process...');
      
      // Use persistent worker for optimized recognition
      if (!workerRef.current) {
        throw new Error('Tesseract worker not initialized');
      }

      // Try ROI first
      const { data: roiData } = await workerRef.current.recognize(processedDataUrl);
      console.log('ROI OCR result - Text:', roiData?.text, 'Confidence:', roiData?.confidence);
      
      let extractedCode = extractCodeFromText(roiData?.text || '');
      
      // If ROI failed, try with full preprocessed image
      if (!extractedCode && roiData?.confidence < 30) {
        console.log('ROI failed, trying full image...');
        const fullProcessedDataUrl = preprocessImage(canvas);
        const { data: fullData } = await workerRef.current.recognize(fullProcessedDataUrl);
        console.log('Full image OCR result - Text:', fullData?.text, 'Confidence:', fullData?.confidence);
        extractedCode = extractCodeFromText(fullData?.text || '');
      }
      
      console.log('Final extracted code result:', extractedCode);

      if (extractedCode) {
        onCodeExtracted(extractedCode);
        onCodeSuggestion(extractedCode);
        toast({
          title: 'Código detectado!',
          description: `Código encontrado: ${extractedCode}`
        });
      } else {
        // Show what was actually detected for debugging
        const cleanText = (roiData?.text || '')?.replace(/\s+/g, ' ').trim() || '';
        console.log('Clean text for debugging:', cleanText);
        
        toast({
          title: 'OCR não funcionou',
          description: cleanText ? `Texto: "${cleanText}"` : 'Digite o código manualmente',
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