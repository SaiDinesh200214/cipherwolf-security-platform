import { useRef, useState } from "react";
import { motion } from "framer-motion";

export default function AvatarOrb({ src = "/avatar.webp", alt = "Portfolio avatar" }: { src?: string; alt?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) / 12;
    const y = (e.clientY - centerY) / 12;
    setOffset({ x, y });
  };

  const handleMouseLeave = () => {
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto flex items-center justify-center"
    >
      {/* Animated rainbow blob background */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, #ff9a9e, #fad0c4, #fbc2eb, #a18cd1, #84fab0, #8fd3f4, #ff9a9e)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Parallax-following inner glow */}
      <motion.div
        className="absolute inset-2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.5), transparent 60%)",
        }}
        animate={{ x: offset.x, y: offset.y }}
        transition={{ type: "spring", stiffness: 80, damping: 12 }}
      />

      {/* Avatar circle */}
      <motion.div
        className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-(--bg-primary) border-4 border-white shadow-2xl flex items-center justify-center overflow-hidden"
        animate={{ x: offset.x * 0.6, y: offset.y * 0.6 }}
        transition={{ type: "spring", stiffness: 100, damping: 14 }}
      >
        {/* Replace with your own photo/avatar image */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </motion.div>
    </div>
  );
}
