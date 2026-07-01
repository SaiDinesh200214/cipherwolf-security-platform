import { useEffect, useRef, useState } from "react";

/**
 * CursorGlow — toukoum-style spotlight radial glow that follows the mouse.
 * Drop this into Layout.tsx, it just works.
 * Opacity bumped: 0.08→0.18 inner, 0.04→0.10 mid for a more visible glow.
 */
export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: -9999, y: -9999 });
  const current = useRef({ x: -9999, y: -9999 });
  const rafRef = useRef<number>(0);
  const [enabled, setEnabled] = useState(() => window.matchMedia("(pointer: fine)").matches);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");

    const onChange = () => setEnabled(media.matches);
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const tick = () => {
      current.current.x = lerp(current.current.x, pos.current.x, 0.08);
      current.current.y = lerp(current.current.y, pos.current.y, 0.08);

      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(
          700px circle at ${current.current.x}px ${current.current.y}px,
          rgba(99, 102, 241, 0.18) 0%,
          rgba(139, 92, 246, 0.10) 30%,
          rgba(99, 102, 241, 0.03) 60%,
          transparent 75%
        )`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed inset-0 transition-opacity duration-300"
      style={{
        zIndex: 0,
        opacity: 0.45,
      }}
      aria-hidden="true"
    />
  );
}
