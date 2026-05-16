import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ children, className, title, description }: CardProps) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-2xl p-6 shadow-sm", className)}>
      {(title || description) && (
        <div className="mb-6">
          {title && <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Button({ 
  children, 
  className, 
  variant = 'primary', 
  onClick,
  disabled,
  type = 'button'
}: { 
  children: ReactNode; 
  className?: string; 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}) {
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200",
    outline: "bg-transparent border border-gray-200 text-gray-900 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
}
