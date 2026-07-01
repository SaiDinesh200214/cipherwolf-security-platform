export default function About() {
  return (
    <section className="px-4 sm:px-6 pt-28 pb-16 sm:pb-24">
      <div className="max-w-5xl mx-auto">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.28em] uppercase text-(--text-secondary)">
            Cybersecurity · Networking · Security
          </p>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black tracking-tight">
            About Sai Dinesh Andekar
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-sm sm:text-base leading-7 sm:leading-8 text-(--text-secondary)">
            I am a Computer Science Engineering graduate from Chandigarh University
            focused on cybersecurity, SOC operations, enterprise networking, network
            security, and penetration testing. I build practical labs and secure
            infrastructure with a hands-on, field-tested approach.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ["SOC Operations", "Wazuh SIEM, Suricata IDS, Sysmon, Wireshark, alert triage, and incident response."],
            ["Enterprise Networking", "UniFi deployments, VLAN design, routing, switching, firewall rules, CCTV, and NAS."],
            ["Offensive Security", "Reconnaissance, vulnerability assessment, penetration testing, and exploit validation."],
            ["Continuous Learning", "Active Directory labs, SOC simulations, research, certifications, and practical projects."],
          ].map(([title, desc]) => (
            <article key={title} className="rounded-2xl border border-(--border) bg-(--bg-card) p-5">
              <h2 className="text-base font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-(--text-secondary)">{desc}</p>
            </article>
          ))}
        </div>

        <article className="mt-10 rounded-2xl border border-(--border) bg-white/60 p-5 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-(--text-secondary)">
                Work Experience
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black">
                Network & IT Infrastructure Engineer
              </h2>
              <p className="mt-1 text-base font-bold text-(--primary)">
                Rajguru Distributors
              </p>
              <p className="mt-1 text-sm text-(--text-secondary)">
                Hyderabad, Telangana
              </p>
            </div>
            <span className="inline-flex w-fit px-4 py-2 rounded-full border border-(--border) bg-(--bg-card) text-sm font-semibold text-(--text-secondary)">
              April 2026 - May 2026
            </span>
          </div>

          <ul className="mt-6 space-y-3 text-sm leading-7 text-(--text-secondary)">
            <li>Designed and deployed segmented UniFi networks, wireless heat maps, firewall rules, and client handover documentation.</li>
            <li>Configured CCTV, Synology NAS, structured cabling, Windows workstation access, and Microsoft 365 backup workflows.</li>
            <li>Handled live client troubleshooting, including switch uplink isolation, cabling validation, and site migration support.</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
