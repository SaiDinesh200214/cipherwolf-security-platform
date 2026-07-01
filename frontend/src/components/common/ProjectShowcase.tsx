import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from "lucide-react";
import {
  projects as defaultProjects,
  type ProjectCategory,
  type ProjectItem,
} from "../../data/projects";
import { trackVisitorEvent } from "../../services/visitorTracking";

type VisualMeta = {
  bg: string;
  accent: string;
  line: string;
};

const visualMeta: Record<string, VisualMeta> = {
  network: {
    bg: "bg-[#eaf6f5]",
    accent: "bg-[#1f9d8a]",
    line: "bg-[#1f9d8a]/45",
  },
  soc: {
    bg: "bg-[#f7ece8]",
    accent: "bg-[#dc2626]",
    line: "bg-[#dc2626]/40",
  },
  audit: {
    bg: "bg-[#eaf1ff]",
    accent: "bg-[#0f766e]",
    line: "bg-[#0f766e]/40",
  },
  streaming: {
    bg: "bg-[#f2e7e7]",
    accent: "bg-[#e11d48]",
    line: "bg-[#e11d48]/40",
  },
  donut: {
    bg: "bg-[#f4eee6]",
    accent: "bg-[#8b5cf6]",
    line: "bg-[#8b5cf6]/40",
  },
  traffic: {
    bg: "bg-[#eef7ea]",
    accent: "bg-[#16a34a]",
    line: "bg-[#16a34a]/40",
  },
  cipherwolf: {
    bg: "bg-[#eef3ff]",
    accent: "bg-[#2563eb]",
    line: "bg-[#2563eb]/40",
  },
  socHome: {
    bg: "bg-[#eef7f2]",
    accent: "bg-[#047857]",
    line: "bg-[#047857]/40",
  },
  ratDetection: {
    bg: "bg-[#f4edf8]",
    accent: "bg-[#7c3aed]",
    line: "bg-[#7c3aed]/40",
  },
};

const projectPreviewLines: Record<string, string[]> = {
  network: ["Core OSPF", "VPN Tunnel", "NAT + ACL", "DHCP"],
  soc: ["Kali", "Apache Logs", "UFW Block", "Legit User"],
  audit: ["Discovery", "Ports", "Risk Score", "PDF"],
  streaming: ["Hero", "Cast", "Rating", "CTA"],
  donut: ["Shader", "Lighting", "Camera", "Render"],
  traffic: ["Signals", "Lanes", "Raycasts", "AI"],
  cipherwolf: ["CMS", "SOC", "RBAC", "Analytics"],
  socHome: ["UTM", "Wazuh", "Suricata", "C2"],
  ratDetection: ["RAT", "Sysmon", "Beacon", "Timeline"],
};

interface ProjectShowcaseProps {
  title?: string;
  intro?: string;
  className?: string;
  projects?: ProjectItem[];
  categories?: string[];
}

type FilterValue = "All" | ProjectCategory;

