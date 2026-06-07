import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'white';
}

export default function Logo({ 
  className, 
  size = 'md', 
  showText = false,
  variant = 'dark'
}: LogoProps) {
  const sizes = {
    sm: { icon: 'h-8 max-w-[130px]', text: 'text-lg' },
    md: { icon: 'h-10 max-w-[160px]', text: 'text-xl' },
    lg: { icon: 'h-16 max-w-[220px]', text: 'text-3xl' },
    xl: { icon: 'h-24 max-w-[300px]', text: 'text-5xl' },
  };

  const currentSize = sizes[size];
  const [loadError, setLoadError] = useState(false);

  return (
    <div className={cn(
      "inline-flex items-center justify-center group overflow-hidden", 
      size === 'xl' ? "flex-col text-center" : "flex-row",
      className
    )}>
      {!loadError ? (
        <img 
          src="/logo_evooflow.png" 
          alt="Evoo Flow Logo" 
          className={cn(
            "object-contain transition-all duration-300 group-hover:scale-102 max-w-full",
            currentSize.icon
          )}
          referrerPolicy="no-referrer"
          onError={() => setLoadError(true)}
        />
      ) : (
        <div className="flex items-center py-2 px-3 bg-gray-50/50 rounded-lg border border-gray-100">
          <h1 className={cn(
            "font-black tracking-tighter uppercase font-sans", 
            currentSize.text,
            variant === 'white' ? "text-white" : "text-blue-600"
          )}>
            Evoo<span className={variant === 'white' ? "text-blue-200" : "text-zinc-900"}>Flow</span>
          </h1>
        </div>
      )}
    </div>
  );
}
