import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AnimatedSection from "../components/common/AnimatedSection";
import DownloadButton from "../components/ui/DownloadButton";
import SocialLinks from "../components/ui/SocialLinks";
import Counter from "../components/ui/Counter";
import SkillsGrid from "../components/common/SkillsGrid";
import AvatarOrb from "../components/common/AvatarOrb";
import { useToast } from "../components/common/Toast";
import ProjectShowcase from "../components/common/ProjectShowcase";
import { apiRequest } from "../services/api";
import { buildVisitorPayload, getVisitorId } from "../services/visitorTracking";
import { defaultPortfolioContent, type PortfolioContent } from "../data/portfolioContent";

import {
  ChevronDown,
  FileText,
  ShieldHalf,
  Router,
  ServerCog,
  SearchCheck,
  Bug,
  Database,
  Globe,
  Palette,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

function useTypingEffect(words: string[], speed = 100, pause = 1500) {
  const [text, setText] = useState("");
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentWord = words[index % words.length];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text.length < currentWord.length) {
      timeout = setTimeout(() => setText(currentWord.slice(0, text.length + 1)), speed);
    } else if (!deleting && text.length === currentWord.length) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(currentWord.slice(0, text.length - 1)), speed / 2);
    } else if (deleting && text.length === 0) {
      timeout = setTimeout(() => {
        setDeleting(false);
        setIndex((i) => i + 1);
      }, 0);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, index, words, speed, pause]);

  return text;
}


const serviceIcons: Record<string, LucideIcon> = {
  ShieldHalf,
  Router,
  ServerCog,
  SearchCheck,
  Bug,
  Database,
  Globe,
  Palette,
  Bot,
};

function mergePortfolioContent(content: PortfolioContent | null): PortfolioContent {
  if (!content) return defaultPortfolioContent;

  return {
    ...defaultPortfolioContent,
    ...content,
    hero: { ...defaultPortfolioContent.hero, ...content.hero },
    about: { ...defaultPortfolioContent.about, ...content.about },
    work: { ...defaultPortfolioContent.work, ...content.work },
    skills: { ...defaultPortfolioContent.skills, ...content.skills },
    projects: { ...defaultPortfolioContent.projects, ...content.projects },
    services: { ...defaultPortfolioContent.services, ...content.services },
    contact: { ...defaultPortfolioContent.contact, ...content.contact },
    resume: { ...defaultPortfolioContent.resume, ...content.resume },
    media: { ...defaultPortfolioContent.media, ...content.media, library: content.media?.library || defaultPortfolioContent.media.library },
    seo: { ...defaultPortfolioContent.seo, ...content.seo },
    settings: { ...defaultPortfolioContent.settings, ...content.settings },
    social: { ...defaultPortfolioContent.social, ...content.social },
    trash: { ...defaultPortfolioContent.trash, ...content.trash },
  };
}

