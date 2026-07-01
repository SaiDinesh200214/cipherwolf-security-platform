export default function Footer() {
  return (
    <footer className="w-full border-t border-(--border) py-8 mt-20">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-(--text-secondary)">
          &copy; {new Date().getFullYear()} Sai Dinesh Andekar. Built with CipherWolf Security Platform.
        </p>
        <div className="flex gap-6 text-sm text-(--text-secondary)">
          <a href="#" className="hover:text-(--text) transition-colors">GitHub</a>
          <a href="#" className="hover:text-(--text) transition-colors">LinkedIn</a>
          <a href="#" className="hover:text-(--text) transition-colors">Twitter</a>
        </div>
      </div>
    </footer>
  );
}