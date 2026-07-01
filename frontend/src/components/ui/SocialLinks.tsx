import {
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import { defaultPortfolioContent, type SocialLinkItem } from "../../data/portfolioContent";

const socialIcons: Record<string, IconType> = {
  Github: FaGithub,
  Linkedin: FaLinkedinIn,
  Mail: FaEnvelope,
  MessageCircle: FaWhatsapp,
  Globe: FaGlobe,
  Instagram: FaInstagram,
  Twitter: FaXTwitter,
  Youtube: FaYoutube,
};

export default function SocialLinks({ links = defaultPortfolioContent.social.links }: { links?: SocialLinkItem[] }) {
  const iconClass =
    "w-12 h-12 rounded-full border border-(--border) flex items-center justify-center hover:bg-(--bg-card) hover:-translate-y-1 transition-all duration-300";

  return (
    <div className="flex justify-center gap-5 mt-10">
      {links.map((link) => {
        const Icon = socialIcons[link.icon] || FaGlobe;
        return (
          <a
            key={`${link.label}-${link.url}`}
            href={link.url}
            target={link.url.startsWith("http") ? "_blank" : undefined}
            rel={link.url.startsWith("http") ? "noopener noreferrer" : undefined}
            className={iconClass}
            aria-label={link.label}
          >
            <Icon size={22} />
          </a>
        );
      })}
    </div>
  );
}
