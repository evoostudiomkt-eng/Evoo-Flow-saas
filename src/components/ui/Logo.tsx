import React from 'react';
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
    sm: { icon: 'h-6 w-auto', text: 'text-lg', gap: 'space-y-1' },
    md: { icon: 'h-12 w-auto', text: 'text-xl', gap: 'space-y-2' },
    lg: { icon: 'h-20 w-auto', text: 'text-3xl', gap: 'space-y-2' },
    xl: { icon: 'h-32 w-auto', text: 'text-5xl', gap: 'space-y-3' },
  };

  const currentSize = sizes[size];
  const logoUrl = "https://lh3.googleusercontent.com/d/1T7HgKvVVlT2Nr3eJsxTLfIZIgZRIuFOJ";

  return (
    <div className={cn(
      "inline-flex items-center group", 
      size === 'xl' ? "flex-col text-center" : "flex-row",
      className
    )}>
      <div className={cn("relative flex-shrink-0 flex items-center justify-center", currentSize.icon)}>
        <img 
          src={logoUrl} 
          alt="Evoo Flow Logo" 
          className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className={cn("flex flex-col leading-none ml-4", size === 'xl' && "ml-0 mt-4")}>
          <h1 className={cn(
            "font-black tracking-tighter uppercase", 
            currentSize.text,
            variant === 'white' ? "text-white" : "text-gray-900"
          )}>
            Evoo<span className={variant === 'white' ? "text-blue-200" : "text-blue-600"}>Flow</span>
          </h1>
        </div>
      )}
    </div>
  );
}
