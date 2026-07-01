import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Check } from "lucide-react";
import { useToast } from "../common/Toast";
import { trackVisitorEvent } from "../../services/visitorTracking";

interface DownloadButtonProps {
  label?: string;
  url?: string;
  downloadName?: string;
}

export default function DownloadButton({ label = "Download CV", url = "/resume.pdf", downloadName = "Sai_Dinesh_Andekar_Resume.pdf" }: DownloadButtonProps) {
  const [clicked, setClicked] = useState(false);
  const { showToast, updateToast } = useToast();

  const handleClick = () => {
    setClicked(true);
    trackVisitorEvent("resume_download", {
      asset: url,
      downloadName,
    });
    const id = showToast("Preparing CV", "Your download will begin shortly...", "loading");

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = downloadName;
      link.click();
      setTimeout(() => {
        updateToast(id, "Download Complete", "Your CV has been saved to your device.", "success");
      }, 600);
    } catch {
      updateToast(id, "Download Failed", "Something went wrong. Please try again.", "error");
    }

    setTimeout(() => setClicked(false), 2000);
  };

  return (
    <motion.button
      onClick={handleClick}
      className="eleken-cta flex items-center gap-2"
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {clicked ? (
          <motion.span
            key="check"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Check size={18} /> Downloaded
          </motion.span>
        ) : (
          <motion.span
            key="download"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="flex items-center gap-2"
          >
            <Download size={18} /> {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
