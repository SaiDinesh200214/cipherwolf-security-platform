import type { ButtonHTMLAttributes, ReactNode } from "react";

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export default function GlassButton({ children, className = "", ...props }: GlassButtonProps) {
  return (
    <button className={`glass-button ${className}`} {...props}>
      {children}
    </button>
  );
}