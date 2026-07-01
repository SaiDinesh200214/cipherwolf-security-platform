import ProjectShowcase from "../components/common/ProjectShowcase";

export default function Projects() {
  return (
    <main className="px-4 py-16 sm:px-6 sm:py-24">
      <ProjectShowcase
        title="Project Archive"
        intro="A CMS-ready showcase of selected cybersecurity, networking, design, and simulation projects. Each project is structured as editable data so the backend can add, remove, or update work later."
      />
    </main>
  );
}