function usePortfolioContent() {
  const [content, setContent] = useState(defaultPortfolioContent);

  useEffect(() => {
    let active = true;
    apiRequest<{ content: PortfolioContent | null }>("/cms/public")
      .then((data) => {
        if (active) setContent(mergePortfolioContent(data.content));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const applyContent = (value: string | null) => {
      if (!value) return;
      try {
        setContent(mergePortfolioContent(JSON.parse(value) as PortfolioContent));
      } catch {
        // Ignore invalid CMS drafts stored by older builds.
      }
    };
    applyContent(localStorage.getItem("portfolio_cms_content"));
    const channel = "BroadcastChannel" in window ? new BroadcastChannel("portfolio-cms") : null;
    channel?.addEventListener("message", (event: MessageEvent<PortfolioContent>) => {
      setContent(mergePortfolioContent(event.data));
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === "portfolio_cms_content") applyContent(event.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.title = content.seo.title;
    const description = document.querySelector<HTMLMetaElement>("meta[name='description']");
    if (description) description.content = content.seo.description;
  }, [content.seo.description, content.seo.title]);

  return content;
}

function getServiceIcon(icon: string) {
  return serviceIcons[icon] || ShieldHalf;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HOME PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const content = usePortfolioContent();
  const typedText = useTypingEffect(content.hero.roles.length ? content.hero.roles : defaultPortfolioContent.hero.roles);
  const [openJob, setOpenJob] = useState(0);
  const { showToast, updateToast } = useToast();

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════ */}
      <section
        id="home"
        className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center pt-20"
      >
        <div className="w-full max-w-4xl mx-auto">
          <AvatarOrb src={content.media.avatarUrl} alt={content.hero.name} />

          <h1 className="mt-4 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
            {content.hero.name}
          </h1>

          <div className="mt-5 h-10 flex items-center justify-center">
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-(--primary)">
              {typedText}
              <span className="animate-pulse">|</span>
            </p>
          </div>

          <p className="mt-6 max-w-2xl mx-auto text-sm sm:text-base md:text-lg leading-7 sm:leading-8 text-(--text-secondary) px-2">
            {content.hero.intro}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
            {content.hero.techTags.map((tech) => (
              <span
                key={tech}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-(--border) bg-(--bg-card) text-xs sm:text-sm font-medium hover:bg-(--primary) hover:text-white transition"
              >
                {tech}
              </span>
            ))}
          </div>

          <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-3 sm:gap-4">
            <DownloadButton label={content.hero.primaryCta} url={content.resume.url} downloadName={content.resume.downloadName} />
            <a
              href={content.resume.viewUrl || content.resume.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full border border-(--border) text-sm sm:text-base font-semibold hover:bg-(--bg-card) transition"
            >
              <FileText size={18} />
              View Resume
            </a>
            <a
              href="#portfolio"
              className="px-5 sm:px-7 py-2.5 sm:py-3 rounded-full border border-(--border) text-sm sm:text-base font-semibold hover:bg-(--bg-card) transition"
            >
              {content.hero.secondaryCta}
            </a>
          </div>

          <SocialLinks links={content.social.links} />
        </div>
      </section>

      {/* ═══ ABOUT ══════════════════════════════════════════════════════════ */}
      {/*
        FIX: Removed min-h-screen from AnimatedSection — it was causing the
        section to take full viewport height but show nothing on mobile because
        the animated children hadn't triggered yet. Using plain padding instead.
      */}
      <AnimatedSection id="about" className="px-4 sm:px-6 py-16 sm:py-24">
        <div className="w-full max-w-5xl mx-auto">

          {/* Section heading */}
          <motion.h2
            className="text-3xl sm:text-4xl font-bold text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            {content.about.heading}
          </motion.h2>

          <p className="mt-6 max-w-3xl mx-auto text-center text-sm sm:text-base md:text-lg leading-7 sm:leading-8 text-(--text-secondary)">
            {content.about.body}
          </p>

          {/* Expertise cards */}
          <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {content.about.cards.map((card, i) => (
              <motion.div
                key={card.title}
                className="rounded-2xl border border-(--border) bg-(--bg-card) p-5 sm:p-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.4, delay: i * 0.07 }}
              >
                <h3 className="text-base sm:text-lg font-semibold mb-2">
                  {card.emoji} {card.title}
                </h3>
                <p className="text-xs sm:text-sm leading-6 text-(--text-secondary)">{card.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats — 3-col grid so 6 items = 2 clean rows */}
          <div className="mt-14 sm:mt-20 grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {content.about.stats.map((s, index) => (
              <Counter key={s.label} target={s.target} label={s.label} delay={index * 0.07} />
            ))}
          </div>

          {/* Footer info row */}
          <div className="mt-10 sm:mt-14 flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-(--text-secondary)">
            {content.about.info.map((item) => <span key={item}>{item}</span>)}
          </div>

          {/* ── WORK EXPERIENCE ─────────────────────────────────────────── */}
          {content.settings.showWorkExperience && (
          <div className="mt-16 sm:mt-24">
            <motion.h3
              className="text-2xl sm:text-3xl font-bold text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.5 }}
            >
              {content.work.heading}
            </motion.h3>
            <p className="mt-3 text-center text-sm sm:text-base text-(--text-secondary) max-w-2xl mx-auto">
              {content.work.intro}
            </p>

            <div className="mt-8 sm:mt-10 space-y-4">
              {content.work.experiences.map((job, idx) => {
                const isOpen = openJob === idx;
                return (
                <motion.div
                  key={`${job.company}-${job.role}`}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="overflow-hidden rounded-2xl border border-blue-500/30 bg-linear-to-br from-blue-500/10 to-indigo-500/10"
                >
                  {/* Job header */}
                  <button
                    type="button"
                    onClick={() => setOpenJob(isOpen ? -1 : idx)}
                    className="flex w-full flex-col gap-3 p-5 text-left sm:flex-row sm:items-start sm:justify-between sm:p-8"
                    aria-expanded={isOpen}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="text-xs font-semibold tracking-widest uppercase text-(--text-secondary)">
                          {job.type}
                        </span>
                      </div>
                      <h4 className="text-xl sm:text-2xl font-bold text-(--text)">{job.role}</h4>
                      <p className="text-sm sm:text-base font-semibold text-(--primary) mt-1">{job.company}</p>
                      <p className="text-xs sm:text-sm text-(--text-secondary) mt-0.5">{job.location}</p>
                      {job.summary && <p className="mt-3 max-w-2xl text-xs sm:text-sm text-(--text-secondary)">{job.summary}</p>}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-(--border) bg-(--bg-card) px-3 py-1.5 text-xs font-medium text-(--text-secondary) sm:px-4 sm:text-sm">
                      {job.period}
                      <ChevronDown size={16} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>

                  {isOpen && (
                  <div className="px-5 pb-5 sm:px-8 sm:pb-8">
                  {/* KPI cards */}
                  <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    {job.highlights.map((h) => (
                      <div key={h.label} className="rounded-xl border border-(--border) bg-(--bg-card) p-4">
                        <p className="text-2xl sm:text-3xl font-black text-(--primary)">{h.stat}</p>
                        <p className="text-xs font-bold uppercase tracking-wide mt-1 text-(--text)">{h.label}</p>
                        <p className="text-xs text-(--text-secondary) leading-relaxed mt-2">{h.desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Achievements */}
                  <div className="mt-6 sm:mt-8">
                    <p className="text-xs font-bold tracking-widest uppercase text-(--text-secondary) mb-3 sm:mb-4">
                      Key Achievements
                    </p>
                    <ul className="space-y-2.5 sm:space-y-3">
                      {job.achievements.map((ach, i) => (
                        <li key={i} className="flex gap-3 text-xs sm:text-sm text-(--text-secondary) leading-relaxed">
                          <span className="text-(--primary) font-bold shrink-0 mt-0.5">-</span>
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tech tags */}
                  <div className="mt-6 sm:mt-8">
                    <p className="text-xs font-bold tracking-widest uppercase text-(--text-secondary) mb-3">
                      Technologies & Tools
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 sm:px-3 py-1 rounded-full border border-(--border) bg-(--bg-card) text-xs font-medium text-(--text)"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  </div>
                  )}
                </motion.div>
              );
              })}
            </div>
          </div>
          )}
        </div>
      </AnimatedSection>

      {/* ═══ SKILLS ══════════════════════════════════════════════════════════ */}
      {content.settings.showSkills && (
      <AnimatedSection id="skills" className="px-4 sm:px-6 py-16 sm:py-20">
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold tracking-tight text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            {content.skills.heading}
          </motion.h2>
          <p className="mt-4 text-sm sm:text-base text-(--text-secondary) text-center max-w-3xl leading-7">
            {content.skills.intro}
          </p>
          <SkillsGrid skills={content.skills.groups} />
        </div>
      </AnimatedSection>
      )}

      {/* ═══ PORTFOLIO ═══════════════════════════════════════════════════════ */}
      {content.settings.showProjects && (
      <AnimatedSection id="portfolio" className="px-4 sm:px-6 py-16 sm:py-24">
        <ProjectShowcase
          title={content.projects.heading}
          intro={content.projects.intro}
          projects={content.projects.items}
          categories={content.projects.categories}
        />
      </AnimatedSection>
      )}

      {/* ═══ SERVICES ════════════════════════════════════════════════════════ */}
      {content.settings.showServices && (
      <AnimatedSection id="services" className="px-4 sm:px-6 py-16 sm:py-20 text-center">
        <div className="w-full max-w-6xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            {content.services.heading}
          </motion.h2>
          <p className="mt-4 text-sm sm:text-base text-(--text-secondary) max-w-3xl mx-auto">
            {content.services.intro}
          </p>

          <div className="mt-10 sm:mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 text-left">
            {content.services.items.map((service, i) => {
              const Icon = getServiceIcon(service.icon);
              return (
                <motion.div
                  key={service.title}
                  className="group bg-(--bg-card) border border-(--border) rounded-2xl p-5 sm:p-6 hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-(--primary) transition-all duration-300"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                >
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-(--primary)/10 flex items-center justify-center mb-4 sm:mb-5 group-hover:bg-(--primary) transition-all duration-300">
                    <Icon size={22} className="text-(--primary) group-hover:text-white transition-colors duration-300 sm:hidden" />
                    <Icon size={28} className="text-(--primary) group-hover:text-white transition-colors duration-300 hidden sm:block" />
                  </div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold">{service.title}</h3>
                  <p className="mt-2 sm:mt-3 text-xs sm:text-sm leading-6 sm:leading-7 text-(--text-secondary)">{service.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedSection>
      )}

      {/* ═══ CONTACT ═════════════════════════════════════════════════════════ */}
      <AnimatedSection id="contact" className="px-4 sm:px-6 py-16 sm:py-20 text-center">
        <div className="w-full max-w-2xl mx-auto">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5 }}
          >
            {content.contact.heading}
          </motion.h2>
          <p className="mt-4 text-sm sm:text-base text-(--text-secondary) max-w-2xl mx-auto">
            {content.contact.intro}
          </p>

          <form
            className="mt-8 sm:mt-12 flex flex-col gap-4 sm:gap-5 text-left"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem("name") as HTMLInputElement).value;
              const email = (form.elements.namedItem("email") as HTMLInputElement).value;
              const subject = (form.elements.namedItem("subject") as HTMLInputElement).value;
              const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;
              const id = showToast("Sending Message", "Please wait while we send your request...", "loading");
              try {
                await apiRequest("/contact", {
                  method: "POST",
                  body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                    source: "home-contact",
                    visitorId: getVisitorId(),
                    metadata: buildVisitorPayload("contact_submit", { subject }),
                  }),
                });
                updateToast(id, "Message Sent", "Your request has been saved. You'll get a reply within 48h.", "success");
                form.reset();
              } catch (error) {
                updateToast(id, "Send Failed", error instanceof Error ? error.message : "Something went wrong. Please try again.", "error");
              }
            }}
          >
            <input type="text" name="name" placeholder="Your Name" required
              className="w-full bg-(--bg-card) border border-(--border) rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base outline-none focus:border-(--primary) transition" />
            <input type="email" name="email" placeholder="Your Email" required
              className="w-full bg-(--bg-card) border border-(--border) rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base outline-none focus:border-(--primary) transition" />
            <input type="text" name="subject" placeholder="Subject" required
              className="w-full bg-(--bg-card) border border-(--border) rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base outline-none focus:border-(--primary) transition" />
            <textarea name="message" rows={6} placeholder="Write your message..." required
              className="w-full bg-(--bg-card) border border-(--border) rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-sm sm:text-base resize-none outline-none focus:border-(--primary) transition" />
            <div className="flex justify-center mt-1 sm:mt-3">
              <button type="submit" className="eleken-cta">Send Message</button>
            </div>
          </form>

          <div className="mt-10 sm:mt-12">
            <SocialLinks links={content.social.links} />
          </div>

          <div className="mt-8 sm:mt-10 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-(--text-secondary)">
            <span>{content.contact.location}</span>
            <span>{content.contact.email}</span>
            <span>{content.contact.phone}</span>
          </div>
        </div>
      </AnimatedSection>
    </>
  );
}
