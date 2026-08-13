import {
  ArrowRight,
  CircleCheck,
  CircleAlert,
  CircleX,
} from "lucide-react";

export default function ClaimCard({
  claim,
  onClick,
}) {
  const StatusIcon =
    claim.type === "green"
      ? CircleCheck
      : claim.type === "yellow"
      ? CircleAlert
      : CircleX;

  return (
    <button
      className="claim-card"
      onClick={() => onClick?.(claim)}
    >

      <div className={`claim-id ${claim.type}`}>
        {claim.id}
      </div>

      <div className="claim-info">

        <p>
          {claim.text}
        </p>

        <div className="claim-meta">

          <span
            className={`claim-status ${claim.type}`}
          >
            <StatusIcon size={10} />

            {claim.status}
          </span>

          <span className="confidence">
            Confidence: {claim.confidence}%
          </span>

        </div>

      </div>

      <ArrowRight size={14} />

    </button>
  );
}
