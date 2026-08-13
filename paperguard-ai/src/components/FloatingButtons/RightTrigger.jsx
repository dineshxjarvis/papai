import { Sparkles } from "lucide-react";

export default function RightTrigger({
  onClick,
}) {
  return (
    <button
      className="floating-trigger right"
      onClick={onClick}
      title="Open PaperGuard AI"
    >
      <Sparkles size={18} />
    </button>
  );
}
