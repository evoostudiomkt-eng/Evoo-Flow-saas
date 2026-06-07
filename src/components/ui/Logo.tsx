import React, { useState } from 'react';
import { cn } from '../../lib/utils';
// @ts-ignore
import logoEvooFlow from './logo_evooflow.png';

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
    sm: { icon: 'h-8 w-auto', text: 'text-lg', gap: 'space-y-1' },
    md: { icon: 'h-14 w-auto', text: 'text-xl', gap: 'space-y-2' },
    lg: { icon: 'h-24 w-auto', text: 'text-3xl', gap: 'space-y-2' },
    xl: { icon: 'h-36 w-auto', text: 'text-5xl', gap: 'space-y-3' },
  };

  const currentSize = sizes[size];
  
  // Resilient multi-tiered image status management using local static asset as default
  const [imgSrc, setImgSrc] = useState(logoEvooFlow);
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);

  const handleError = () => {
    // If local asset somehow fails, attempt Google Drive as backup, then SVG
    if (imgSrc === logoEvooFlow) {
      setImgSrc("https://lh3.googleusercontent.com/d/1T7HgKvVVlT2Nr3eJsxTLfIZIgZRIuFOJ");
    } else if (imgSrc === "https://lh3.googleusercontent.com/d/1T7HgKvVVlT2Nr3eJsxTLfIZIgZRIuFOJ") {
      setImgSrc("https://drive.google.com/thumbnail?id=1T7HgKvVVlT2Nr3eJsxTLfIZIgZRIuFOJ&sz=w500");
    } else {
      setUseFallbackSvg(true);
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center group", 
      size === 'xl' ? "flex-col text-center" : "flex-row",
      className
    )}>
      <div className={cn("relative flex-shrink-0 flex items-center justify-center", currentSize.icon)}>
        {useFallbackSvg ? (
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={cn(
              "w-full h-full text-blue-600 transition-transform duration-500 group-hover:scale-105", 
              variant === 'white' ? "text-white" : "text-blue-600"
            )}
          >
            <g className={variant === 'white' ? "opacity-95" : "opacity-90"}>
              {/* Petal 1 (Top) */}
              <path d="M50 15C50 15 58 35 50 48C42 35 50 15 50 15Z" fill="currentColor" opacity="0.95" />
              {/* Petal 2 (Right Top) */}
              <path d="M81 38C81 38 60 41 51 51C59 61 81 38 81 38Z" fill="currentColor" opacity="0.85" />
              {/* Petal 3 (Right Bottom) */}
              <path d="M69 75C69 75 53 61 49 50C58 48 69 75 69 75Z" fill="currentColor" opacity="0.75" />
              {/* Petal 4 (Left Bottom) */}
              <path d="M31 75C31 75 47 61 51 50C42 48 31 75 31 75Z" fill="currentColor" opacity="0.75" />
              {/* Petal 5 (Left Top) */}
              <path d="M19 38C19 38 40 41 49 51C41 61 19 38 19 38Z" fill="currentColor" opacity="0.85" />
              {/* Center Blossom Core */}
              <circle cx="50" cy="50" r="8" fill="currentColor" className={variant === 'white' ? "text-indigo-950" : "text-white"} />
              <circle cx="50" cy="50" r="4" fill="currentColor" />
            </g>
          </svg>
        ) : (
          <img 
            src={imgSrc} 
            alt="Evoo Flow Logo" 
            className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={handleError}
          />
        )}
      </div>

      {showText && (
        <div className={cn("hidden leading-none ml-4", size === 'xl' && "ml-0 mt-4")}>
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
