import { projects as defaultProjects, type ProjectItem } from "./projects";

export interface PortfolioStat {
  target: string;
  label: string;
}

export interface AboutCard {
  emoji: string;
  title: string;
  desc: string;
}

export interface WorkHighlight {
  stat: string;
  label: string;
  desc: string;
}

export interface WorkExperience {
  role: string;
  company: string;
  location: string;
  period: string;
  type: string;
  summary: string;
  highlights: WorkHighlight[];
  achievements: string[];
  skills: string[];
}

export interface ServiceItem {
  title: string;
  icon: string;
  desc: string;
}

export interface SkillGroup {
  title: string;
  subtitle: string;
  icon: string;
  tools: string[];
}

export interface SocialLinkItem {
  label: string;
  icon: string;
  url: string;
}

export interface MediaLibraryItem {
  id: string;
  label: string;
  url: string;
  type: "image" | "document";
  createdAt: string;
}

export type CmsTrashType = "skill" | "project" | "work" | "service" | "social";

export interface CmsTrashItem {
  id: string;
  type: CmsTrashType;
  label: string;
  deletedAt: string;
  item: SkillGroup | ProjectItem | WorkExperience | ServiceItem | SocialLinkItem;
}

export interface PortfolioContent {
  hero: {
    name: string;
    roles: string[];
    intro: string;
    techTags: string[];
    primaryCta: string;
    secondaryCta: string;
  };
  about: {
    heading: string;
    body: string;
    cards: AboutCard[];
    stats: PortfolioStat[];
    info: string[];
  };
  work: {
    heading: string;
    intro: string;
    experiences: WorkExperience[];
  };
  skills: {
    heading: string;
    intro: string;
    groups: SkillGroup[];
  };
  projects: {
    heading: string;
    intro: string;
    categories: string[];
    items: ProjectItem[];
  };
  services: {
    heading: string;
    intro: string;
    items: ServiceItem[];
  };
  contact: {
    heading: string;
    intro: string;
    location: string;
    email: string;
    phone: string;
  };
  resume: {
    downloadName: string;
    url: string;
    viewUrl: string;
  };
  media: {
    avatarUrl: string;
    library: MediaLibraryItem[];
  };
  seo: {
    title: string;
    description: string;
  };
  settings: {
    showWorkExperience: boolean;
    showServices: boolean;
    showProjects: boolean;
    showSkills: boolean;
  };
  social: {
    links: SocialLinkItem[];
  };
  trash: {
    items: CmsTrashItem[];
  };
}

