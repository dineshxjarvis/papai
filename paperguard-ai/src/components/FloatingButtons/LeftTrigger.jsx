import { PanelLeft } from "lucide-react";

export default function LeftTrigger({
  onClick,
}) {
  return (
    <button
      className="floating-trigger left"
      onClick={onClick}
      title="Open navigation"
    >
      <PanelLeft size={18} />
    </button>
  );
}