function ProjectThumb({
  project,
  compact = false,
}: {
  project: ProjectItem;
  compact?: boolean;
}) {
  const meta = visualMeta[project.visual] || visualMeta.network;
  const lines = projectPreviewLines[project.visual] || [project.category, project.eyebrow, "Portfolio", "Project"];

  if (project.image) {
    return (
      <div className={`relative overflow-hidden rounded-[1.35rem] bg-black/5 ${compact ? "h-48" : "h-64 sm:h-72"}`}>
        <img
          src={project.image}
          alt={project.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
        <div className="absolute inset-x-5 top-5 flex items-center justify-between">
          <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55 shadow-sm">
            {project.category}
          </span>
          <span className="rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur">
            {project.eyebrow}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[1.35rem] ${meta.bg} p-5 ${compact ? "h-48" : "h-56"}`}>
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <span className="rounded-full bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-black/55 shadow-sm">
          {project.category}
        </span>
        <span className="rounded-full bg-white/65 px-3 py-1 text-[11px] font-semibold text-black/45">
          Preview
        </span>
      </div>

      <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/70 p-4 shadow-xl shadow-black/10 backdrop-blur-xl">
        <div className="grid grid-cols-[1fr_auto] items-end gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black/45">
              {project.eyebrow}
            </p>
            <div className="mt-3 space-y-2">
              {lines.map((line: string, index: number) => (
                <div key={line} className="flex items-center gap-2">
                  <span className={`h-2 rounded-full ${index === 0 ? meta.accent : meta.line} ${index === 0 ? "w-14" : "w-9"}`} />
                  <span className="text-[11px] font-semibold text-black/45">{line}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-black/5 bg-white/75 shadow-sm">
            <span className={`h-8 w-8 rounded-lg ${meta.accent}`} />
          </div>
        </div>
      </div>

      <div className={`absolute -bottom-8 -left-8 h-28 w-28 rounded-full ${meta.accent} opacity-10 blur-xl`} />
      <div className="absolute -right-12 top-14 h-32 w-32 rounded-full bg-white/45 blur-2xl" />
    </div>
  );
}
function ProjectModal({
  project,
  onClose,
}: {
  project: ProjectItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!project) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="fixed inset-0 z-100 flex items-end justify-center bg-black/35 px-3 pb-3 backdrop-blur-xl sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-4xl border border-white/60 bg-white/90 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.22)] backdrop-blur-2xl sm:p-6"
            initial={{ opacity: 0, y: 34, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-(--primary) px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  {project.category}
                </span>
                <span className="rounded-full border border-(--border) bg-white/70 px-3 py-1 text-xs font-semibold text-(--text-secondary)">
                  {project.date}
                </span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/6 text-(--text) transition hover:bg-black/10"
                aria-label="Close project details"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5">
              <ProjectThumb project={project} />

              <div className="mt-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-(--text-secondary)">
                  {project.eyebrow}
                </p>
                <h3
                  id="project-modal-title"
                  className="mx-auto mt-3 max-w-3xl text-2xl font-black leading-tight tracking-tight text-(--text) sm:text-4xl"
                >
                  {project.title}
                </h3>
                <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-(--text-secondary) sm:text-base">
                  {project.description}
                </p>

                <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-2">
                  {project.metrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-2xl border border-(--border) bg-(--bg-card) p-3"
                    >
                      <p className="text-xl font-black text-(--text)">{metric.value}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-(--text-secondary)">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--text-secondary)">
                  Highlights
                </p>
                <div className="mt-3 space-y-2.5">
                  {project.highlights.map((highlight) => (
                    <p key={highlight} className="flex gap-3 text-sm leading-6 text-(--text-secondary)">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-(--primary)" />
                      <span>{highlight}</span>
                    </p>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--text-secondary)">
                  Tools & Techniques
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[...project.tools, ...project.techniques].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-(--border) bg-white/70 px-3 py-1.5 text-xs font-semibold text-(--text-secondary)"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {(project.links?.length ? project.links : [{ label: project.linkLabel, url: project.link }]).map((link) => (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  target={link.url.startsWith("http") ? "_blank" : undefined}
                  rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex min-w-40 items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3.5 text-sm font-bold !text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-[#333333]"
                >
                  <span className="text-white">{link.label}</span>
                  <ArrowUpRight size={16} className="text-white" />
                </a>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ProjectShowcase({
  title = "Projects",
  intro = "A curated look at the cybersecurity, networking, UI, 3D, and simulation work I've built and documented.",
  className = "",
  projects = defaultProjects,
  categories: cmsCategories,
}: ProjectShowcaseProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const categories = useMemo<FilterValue[]>(
    () => ["All", ...Array.from(new Set([...(cmsCategories || []), ...projects.map((project) => project.category)]))],
    [cmsCategories, projects]
  );

  const filteredProjects = useMemo(
    () =>
      activeFilter === "All"
        ? projects
        : projects.filter((project) => project.category === activeFilter),
    [activeFilter, projects]
  );

  useEffect(() => {
    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }, [activeFilter]);

  const selectFilter = (category: FilterValue) => {
    setActiveIndex(0);
    setActiveFilter(category);
  };

  const scrollToIndex = (index: number) => {
    const count = filteredProjects.length;
    if (count === 0) return;

    const nextIndex = (index + count) % count;
    const rail = railRef.current;
    const card = rail?.children[nextIndex] as HTMLElement | undefined;

    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveIndex(nextIndex);
  };

  const openProject = (project: ProjectItem) => {
    trackVisitorEvent("project_click", {
      projectId: project.id,
      projectTitle: project.title,
      projectCategory: project.category,
    });
    setSelectedProject(project);
  };

  const handleRailScroll = () => {
    const rail = railRef.current;
    if (!rail) return;

    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    Array.from(rail.children).forEach((child, index) => {
      const card = child as HTMLElement;
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - railCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActiveIndex(closestIndex);
  };

  return (
    <div className={`w-full max-w-7xl mx-auto text-center ${className}`}>
      <motion.p
        className="text-xs font-bold uppercase tracking-[0.24em] text-(--text-secondary)"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.45 }}
      >
        Featured Work
      </motion.p>
      <motion.h2
        className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5 }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-(--text-secondary) sm:text-base"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, delay: 0.05 }}
      >
        {intro}
      </motion.p>

      <motion.div
        className="relative z-10 mx-auto mt-7 max-w-5xl"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        transition={{ duration: 0.45, delay: 0.08 }}
      >
        <div className="hidden max-w-full items-center gap-2 overflow-x-auto rounded-full bg-black/4 p-2 sm:flex lg:flex-wrap lg:justify-center [-ms-overflow-style:none] scrollbar-none [&::-webkit-scrollbar]:hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-(--text) shadow-sm">
            <Filter size={16} />
          </div>

          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => selectFilter(category)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                activeFilter === category
                  ? "bg-(--primary) text-white shadow-sm"
                  : "bg-white/70 text-(--text-secondary) hover:bg-white hover:text-(--text)"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="relative mx-auto w-full max-w-xs sm:hidden">
          <Filter
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-(--text)"
          />
          <select
            value={activeFilter}
            onChange={(event) => selectFilter(event.target.value as FilterValue)}
            className="h-12 w-full appearance-none rounded-full border border-(--border) bg-white/80 pl-11 pr-11 text-sm font-bold text-(--text) shadow-sm outline-none backdrop-blur"
            aria-label="Filter projects by category"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <ChevronDown
            size={17}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-(--text)"
          />
        </div>
      </motion.div>

      <div className="mt-8 flex items-center justify-end gap-2 sm:mt-10">
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex - 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-(--border) bg-white/75 text-(--text) shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          aria-label="Previous project"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => scrollToIndex(activeIndex + 1)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-(--border) bg-white/75 text-(--text) shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          aria-label="Next project"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div
        ref={railRef}
        onScroll={handleRailScroll}
        className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-5 text-left [-ms-overflow-style:none] scrollbar-none sm:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {filteredProjects.map((project, index) => (
          <motion.article
            key={project.id}
            className="group min-w-[84vw] snap-center overflow-hidden rounded-[1.55rem] border border-(--border) bg-white/55 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.06)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/75 hover:shadow-[0_28px_70px_rgba(0,0,0,0.1)] sm:min-w-95 lg:min-w-102.5"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-30px" }}
            transition={{ duration: 0.45, delay: index * 0.04 }}
          >
            <ProjectThumb project={project} compact />

            <div className="p-4">
              <h3 className="text-xl font-black leading-tight tracking-tight text-(--text)">
                {project.title}
              </h3>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-(--text-secondary)">
                {project.summary}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {project.techniques.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-(--border) bg-(--bg-card) px-3 py-1 text-xs font-medium text-(--text-secondary)"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openProject(project)}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-(--primary) px-5 py-3 text-sm font-bold text-white transition group-hover:bg-(--primary-light)"
              >
                View More
                <ArrowUpRight size={16} />
              </button>
            </div>
          </motion.article>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2 rounded-full">
        {filteredProjects.map((project, index) => (
          <button
            key={project.id}
            type="button"
            onClick={() => scrollToIndex(index)}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index ? "w-12 bg-(--primary)" : "w-2 bg-black/30 hover:bg-black/50"
            }`}
            aria-label={`Open ${project.shortTitle}`}
            aria-current={activeIndex === index ? "true" : undefined}
          />
        ))}
      </div>

      <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
    </div>
  );
}
