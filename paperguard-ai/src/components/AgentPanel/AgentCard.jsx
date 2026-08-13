export default function AgentCard({
  agent,
}) {
  const Icon = agent.icon;

  return (
    <div className={`agent-card ${agent.type}`}>

      <div className="agent-name">

        <div className="agent-icon">
          <Icon size={17} />
        </div>

        <strong>
          {agent.name}
        </strong>

      </div>


      <div className="agent-active">

        <span />

        {agent.status}

      </div>


      <p>
        {agent.description}
      </p>


      <div className="mini-graph">

        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />

      </div>

    </div>
  );
}
