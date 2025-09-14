interface DevilFruitIconProps {
  size?: number;
  className?: string;
}

export const DevilFruitIcon = ({ size = 80, className = "" }: DevilFruitIconProps) => {
  return (
    <img
      src="https://i.ibb.co/QvHsscQX/file-00000000059c6243beb9f81c792f16d6.png"
      alt="Akuma no Mi"
      width={size}
      height={size}
      className={className}
      style={{ filter: 'drop-shadow(0 0 8px hsl(var(--orange-glow) / 0.8))' }}
    />
  );
};