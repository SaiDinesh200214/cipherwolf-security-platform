import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const navLinks = [
  { name: "Home", id: "home" },
  { name: "About", id: "about" },
  { name: "Skills", id: "skills" },
  { name: "Portfolio", id: "portfolio" },
  { name: "Services", id: "services" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");
  const [brandClicks, setBrandClicks] = useState(0);

  useEffect(() => {
    const sections = navLinks
      .map((link) => document.getElementById(link.id))
      .filter(Boolean) as HTMLElement[];
    const contactSection = document.getElementById("contact");

    if (contactSection) sections.push(contactSection);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
    }
    setMenuOpen(false);
  };

  const handleBrandClick = () => {
    const nextClicks = brandClicks + 1;
    setBrandClicks(nextClicks);

    if (nextClicks >= 5) {
      setBrandClicks(0);
      navigate("/login");
      return;
    }

    scrollTo("home");
    window.setTimeout(() => {
      setBrandClicks((current) => (current === nextClicks ? 0 : current));
    }, 1400);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-(--bg-primary) border-b border-(--border)">
      <nav className="eleken-nav">
        <button
          onClick={handleBrandClick}
          className="nav-brand text-lg font-bold tracking-tight bg-transparent border-none cursor-pointer select-none shrink-0"
          aria-label="SaiDinesh.dev home"
        >
          SaiDinesh<span className="text-(--text-secondary)">.dev</span>
        </button>

        <div className="eleken-nav-links hidden lg:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`eleken-nav-link bg-transparent border-none cursor-pointer ${
                activeId === link.id ? "active" : ""
              }`}
            >
              {link.name}
            </button>
          ))}
        </div>

        <div className="nav-actions flex items-center gap-4">
          <button onClick={() => scrollTo("contact")} className="eleken-cta nav-hire">
            Hire Me
          </button>

          <button
            className="flex lg:hidden hamburger-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className={`hamburger-line ${menuOpen ? "line-1-open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "line-2-open" : ""}`} />
            <span className={`hamburger-line ${menuOpen ? "line-3-open" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile bottom sheet */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />

        <div
          className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-(--border) rounded-t-3xl shadow-2xl pt-3 pb-8 px-4 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            menuOpen ? "translate-y-0" : "translate-y-full"
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="w-10 h-1.5 bg-(--border) rounded-full mx-auto mb-4" />

          {navLinks.map((link, index) => (
            <button
              key={link.id}
              onClick={() => scrollTo(link.id)}
              className={`block w-full text-left px-5 py-5 rounded-2xl text-(--text) text-lg font-medium transition-all duration-300 hover:bg-(--bg-primary) ${
                activeId === link.id ? "bg-(--bg-primary) font-bold" : ""
              } ${menuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
              style={{ transitionDelay: menuOpen ? `${index * 50}ms` : "0ms" }}
            >
              {link.name}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
