interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

export function Logo({ className = '', size = 'md' }: LogoProps) {
  return (
    <div className={`${sizeClasses[size]} ${className} flex items-center justify-center rounded-md bg-primary text-primary-foreground`}>
      <span className="font-bold text-lg">B</span>
    </div>
  );
}
