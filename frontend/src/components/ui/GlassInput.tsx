import type { InputHTMLAttributes } from "react";

export default function GlassInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="glass-input" {...props} />;
}