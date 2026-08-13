import { ArrowRight } from "lucide-react";
import { agents } from "../../data/agents";
import AgentCard from "./AgentCard";

import "./AgentPanel.css";

export default function AgentPanel() {
  return (
    <section className="agent-panel">

      <div className="agent-heading">
        <strong>Agent Status</strong>
        <span>⋮</span>
      </div>

      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
        />
      ))}

      <button className="trace">
        View Full Agent Trace
        <ArrowRight size={14} />
      </button>

    </section>
  );
}
