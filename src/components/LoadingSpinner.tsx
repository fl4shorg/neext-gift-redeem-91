interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export const LoadingSpinner = ({ size = 'medium', className = "" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    small: 'spinner-small',
    medium: 'spinner',
    large: 'w-8 h-8 border-4'
  };

  return (
    <div 
      className={`${sizeClasses[size]} inline-block ${className}`}
      role="status"
      aria-label="Carregando..."
    >
      <span className="sr-only">Carregando...</span>
    </div>
  );
};