import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BillForge Logo"
      {...props}
    >
      <rect width="100" height="100" rx="20" fill="hsl(var(--primary))" />
      <path
        d="M30 75V25L50 35V85L30 75Z"
        fill="hsl(var(--primary-foreground))"
        fillOpacity="0.7"
      />
      <path
        d="M70 75V25L50 35V85L70 75Z"
        fill="hsl(var(--primary-foreground))"
      />
    </svg>
  );
}
