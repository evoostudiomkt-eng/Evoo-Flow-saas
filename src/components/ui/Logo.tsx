import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'light' | 'dark' | 'white' | string;
  style?: React.CSSProperties;
}

export default function Logo({ 
  className, 
  size = 'md',
  showText,
  variant,
  style
}: LogoProps) {
  const sizes = {
    sm: { icon: 'h-8 max-w-[130px]' },
    md: { icon: 'h-10 max-w-[160px]' },
    lg: { icon: 'h-16 w-full' },
    xl: { icon: 'h-24 w-full' },
  };

  const currentSize = sizes[size];
  const [loadError, setLoadError] = useState(false);

  // Use the ultra-reliable direct Google Drive image link primarily, with local file as fallback
  const logoSrc = loadError 
    ? "/logo_evooflow.png" 
    : "https://lh3.googleusercontent.com/d/1DaRoT5ecWvebVrZ61GSDMMil4GuZ4X1A";

  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center group overflow-hidden bg-transparent m-0 p-0 border-0 outline-none select-none", 
        className
      )}
      style={style}
    >
      <img 
        src={logoSrc} 
        alt="Evoo Flow Logo" 
        className={cn(
          "object-contain transition-all duration-300 group-hover:scale-101 block p-0 m-0 border-0 outline-none",
          currentSize.icon
        )}
        style={{ objectFit: 'contain' }}
        referrerPolicy="no-referrer"
        onError={() => {
          if (!loadError) {
            setLoadError(true);
          }
        }}
      />
    </div>
  );
}

