import {
  ExternalLink,
  FileText,
} from "lucide-react";

export default function EvidenceCard({
  title,
  authors,
  year,
  source,
  relevance = 85,
}) {
  return (
    <div className="evidence-card">

      <div className="evidence-icon">
        <FileText size={17} />
      </div>

      <div className="evidence-content">

        <strong>
          {title}
        </strong>

        <p>
          {authors}
        </p>

        <div className="evidence-meta">

          <span>
            {source}
          </span>

          <span>
            {year}
          </span>

          <span>
            {relevance}% relevant
          </span>

        </div>

      </div>

      <button>
        <ExternalLink size={14} />
      </button>

    </div>
  );
}
