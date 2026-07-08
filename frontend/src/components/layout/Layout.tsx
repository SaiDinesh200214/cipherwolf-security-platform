import type { ReactNode } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import CursorGlow from "../common/CursorGlow";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text)] overflow-hidden">
      <CursorGlow />
      <Navbar />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
