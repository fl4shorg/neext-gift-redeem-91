import { useState, useEffect } from 'react';

interface DevilFruitIconProps {
  size?: number;
  className?: string;
}

export const DevilFruitIcon = ({ size = 80, className = "" }: DevilFruitIconProps) => {
  const [imageSrc, setImageSrc] = useState<string>('');

  useEffect(() => {
    const loadImage = async () => {
      const { DEVIL_FRUIT_IMAGE } = await import('@/lib/config');
      setImageSrc(DEVIL_FRUIT_IMAGE);
    };
    loadImage();
  }, []);

  return (
    <img
      src={imageSrc}
      alt="Akuma no Mi"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px hsl(var(--orange-glow) / 0.8))' }}
    />
  );
};