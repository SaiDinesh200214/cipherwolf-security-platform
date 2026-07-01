import aiTrafficImage from "../../../assets/images/AI Traffic Management System.png";
import cipherWolfImage from "../../../assets/images/CipherWolf Security Platform.png";
import corporateSocImage from "../../../assets/images/Corporate-Grade SOC Home Lab.png";
import donutImage from "../../../assets/images/Donut and Coffee Cup Scene.png";
import enterpriseNetworkImage from "../../../assets/images/Enterprise Multi-Site Network Infrastructure Design.png";
import netAuditImage from "../../../assets/images/NetAudit Pro.png";
import netflixImage from "../../../assets/images/Netflix Show Landing Page UI.png";
import ratDetectionImage from "../../../assets/images/RAT Detection Lab.png";
import socIncidentImage from "../../../assets/images/SOC Incident Response & Threat Detection Lab.png";

export type ProjectCategory = string;

export type ProjectVisual =
  | "network"
  | "soc"
  | "audit"
  | "streaming"
  | "donut"
  | "traffic"
  | "cipherwolf"
  | "socHome"
  | "ratDetection"
  | string;

export interface ProjectMetric {
  value: string;
  label: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  shortTitle: string;
  category: ProjectCategory;
  date: string;
  eyebrow: string;
  summary: string;
  description: string;
  tools: string[];
  techniques: string[];
  metrics: ProjectMetric[];
  highlights: string[];
  linkLabel: string;
  link: string;
  links?: Array<{ label: string; url: string }>;
  visual: ProjectVisual;
  image?: string;
  featured?: boolean;
}

