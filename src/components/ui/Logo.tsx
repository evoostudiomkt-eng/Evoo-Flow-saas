import React, { useState } from 'react';
import { cn } from '../../lib/utils';

const logoEvooFlow = '/logo_evooflow.png';

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
    sm: { icon: 'h-12 w-auto', text: 'text-xl' },
    md: { icon: 'h-20 w-auto', text: 'text-2xl' },
    lg: { icon: 'h-32 w-auto', text: 'text-4xl' },
    xl: { icon: 'h-48 w-auto', text: 'text-6xl' },
  };

  const currentSize = sizes[size];
  
  // Resilient multi-tiered image status management using local static asset as default
  const [imgSrc, setImgSrc] = useState(logoEvooFlow);
  const [useFallbackSvg, setUseFallbackSvg] = useState(false);

  const handleError = () => {
    // If local asset somehow fails, attempt Google Drive as backup, then SVG
    if (imgSrc === logoEvooFlow) {
      setImgSrc("https://lh3.googleusercontent.com/d/1DaRoT5ecWvebVrZ61GSDMMil4GuZ4X1A");
    } else if (imgSrc === "https://lh3.googleusercontent.com/d/1DaRoT5ecWvebVrZ61GSDMMil4GuZ4X1A") {
      setImgSrc("https://drive.google.com/thumbnail?id=1DaRoT5ecWvebVrZ61GSDMMil4GuZ4X1A&sz=w500");
    } else {
      setUseFallbackSvg(true);
    }
  };

  return (
    <div className={cn(
      "inline-flex items-center justify-center group overflow-visible", 
      size === 'xl' ? "flex-col text-center" : "flex-row",
      className
    )}>
      {useFallbackSvg ? (
        <div className={cn("relative flex-shrink-0 flex items-center justify-center overflow-visible", currentSize.icon)}>
          <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-full h-full text-blue-600 transition-transform duration-500 group-hover:scale-105"
          >
            <g className="opacity-90">
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
              <circle cx="50" cy="50" r="8" fill="currentColor" className="text-white" />
              <circle cx="50" cy="50" r="4" fill="currentColor" />
            </g>
          </svg>
        </div>
      ) : (
        <img 
          src={imgSrc} 
          alt="Evoo Flow Logo" 
          className={cn(
            "object-contain transition-transform duration-500 group-hover:scale-[1.45] mix-blend-multiply scale-[1.35] origin-center",
            currentSize.icon
          )}
          referrerPolicy="no-referrer"
          onError={handleError}
        />
      )}

      {showText && useFallbackSvg && (
        <div className={cn("flex leading-none ml-4", size === 'xl' && "ml-0 mt-4")}>
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
