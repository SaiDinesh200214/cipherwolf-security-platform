import { useState } from "react";
import {
  ChevronDown,
  Shield,
  Network,
  Code2,
  Palette,
  Gamepad2,
  Box,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { defaultPortfolioContent, type SkillGroup } from "../../data/portfolioContent";

const skillIcons: Record<string, LucideIcon> = {
  Shield,
  Network,
  Code2,
  Palette,
  Gamepad2,
  Box,
};

export default function SkillsGrid({ skills = defaultPortfolioContent.skills.groups }: { skills?: SkillGroup[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="w-full max-w-6xl mt-14 space-y-5">
      {skills.map((skill, index) => {
        const Icon = skillIcons[skill.icon] || Shield;

        return (
          <div
            key={skill.title}
            className="rounded-2xl border border-(--border) bg-(--bg-card) overflow-hidden transition-all duration-300"
          >
            <button
              onClick={() => setOpen(open === index ? null : index)}
              className="w-full flex justify-between items-center p-6 text-left hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl border border-(--border)">
                  <Icon size={22} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold">
                    {skill.title}
                  </h3>

                  <p className="text-sm text-(--text-secondary)">
                    {skill.subtitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-(--text-secondary)">
                  {skill.tools.length} Skills
                </span>

                <ChevronDown
                  className={`transition-transform duration-300 ${
                    open === index ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            <div
              className={`overflow-hidden transition-all duration-500 ${
                open === index
                  ? "max-h-[500px] p-6 pt-0"
                  : "max-h-0"
              }`}
            >
              <div className="flex flex-wrap gap-3">
                {skill.tools.map((tool) => (
                  <span
                    key={tool}
                    className="px-4 py-2 rounded-full border border-(--border) bg-(--bg-card) text-sm hover:bg-(--primary) hover:text-white transition"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