export const projects: ProjectItem[] = [
  {
    id: "enterprise-network-infrastructure",
    title: "Enterprise Multi-Site Network Infrastructure Design",
    shortTitle: "GMNC Network",
    category: "Network Design",
    date: "April 6, 2026",
    eyebrow: "Hero Project",
    summary:
      "A simulated global company network spanning access, core operations, and distribution zones with tested routing, VPN, NAT, ACL, and DHCP.",
    description:
      "Designed a professional enterprise-level network for a Global Multi-National Company in Cisco Packet Tracer, documented as a 17-page LaTeX report with topology diagrams, IOS configuration blocks, test results, and a defense-in-depth security model.",
    tools: ["Cisco Packet Tracer", "LaTeX", "Overleaf", "Cisco IOS", "TikZ"],
    techniques: ["OSPF backbone", "RIP v2", "IPSec VPN", "NAT", "ACL", "DHCP", "Defense in Depth"],
    metrics: [
      { value: "30", label: "Subnets" },
      { value: "3", label: "Zones" },
      { value: "17", label: "Report pages" },
    ],
    highlights: [
      "Designed access, core, and distribution zones with colour-coded topology diagrams.",
      "Validated routing, NAT translation, ACL enforcement, VPN tunnel stability, and end-to-end reachability.",
      "Mapped the security model to NIST CSF and ISO 27001 thinking.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214",
    visual: "network",
    image: enterpriseNetworkImage,
    featured: true,
  },
  {
    id: "cipherwolf-security-platform",
    title: "CipherWolf Security Platform",
    shortTitle: "CipherWolf",
    category: "Security Platform",
    date: "2026",
    eyebrow: "Hero Project",
    summary:
      "A modern cybersecurity SaaS portfolio and security operations platform with public portfolio, admin CMS, SOC dashboard, analytics, and enterprise security architecture.",
    description:
      "Designed and developed a modern Cybersecurity SaaS Portfolio & Security Operations Platform featuring a premium public portfolio, secure admin CMS, real-time SOC dashboard, visitor intelligence, authentication, analytics, and enterprise-grade security architecture. Built with a scalable full-stack architecture inspired by modern cybersecurity platforms.",
    tools: [
      "React.js",
      "TypeScript",
      "Tailwind CSS v4",
      "Framer Motion",
      "Node.js",
      "Express.js",
      "MongoDB",
      "Cloudinary",
      "Chart.js / Recharts",
    ],
    techniques: [
      "JWT Authentication",
      "RBAC",
      "bcrypt",
      "Helmet.js",
      "Rate Limiting",
      "CSRF Protection",
      "XSS Protection",
      "REST API",
      "SOC Dashboard",
      "Visitor Analytics",
      "Threat Intelligence",
      "Responsive UI/UX",
      "Apple Liquid Glass Design",
    ],
    metrics: [
      { value: "25+", label: "Core features" },
      { value: "3", label: "User panels" },
      { value: "15+", label: "Security layers" },
    ],
    highlights: [
      "Developed a premium cybersecurity portfolio with Apple-inspired Liquid Glass UI and smooth animations.",
      "Built a secure Admin CMS for managing projects, blogs, certifications, and portfolio content.",
      "Designed an interactive SOC Dashboard with live security monitoring, threat intelligence, attack visualization, and security analytics.",
      "Implemented JWT authentication, Role-Based Access Control, session management, and optional Two-Factor Authentication.",
      "Added visitor analytics, device fingerprinting, geolocation tracking, and security event logging.",
      "Integrated defense-in-depth architecture following enterprise cybersecurity best practices.",
      "Fully responsive design optimized for desktop, tablet, and mobile devices.",
      "Structured for production deployment with scalable backend architecture and modern development practices.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214/cipherwolf-security-platform",
    visual: "cipherwolf",
    image: cipherWolfImage,
    featured: true,
  },
  {
    id: "corporate-grade-soc-home-lab",
    title: "Corporate-Grade SOC Home Lab - UTM Multi-VM Environment",
    shortTitle: "SOC Home Lab",
    category: "Cybersecurity Lab",
    date: "2026",
    eyebrow: "Hero Project",
    summary:
      "A corporate-grade SOC home lab on Apple Silicon with multi-VM attack simulation, SIEM and IDS monitoring, threat hunting, and attack-to-detection validation.",
    description:
      "Designed and deployed a corporate-grade Security Operations Center home lab on Apple Silicon using UTM virtualization. Simulated enterprise cyberattacks across multiple virtual machines, implemented SIEM and IDS monitoring, performed threat hunting, and validated the complete attack-to-detection lifecycle through real-world security operations.",
    tools: [
      "UTM Virtualization",
      "Apple Silicon",
      "Ubuntu Server",
      "Windows 11",
      "Kali Linux",
      "Metasploitable",
      "Wazuh SIEM",
      "Suricata IDS",
      "Wireshark",
      "Metasploit Framework",
    ],
    techniques: [
      "Meterpreter",
      "Linux Administration",
      "Threat Hunting",
      "Incident Response",
      "SOC Operations",
      "Network Forensics",
      "Detection Engineering",
      "Custom IDS Rules",
      "Command & Control Detection",
    ],
    metrics: [
      { value: "4", label: "Virtual machines" },
      { value: "50+", label: "Security alerts" },
      { value: "10+", label: "Attack simulations" },
    ],
    highlights: [
      "Built a complete enterprise SOC lab on Apple Silicon using UTM virtualization.",
      "Simulated Meterpreter command-and-control attacks, privilege escalation, and lateral movement across multiple hosts.",
      "Developed custom Suricata IDS rules to detect Meterpreter sessions and HTTP beacon traffic with reduced false positives.",
      "Configured Wazuh SIEM for centralized log collection, endpoint monitoring, alert correlation, and security analytics.",
      "Investigated malicious traffic using Wireshark to identify C2 communications, payload delivery, and network indicators of compromise.",
      "Validated the full detection pipeline from exploitation to SOC alert generation and incident triage.",
      "Documented enterprise attack scenarios with professional reporting suitable for cybersecurity portfolios.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214",
    visual: "socHome",
    image: corporateSocImage,
    featured: true,
  },
  {
    id: "rat-detection-lab",
    title: "RAT Detection Lab - C2 Beacon Simulation & SOC Monitoring",
    shortTitle: "RAT Detection",
    category: "Cybersecurity Lab",
    date: "2026",
    eyebrow: "Hero Project",
    summary:
      "An enterprise SOC detection lab for RAT command-and-control simulation, endpoint monitoring, alert correlation, and full incident investigation.",
    description:
      "Engineered an enterprise SOC detection laboratory to simulate Remote Access Trojan command-and-control attacks, monitor endpoint behaviour, correlate security events, and perform full incident investigation using enterprise security monitoring tools.",
    tools: [
      "Ubuntu Server",
      "Windows 11",
      "Windows Server",
      "Kali Linux",
      "VirtualBox",
      "Wazuh SIEM",
      "Suricata IDS",
      "Sysmon",
      "Wireshark",
      "PowerShell",
    ],
    techniques: [
      "MITRE ATT&CK",
      "Threat Hunting",
      "SOC Monitoring",
      "Incident Response",
      "Alert Correlation",
      "Digital Forensics",
      "Network Traffic Analysis",
      "Custom Detection Rules",
      "C2 Beacon Detection",
      "Root Cause Analysis",
    ],
    metrics: [
      { value: "4", label: "Enterprise VMs" },
      { value: "100+", label: "Correlated events" },
      { value: "6", label: "Security platforms" },
    ],
    highlights: [
      "Built a multi-machine SOC environment with Ubuntu, Windows, Windows Server, and Kali Linux.",
      "Simulated a complete RAT command-and-control attack chain from compromise to persistence and beaconing.",
      "Created custom Suricata detection signatures for HTTP beacon traffic and optimized detection accuracy by minimizing alert noise.",
      "Integrated Sysmon endpoint telemetry with Wazuh SIEM for advanced process and network monitoring.",
      "Correlated endpoint, network, and IDS events to reconstruct the complete attacker kill chain.",
      "Performed Wireshark packet analysis to identify malicious communications and network-based indicators of compromise.",
      "Produced a detailed incident timeline covering detection, investigation, root cause analysis, containment, and remediation.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214",
    visual: "ratDetection",
    image: ratDetectionImage,
    featured: true,
  },
  {
    id: "soc-incident-response-lab",
    title: "SOC Incident Response & Threat Detection Lab",
    shortTitle: "SOC IR Lab",
    category: "Cybersecurity Lab",
    date: "March 17, 2026",
    eyebrow: "Red Team vs Blue Team",
    summary:
      "A dual-role attack and defense simulation across three live virtual machines with detection, log analysis, and firewall mitigation.",
    description:
      "Played both attacker and defender in an isolated VirtualBox lab. Generated real HTTP attack traffic from Kali, identified the attacker through Apache logs and an AWK pipeline, then blocked the source with UFW while keeping the legitimate user unaffected.",
    tools: ["Kali Linux", "Apache", "UFW", "Nmap", "Dirb", "Curl", "AWK", "VirtualBox"],
    techniques: ["Port scanning", "Directory enumeration", "Traffic flood", "Log triage", "Firewall mitigation"],
    metrics: [
      { value: "19,369", label: "Attack requests" },
      { value: "3", label: "Virtual machines" },
      { value: "6/6", label: "Tests passed" },
    ],
    highlights: [
      "Detected attacker behavior through request volume, user-agent, IP address, and timestamp patterns.",
      "Blocked one malicious IP with zero impact on the legitimate client.",
      "Demonstrated a complete SOC lifecycle: attack, detection, containment, and verification.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214",
    visual: "soc",
    image: socIncidentImage,
    featured: true,
  },
  {
    id: "netaudit-pro",
    title: "NetAudit Pro",
    shortTitle: "NetAudit Pro",
    category: "Security Tool",
    date: "2026",
    eyebrow: "Python Security Product",
    summary:
      "A cross-platform home network audit tool that discovers devices, scans critical ports, scores risk, maps topology, and exports reports.",
    description:
      "Built a Python-based network security auditing toolkit with ARP discovery, TTL-based OS detection, concurrent port scanning, CVE-style vulnerability mapping, attack pattern detection, interactive topology maps, and dark-themed PDF reporting.",
    tools: ["Python", "Scapy", "ReportLab", "Pillow", "HTML5 Canvas", "Termux"],
    techniques: ["ARP discovery", "Ping sweep", "TTL OS detection", "Risk scoring", "PDF generation"],
    metrics: [
      { value: "20", label: "Critical ports" },
      { value: "4", label: "Platforms" },
      { value: "0-10", label: "Risk score" },
    ],
    highlights: [
      "Supports Windows, Linux, macOS, and limited Android Termux mode.",
      "Flags risky combinations such as RDP plus SMB as ransomware exposure.",
      "Generates professional audit reports and scan logs for follow-up.",
    ],
    linkLabel: "View GitHub",
    link: "https://github.com/SaiDinesh200214/network-audit-tool",
    visual: "audit",
    image: netAuditImage,
    featured: true,
  },
  {
    id: "netflix-money-heist-ui",
    title: "Netflix Show Landing Page UI",
    shortTitle: "Netflix UI",
    category: "UI Design",
    date: "July 9, 2024",
    eyebrow: "Figma Concept",
    summary:
      "A high-fidelity Money Heist show page concept with cinematic hierarchy, cast details, genre tags, ratings, and streaming actions.",
    description:
      "Designed a polished streaming product interface in Figma with a dark hero composition, Play Now and My List actions, responsive framing, component-based layout, IMDB-style rating details, social actions, and MacBook-ready mockups.",
    tools: ["Figma", "Prototyping", "UI Kits", "Auto Layout"],
    techniques: ["Responsive web framing", "Component systems", "Dark mode theming", "Visual hierarchy"],
    metrics: [
      { value: "1", label: "Hero flow" },
      { value: "5+", label: "UI states" },
      { value: "2024", label: "Designed" },
    ],
    highlights: [
      "Focused on real streaming UX patterns rather than a static poster layout.",
      "Balanced cinematic visuals with usable content hierarchy and clear CTAs.",
      "Prepared for cross-device portfolio presentation.",
    ],
    linkLabel: "Figma available",
    link: "https://www.figma.com/",
    visual: "streaming",
    image: netflixImage,
  },
  {
    id: "donut-coffee-scene",
    title: "Donut and Coffee Cup Scene",
    shortTitle: "3D Food Scene",
    category: "3D Design",
    date: "January 20, 2024",
    eyebrow: "Blender Render",
    summary:
      "A warm product-style 3D scene with a glossy chocolate donut, ceramic coffee cup, realistic shaders, and depth-of-field lighting.",
    description:
      "Modeled and textured a cozy breakfast scene in Blender, including custom icing shaders, drip displacement, colourful sprinkles, a reflective ceramic cup, saucer, plate, HDRI lighting, and camera framing for render stills or subtle motion.",
    tools: ["Blender", "HDRI Lighting", "Shader Nodes", "Camera DOF"],
    techniques: ["Glossy materials", "Diffuse materials", "Food layout", "Depth of field", "Lighting composition"],
    metrics: [
      { value: "100%", label: "Modeled" },
      { value: "HDRI", label: "Lighting" },
      { value: "DOF", label: "Camera" },
    ],
    highlights: [
      "Created custom material work for icing, sprinkles, ceramic reflection, and table setup.",
      "Used warm lighting and camera depth to make the scene feel product-ready.",
      "Built as a foundation for animation or still render presentation.",
    ],
    linkLabel: "Coming soon",
    link: "#portfolio",
    visual: "donut",
    image: donutImage,
  },
  {
    id: "ai-traffic-management-system",
    title: "AI Traffic Management System",
    shortTitle: "AI Traffic",
    category: "Game Development",
    date: "November 5, 2024",
    eyebrow: "Unity Simulation",
    summary:
      "A smart-city traffic simulation where vehicles respond to adaptive signals, lane logic, turns, and collision prevention.",
    description:
      "Built a Unity-based traffic system using C# where autonomous vehicles navigate intersections with raycast detection, state-machine signal control, lane following, turn logic, collision avoidance, emissive signal lighting, and a top-down city simulation view.",
    tools: ["Unity", "C#", "Raycasting", "State Machines"],
    techniques: ["Vehicle detection", "Signal timing", "Lane following", "Turn logic", "Collision avoidance"],
    metrics: [
      { value: "AI", label: "Vehicle logic" },
      { value: "0", label: "Hardcoded priority" },
      { value: "360", label: "Intersection flow" },
    ],
    highlights: [
      "Adapted signal behavior based on vehicle presence and cross-direction flow.",
      "Combined smart-city logic with game-development movement systems.",
      "Designed for playable demos, urban planning demos, or autonomous-vehicle prototypes.",
    ],
    linkLabel: "Demo on request",
    link: "#contact",
    visual: "traffic",
    image: aiTrafficImage,
  },
];
