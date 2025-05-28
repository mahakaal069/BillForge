import type { SVGProps } from 'react';

type AppLogoProps = SVGProps<SVGSVGElement> & {
  showText?: boolean;
};

export function AppLogo({ showText = false, ...props }: AppLogoProps) {
  return (
    <div className="flex items-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Invoice DOS Logo"
        {...props}
      >
        {/* Document shape */}
        <rect x="15" y="20" width="70" height="60" rx="6" fill="hsl(var(--primary))" />
        
        {/* Folded corner */}
        <path d="M75 35L85 25V35H75Z" fill="hsl(var(--primary))" fillOpacity="0.8" />
        
        {/* Horizontal lines */}
        <line x1="25" y1="40" x2="75" y2="40" stroke="hsl(var(--primary-foreground))" strokeWidth="2" />
        <line x1="25" y1="50" x2="65" y2="50" stroke="hsl(var(--primary-foreground))" strokeWidth="2" />
        <line x1="25" y1="60" x2="60" y2="60" stroke="hsl(var(--primary-foreground))" strokeWidth="2" />
        
        {/* DS Initials */}
        <path 
          d="M35 70H25V30H35C40 30 45 35 45 40C45 45 40 50 35 50H30V55H35C40 55 45 50 45 45" 
          stroke="hsl(var(--primary-foreground))" 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path 
          d="M55 70H65V30H55C50 30 45 35 45 40C45 45 50 50 55 50H60V45H55C53.5 45 52.5 44 52.5 42.5C52.5 41 53.5 40 55 40H65" 
          stroke="hsl(var(--primary-foreground))" 
          strokeWidth="6" 
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      
      {showText && (
        <span className="ml-3 text-2xl font-bold text-foreground">
          Invoice DS
        </span>
      )}
    </div>
  );
}