export const defaultPortfolioContent: PortfolioContent = {
  hero: {
    name: "Sai Dinesh Andekar",
    roles: [
      "Cybersecurity Analyst",
      "SOC Analyst",
      "Network Infrastructure Engineer",
      "Penetration Tester",
      "Active Directory Administrator",
    ],
    intro:
      "Cybersecurity & Network Infrastructure Engineer with hands-on experience in enterprise networking, SOC operations, penetration testing, and security monitoring. Passionate about building secure infrastructures and defending organizations against evolving cyber threats.",
    techTags: ["Wazuh", "Suricata", "Wireshark", "Kali Linux", "Active Directory", "Windows Server", "UniFi", "Python", "PowerShell"],
    primaryCta: "Download Resume",
    secondaryCta: "View Projects",
  },
  about: {
    heading: "About Me",
    body:
      "I'm Sai Dinesh Andekar, a Computer Science Engineering graduate from Chandigarh University with hands-on experience in Cybersecurity, Enterprise Networking, Security Operations (SOC), Network Security, and Penetration Testing. Through enterprise deployments, Active Directory labs, and self-built SOC environments, I focus on designing secure infrastructures, monitoring enterprise networks, detecting threats, and strengthening organizational cybersecurity.",
    cards: [
      {
        emoji: "Shield",
        title: "SOC Operations",
        desc: "Wazuh SIEM, Suricata IDS, Sysmon, Wireshark, log analysis, alert triage, incident response and threat detection.",
      },
      {
        emoji: "Network",
        title: "Enterprise Networking",
        desc: "UniFi enterprise deployments, VLAN architecture, routing & switching, firewall configuration, Synology NAS, structured cabling, wireless heat mapping, and CCTV infrastructure.",
      },
      {
        emoji: "Target",
        title: "Offensive Security",
        desc: "Vulnerability assessment, reconnaissance, penetration testing, exploit validation, traffic analysis, security remediation, and attack simulation in enterprise lab environments.",
      },
      {
        emoji: "Learning",
        title: "Continuous Learning",
        desc: "Expanding expertise through enterprise deployments, Active Directory labs, SOC simulations, security research, certifications, and hands-on projects.",
      },
    ],
    stats: [
      { target: "9+", label: "Enterprise Deployments" },
      { target: "6+", label: "Security Projects" },
      { target: "12+", label: "Wireless Heat Maps" },
      { target: "12+", label: "CCTV Deployments" },
      { target: "20+", label: "Vulnerabilities Assessed" },
      { target: "1000+", label: "Practical Learning Hours" },
    ],
    info: ["Hyderabad, Telangana, India", "B.E. Computer Science Engineering", "Chandigarh University", "Open to Full-Time Opportunities"],
  },
  work: {
    heading: "Work Experience",
    intro: "Enterprise field engineering across live corporate, commercial, and residential client environments.",
    experiences: [
      {
        role: "Network & IT Infrastructure Engineer",
        company: "Rajguru Distributors",
        location: "Hyderabad, Telangana",
        period: "April 2026 - May 2026",
        type: "Full-Stack Field Engineering",
        summary: "End-to-end enterprise network builds across corporate offices, commercial sites, and residential properties.",
        highlights: [
          {
            stat: "9",
            label: "Live Client Deployments",
            desc: "End-to-end enterprise network builds across corporate offices, commercial sites, and residential properties, from factory-reset hardware through client handover.",
          },
          {
            stat: "12+",
            label: "CCTV Cameras Commissioned",
            desc: "Deployed UniFi Protect G5 Dome & G6 Bullet cameras with AI motion zones, vehicle detection, number-plate recognition, and alerts.",
          },
          {
            stat: "12+",
            label: "Wireless Heat Maps Delivered",
            desc: "Created enterprise wireless coverage plans using UniFi Design Center with floor-plan, wall attenuation, and density planning.",
          },
        ],
        achievements: [
          "Designed and deployed multi-VLAN segmented networks at GHR Construction, Thota Associations, and Energytec.ai.",
          "Led first fully independent client site visit at Saingroup, Uppal without senior supervision.",
          "Resolved a live aggregation switch uplink failure using layer-by-layer fault isolation.",
          "Executed a legacy EdgeRouter-to-UCG migration with AP re-adoption and SSID reconfiguration.",
          "Deployed Synology NAS at two enterprise client sites with RAID, users, SMB mapping, and Microsoft 365 backup.",
          "Executed full Cat6 cabling upgrades with RJ45 crimping, patch-panel punch-down, Fluke testing, and rack dressing.",
          "Produced professional client handover packages with inventories, topology diagrams, VLAN summaries, and test records.",
        ],
        skills: [
          "Ubiquiti UniFi",
          "UniFi Protect",
          "Synology DSM",
          "VLAN Design",
          "Structured Cabling",
          "Cat6 / RJ45",
          "Fluke Cable Testing",
          "Rack Management",
          "802.11r Roaming",
          "WPA3",
          "Inter-VLAN Firewall",
          "AnyDesk Remote Support",
        ],
      },
    ],
  },
  skills: {
    heading: "Skills",
    intro:
      "A comprehensive collection of technologies, platforms, and tools I've used across Cybersecurity, Enterprise Networking, Active Directory, Infrastructure Management, Programming, UI/UX Design, Web Development, Game Development, 3D Modeling, and Data Visualization.",
    groups: [
      {
        title: "Cybersecurity",
        subtitle: "Secure • Monitor • Defend",
        icon: "Shield",
        tools: [
          "Wazuh SIEM",
          "Suricata IDS/IPS",
          "Wireshark",
          "Sysmon",
          "Kali Linux",
          "Metasploit Framework",
          "Nmap",
          "Burp Suite",
          "Nessus Essentials",
          "OWASP Top 10",
          "Threat Hunting",
          "Threat Detection",
          "Incident Response",
          "Alert Triage",
          "Log Analysis",
          "Vulnerability Assessment",
          "Penetration Testing",
        ],
      },
      {
        title: "Networking & Infrastructure",
        subtitle: "Enterprise Networks",
        icon: "Network",
        tools: [
          "Ubiquiti UniFi",
          "Cisco Networking",
          "Windows Server",
          "Ubuntu Server",
          "Synology NAS",
          "VLAN Design",
          "Routing & Switching",
          "DHCP",
          "DNS",
          "VPN",
          "Firewall Configuration",
          "Structured Cabling",
          "Wireless Heat Mapping",
          "CCTV Deployment",
          "Network Troubleshooting",
        ],
      },
      {
        title: "Enterprise Infrastructure",
        subtitle: "Windows Server & Active Directory",
        icon: "Network",
        tools: [
          "Windows Server 2022",
          "Active Directory",
          "Group Policy (GPO)",
          "Active Directory Users & Computers",
          "Organizational Units (OU)",
          "Domain Controller",
          "DNS Server",
          "DHCP Server",
          "User & Group Management",
          "Hyper-V",
          "UTM Virtualization",
          "Windows 11",
          "Ubuntu",
          "Kali Linux",
          "Metasploitable 2",
          "Synology NAS",
        ],
      },
      {
        title: "Programming & Automation",
        subtitle: "Automation • Development",
        icon: "Code2",
        tools: ["Python", "PowerShell", "Bash", "JavaScript", "TypeScript", "React", "Tailwind CSS", "HTML5", "CSS3", "Git", "GitHub", "REST APIs", "VS Code"],
      },
      {
        title: "UI / UX & Web Design",
        subtitle: "Design • Prototype • Build",
        icon: "Palette",
        tools: ["Figma", "Canva", "Website Design", "UI Design", "UX Design", "Wireframing", "Interactive Prototyping", "Responsive Design", "Design Systems", "User Flow Design"],
      },
      {
        title: "Game Development",
        subtitle: "Unity & Unreal",
        icon: "Gamepad2",
        tools: ["Unity 3D", "Unreal Engine 5", "C#", "Game Design", "Level Design", "Physics System", "AR Foundation"],
      },
      {
        title: "3D Modeling",
        subtitle: "Assets • Animation • Rendering",
        icon: "Box",
        tools: ["Blender", "Autodesk Maya", "Unreal Engine", "3D Asset Creation", "3D Animation", "Lighting", "Texturing", "Rendering", "UV Mapping"],
      },
      {
        title: "Data & Visualization",
        subtitle: "Analysis • Dashboards • Reporting",
        icon: "Code2",
        tools: ["Microsoft Excel", "Power BI", "Google Sheets", "Dashboard Design", "Data Cleaning", "Data Visualization", "Report Generation", "Charts & KPIs"],
      },
    ],
  },
  projects: {
    heading: "Projects",
    intro: "Six featured projects presented like product stories: enterprise networking, SOC response, Python tooling, UI design, 3D rendering, and Unity simulation.",
    categories: Array.from(new Set(defaultProjects.map((project) => project.category))),
    items: defaultProjects.map((project) => ({
      ...project,
      links: project.links || [{ label: project.linkLabel, url: project.link }],
    })),
  },
  services: {
    heading: "Services",
    intro:
      "Professional technology services across Cybersecurity, Enterprise Networking, Active Directory, Web Development, UI/UX Design, Game Development, 3D Modeling, Automation, and Data Visualization.",
    items: [
      { title: "SOC Monitoring & Threat Detection", icon: "ShieldHalf", desc: "SIEM deployment, log analysis, alert triage, incident response, and threat detection using Wazuh, Suricata, Sysmon, and Wireshark." },
      { title: "Enterprise Network Deployment", icon: "Router", desc: "Enterprise Wi-Fi, UniFi deployments, VLAN segmentation, routing & switching, firewall configuration, structured cabling, and CCTV infrastructure." },
      { title: "Active Directory & Windows Server", icon: "ServerCog", desc: "Windows Server deployment, Active Directory configuration, DNS, DHCP, Group Policy, user management, and enterprise lab environments." },
      { title: "Vulnerability Assessment", icon: "SearchCheck", desc: "Security assessments, vulnerability scanning, risk analysis, remediation guidance, and security hardening." },
      { title: "Penetration Testing", icon: "Bug", desc: "Reconnaissance, exploitation, web application testing, and security validation using Nmap, Burp Suite, Metasploit, and Kali Linux." },
      { title: "NAS & Backup Solutions", icon: "Database", desc: "Synology NAS deployment, RAID configuration, centralized storage, Microsoft 365 backup, and enterprise file management." },
      { title: "Web Design & Development", icon: "Globe", desc: "Responsive websites and web applications using React, TypeScript, Tailwind CSS, JavaScript, HTML5, CSS3, and REST APIs." },
      { title: "UI / UX Design", icon: "Palette", desc: "Professional UI/UX design, wireframing, design systems, interactive prototypes, responsive layouts, and user-centered experiences." },
      { title: "Python Automation", icon: "Bot", desc: "Python, Bash, and PowerShell automation for cybersecurity workflows, infrastructure management, reporting, and administrative tasks." },
    ],
  },
  contact: {
    heading: "Hire Me",
    intro: "Interested in collaborating, hiring me, or discussing a cybersecurity, networking, or software project? I'd love to hear from you.",
    location: "Hyderabad, Telangana, India",
    email: "saidineshandekar1402@gmail.com",
    phone: "+91 9542488024",
  },
  resume: {
    downloadName: "Sai_Dinesh_Andekar_Resume.pdf",
    url: "/Sai_Dinesh_Andekar_Resume.pdf",
    viewUrl: "/resume.pdf",
  },
  media: {
    avatarUrl: "/avatar.webp",
    library: [
      {
        id: "default-avatar",
        label: "Default Avatar",
        url: "/avatar.webp",
        type: "image",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  },
  seo: {
    title: "Sai Dinesh Andekar | Cybersecurity Portfolio",
    description: "Cybersecurity and network infrastructure portfolio for Sai Dinesh Andekar.",
  },
  settings: {
    showWorkExperience: true,
    showServices: true,
    showProjects: true,
    showSkills: true,
  },
  social: {
    links: [
      { label: "GitHub", icon: "Github", url: "https://github.com/SaiDinesh200214" },
      { label: "LinkedIn", icon: "Linkedin", url: "https://www.linkedin.com/in/saidineshandekar/" },
      { label: "Email", icon: "Mail", url: "mailto:saidineshandekar1402@gmail.com" },
      { label: "WhatsApp", icon: "MessageCircle", url: "https://wa.me/919542488024" },
    ],
  },
  trash: {
    items: [],
  },
};
