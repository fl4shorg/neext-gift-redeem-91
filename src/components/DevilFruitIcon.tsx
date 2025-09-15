import { DEVIL_FRUIT_IMAGE } from '@/lib/config';

interface DevilFruitIconProps {
  size?: number;
  className?: string;
}

export const DevilFruitIcon = ({ size = 80, className = "" }: DevilFruitIconProps) => {
  return (
    <img
      src={DEVIL_FRUIT_IMAGE}
      alt="Akuma no Mi"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px hsl(var(--orange-glow) / 0.8))' }}
    />
  );
};