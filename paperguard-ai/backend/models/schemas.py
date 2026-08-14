"""
PaperGuard AI - Pydantic Schemas
All data models matching the frontend's expected structure.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# ─── Core Data Models ────────────────────────────────────────────────────────

class DetectedClaim(BaseModel):
    """A scientific claim extracted from the document."""
    claim_id: str = Field(..., description="Unique claim identifier")
    claim_text: str = Field(..., description="The full claim text")
    claim_type: str = Field("none", description="Quantitative, Comparative, Causal, Performance, Limitation, Generalization, or none")
    confidence: float = Field(0.0, description="Confidence score 0.0 - 1.0")
    subject: str = Field("Unknown", description="The subject of the claim (e.g., 'Compound X-74')")
    predicate: str = Field("affects", description="Relationship or action")
    metric: Optional[str] = Field(None, description="Metric being measured")
    value: Optional[str] = Field(None, description="Value of the metric")
    comparison_target: Optional[str] = Field(None, description="What the subject is compared against")
    evidence_required: bool = Field(True, description="Whether this claim needs verification")
    
    # Backwards compatibility properties for research/verdict agents
    @property
    def outcome(self) -> str:
        return f"{self.predicate} {self.value if self.value else ''}".strip()
        
    @property
    def condition(self) -> str:
        return f"compared to {self.comparison_target}" if self.comparison_target else "No specific condition"


# ─── Request Models ──────────────────────────────────────────────────────────

class ClaimAnalysisRequest(BaseModel):
    """Request body for POST /analyze-claim."""
    claim: DetectedClaim
    document_id: Optional[str] = Field(None, description="Optional document identifier")
    use_mock: bool = Field(False, description="Whether to use mock data for testing")



# ─── Verification Graph Models ──────────────────────────────────────────────────

class ClaimAtom(BaseModel):
    """An atomic assertion decomposed from a complex claim."""
    atom_id: str
    text: str
    subject: str = Field("Unknown")
    predicate: str = Field("affects")
    object_value: Optional[str] = None
    metric: Optional[str] = None
    scope: Optional[str] = None
    strength_qualifier: Optional[str] = Field(None, description="e.g., 'always', 'never', 'universally'")

class ResearchQuery(BaseModel):
    """A research query targeting a specific claim atom."""
    query: str
    direction: str = Field(..., description="'support' or 'adversarial'")
    atom_id: Optional[str] = None

class Paper(BaseModel):
    """A research paper from literature search."""
    paper_id: str = Field(default_factory=lambda: f"paper_{datetime.now().timestamp()}")
    title: str
    abstract: Optional[str] = None
    year: Optional[int] = None
    doi: Optional[str] = None
    authors: list[str] = Field(default_factory=list)
    source: Optional[str] = Field(None, description="Journal or source name")
    url: Optional[str] = None
    query_used: Optional[str] = None
    query_direction: Optional[str] = None
    citation_count: Optional[int] = None
    stance: Optional[str] = None
    
    # Relevance Ranking
    relevance_score: Optional[float] = None
    relevance_reason: Optional[str] = None
    matched_atom_id: Optional[str] = None

class EvidenceDetail(BaseModel):
    """Extracted evidence mapped to atoms."""
    evidence_id: str
    paper_id: str
    paper_title: str
    claim_id: str
    atom_id: Optional[str] = None
    text_span: str = Field(..., description="The actual extracted evidence text")
    evidence_type: str = Field(..., description="SUPPORTING, CONTRADICTING, or NEUTRAL")
    relation: Optional[str] = None
    context: Optional[str] = None
    source_url: Optional[str] = None
    location: Optional[str] = Field(None, description="Page or section where found")

class Conflict(BaseModel):
    """A structured conflict representation from the adversarial critic."""
    conflict_id: str = Field(default_factory=lambda: f"conflict_{datetime.now().timestamp()}")
    affected_atom_id: Optional[str] = None
    conflicting_evidence_ids: list[str] = Field(default_factory=list)
    nature_of_conflict: str = Field(..., description="What exactly is the conflict?")
    conditions: Optional[str] = Field(None, description="Under what conditions does the conflict arise?")
    explanation: str

class AtomCoverage(BaseModel):
    """Coverage status for a single claim atom."""
    atom_id: str
    status: str = Field(..., description="SUPPORTED, PARTIALLY_SUPPORTED, CONTRADICTED, INSUFFICIENT")
    reason: str
    supported_scope: Optional[str] = None

class Coverage(BaseModel):
    """Overall coverage analysis."""
    overall_status: str
    atom_coverage: list[AtomCoverage] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)

class EvidenceStrength(BaseModel):
    """Quality and directness of evidence collection."""
    score: float = Field(..., description="0-100 indicating volume and quality, NOT truth probability")
    description: str

class SaferWording(BaseModel):
    """Suggested safer wording if the original claim is too strong."""
    original_claim: str
    problem: str
    supported_scope: str
    suggested_wording: str

# ─── Audit Trace & WebSockets ───────────────────────────────────────────────

class AuditEntry(BaseModel):
    """A single entry in the agent audit trace."""
    event_id: str = Field(default_factory=lambda: f"evt_{datetime.now().timestamp()}")
    agent_name: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    stage: str
    status: str = Field("complete", description="complete, in_progress, or error")
    message: str
    relevant_ids: list[str] = Field(default_factory=list)
    details: Optional[str] = None
    errors: Optional[str] = None

class AgentUpdate(BaseModel):
    """Real-time update sent via WebSocket during analysis."""
    type: str = Field("agent_update", description="Message type: agent_update, analysis_complete, error")
    agent_name: str
    status: str = Field(..., description="started, in_progress, complete, error")
    message: str
    timestamp: str = Field(default_factory=lambda: datetime.now().strftime("%H:%M:%S"))
    data: Optional[dict] = None

# ─── Final Response ──────────────────────────────────────────────────────────

class ClaimAnalysisResponse(BaseModel):
    """The canonical Phase 4 /api/verify structured response."""
    claim: DetectedClaim
    claim_id: str
    
    verdict: str = Field(..., description="supported, partially_supported, contradicted, insufficient")
    coverage: Optional[Coverage] = None
    scope: Optional[str] = Field(None, description="The supported scope of the claim")
    evidence_strength: Optional[EvidenceStrength] = None
    
    claim_atoms: list[ClaimAtom] = Field(default_factory=list)
    supporting_evidence: list[EvidenceDetail] = Field(default_factory=list)
    contradicting_evidence: list[EvidenceDetail] = Field(default_factory=list)
    neutral_evidence: list[EvidenceDetail] = Field(default_factory=list)
    conflicts: list[Conflict] = Field(default_factory=list)
    
    safer_wording: Optional[SaferWording] = None
    audit_trace: list[AuditEntry] = Field(default_factory=list)
    
    analysis_id: str = Field(default_factory=lambda: f"ANL-{datetime.now().strftime('%Y%m%d-%H%M%S')}")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())
    metadata: dict = Field(default_factory=dict)
