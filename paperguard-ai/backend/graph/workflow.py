"""
PaperGuard AI - LangGraph Workflow Orchestration
Defines the multi-agent pipeline as a LangGraph StateGraph.
Each node executes an agent and broadcasts progress via WebSocket.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional, TypedDict

from langgraph.graph import StateGraph, END

from models.schemas import (
    DetectedClaim,
    Paper,
    EvidenceDetail,
    Conflict,
    AuditEntry,
    ClaimAnalysisResponse,
    ClaimAtom,
    ResearchQuery,
    Coverage,
    EvidenceStrength,
    SaferWording
)
from agents.claim_decomposition import run_claim_decomposition
from agents.query_expansion import run_query_expansion
from agents.research import run_research
from agents.relevance_ranking import run_relevance_ranking
from agents.evidence_extraction import run_evidence_extraction
from agents.adversarial_critic import run_adversarial_critic
from agents.coverage_analysis import run_coverage_analysis
from agents.verdict import run_verdict
from services.semantic_scholar import SemanticScholarClient
from services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)


# ─── State Definition ────────────────────────────────────────────────────────

class AnalysisState(TypedDict, total=False):
    """
    State object passed through the LangGraph workflow.
    Uses TypedDict for LangGraph compatibility.
    """
    detected_claim: DetectedClaim
    llm: Any
    scholar_client: Any
    use_mock: bool
    
    claim_atoms: list[ClaimAtom]
    research_queries: list[ResearchQuery]
    papers: list[Paper]
    
    supporting_evidence: list[EvidenceDetail]
    contradicting_evidence: list[EvidenceDetail]
    neutral_evidence: list[EvidenceDetail]
    
    conflicts: list[Conflict]
    coverage: Optional[Coverage]
    scope: Optional[str]
    evidence_strength: Optional[EvidenceStrength]
    safer_wording: Optional[SaferWording]
    
    audit_trace: list[AuditEntry]
    final_response: Optional[ClaimAnalysisResponse]
    error: Optional[str]


def make_initial_state(detected_claim: DetectedClaim, llm: Any, scholar_client: SemanticScholarClient, use_mock: bool) -> AnalysisState:
    """Create the initial state for the workflow."""
    state = AnalysisState()
    state["detected_claim"] = detected_claim
    state["llm"] = llm
    state["scholar_client"] = scholar_client
    state["use_mock"] = use_mock
    
    state["claim_atoms"] = []
    state["research_queries"] = []
    state["papers"] = []
    state["supporting_evidence"] = []
    state["contradicting_evidence"] = []
    state["neutral_evidence"] = []
    state["conflicts"] = []
    state["coverage"] = None
    state["scope"] = None
    state["evidence_strength"] = None
    state["safer_wording"] = None
    
    state["audit_trace"] = [
        AuditEntry(
            agent_name="System",
            stage="Initialization",
            message=f"Started verification for claim: {detected_claim.claim_id}"
        )
    ]
    state["final_response"] = None
    state["error"] = None
    return state


# ─── Node Functions ──────────────────────────────────────────────────────────

async def claim_decomposition_node(state: AnalysisState) -> AnalysisState:
    """Node 1: Break complex claim into claim atoms."""
    try:
        await ws_manager.send_agent_update(
            agent_name="Claim Decomposer",
            status="started",
            message="Decomposing claim into atomic assertions...",
        )
        
        claim = state["detected_claim"]
        llm = state.get("llm")
        use_mock = state["use_mock"]
        
        atoms, audit = await run_claim_decomposition(claim, llm=llm, use_mock=use_mock)
        
        state["claim_atoms"] = atoms
        state["audit_trace"].append(audit)
        
        await ws_manager.send_agent_update(
            agent_name="Claim Decomposer",
            status="complete",
            message=f"Extracted {len(atoms)} claim atom(s).",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Decomposition failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Decomposition failed: {e}")
    return state


async def query_expansion_node(state: AnalysisState) -> AnalysisState:
    """Node 2: Generate support and adversarial queries."""
    try:
        if state.get("error"): return state
        
        await ws_manager.send_agent_update(
            agent_name="Query Expansion",
            status="started",
            message="Generating support and adversarial research queries...",
        )
        
        atoms = state["claim_atoms"]
        llm = state.get("llm")
        use_mock = state["use_mock"]
        
        queries, audit = await run_query_expansion(atoms, llm=llm, use_mock=use_mock)
        
        state["research_queries"] = queries
        state["audit_trace"].append(audit)
        
        await ws_manager.send_agent_update(
            agent_name="Query Expansion",
            status="complete",
            message=f"Generated {len(queries)} search queries.",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Query expansion failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Query expansion failed: {e}")
    return state


async def research_node(state: AnalysisState) -> AnalysisState:
    """Node 3: Execute searches using Semantic Scholar."""
    try:
        if state.get("error"): return state

        await ws_manager.send_agent_update(
            agent_name="Research Agent",
            status="started",
            message="Searching Semantic Scholar for relevant papers...",
        )

        queries = state["research_queries"]
        scholar_client = state["scholar_client"]
        use_mock = state["use_mock"]

        papers, audit = await run_research(queries, scholar_client, use_mock=use_mock)

        state["papers"] = papers
        state["audit_trace"].append(audit)

        await ws_manager.send_agent_update(
            agent_name="Research Agent",
            status="complete",
            message=f"Retrieved {len(papers)} papers from search.",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Research failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Research failed: {e}")
    return state


async def relevance_ranking_node(state: AnalysisState) -> AnalysisState:
    """Node 4: Filter out irrelevant papers before extraction."""
    try:
        if state.get("error"): return state
        
        await ws_manager.send_agent_update(
            agent_name="Relevance Ranker",
            status="started",
            message="Evaluating relevance of retrieved papers...",
        )
        
        papers = state["papers"]
        atoms = state["claim_atoms"]
        llm = state.get("llm")
        use_mock = state["use_mock"]
        
        ranked_papers, audit = await run_relevance_ranking(papers, atoms, llm=llm, use_mock=use_mock)
        
        state["papers"] = ranked_papers
        state["audit_trace"].append(audit)
        
        await ws_manager.send_agent_update(
            agent_name="Relevance Ranker",
            status="complete",
            message=f"Retained {len(ranked_papers)} highly relevant papers.",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Relevance ranking failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Relevance ranking failed: {e}")
    return state


async def evidence_extraction_node(state: AnalysisState) -> AnalysisState:
    """Node 5: Extract actual evidence spans from relevant papers."""
    try:
        if state.get("error"): return state

        await ws_manager.send_agent_update(
            agent_name="Evidence Extraction",
            status="started",
            message="Extracting evidence spans mapped to claim atoms...",
        )

        papers = state["papers"]
        atoms = state["claim_atoms"]
        claim = state["detected_claim"]
        llm = state.get("llm")
        use_mock = state["use_mock"]

        supporting, contradicting, neutral, audit = await run_evidence_extraction(
            papers, atoms, claim.claim_id, llm=llm, use_mock=use_mock
        )

        state["supporting_evidence"] = supporting
        state["contradicting_evidence"] = contradicting
        state["neutral_evidence"] = neutral
        state["audit_trace"].append(audit)

        total_ev = len(supporting) + len(contradicting) + len(neutral)
        await ws_manager.send_agent_update(
            agent_name="Evidence Extraction",
            status="complete",
            message=f"Extracted {total_ev} pieces of evidence.",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Evidence extraction failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Evidence extraction failed: {e}")
    return state


async def adversarial_critic_node(state: AnalysisState) -> AnalysisState:
    """Node 6: Identify conflicts and scope limits within the evidence."""
    try:
        if state.get("error"): return state

        await ws_manager.send_agent_update(
            agent_name="Adversarial Critic",
            status="started",
            message='Analyzing evidence for contradictions and methodological conflicts...',
        )

        supporting = state["supporting_evidence"]
        contradicting = state["contradicting_evidence"]
        neutral = state["neutral_evidence"]
        llm = state.get("llm")
        use_mock = state["use_mock"]

        conflicts, audit = await run_adversarial_critic(
            supporting, contradicting, neutral, llm=llm, use_mock=use_mock
        )

        state["conflicts"] = conflicts
        state["audit_trace"].append(audit)

        await ws_manager.send_agent_update(
            agent_name="Adversarial Critic",
            status="complete",
            message=f"Identified {len(conflicts)} scientific conflicts.",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Adversarial critic failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Adversarial critic failed: {e}")
    return state


async def coverage_analysis_node(state: AnalysisState) -> AnalysisState:
    """Node 7: Determine atom-level coverage and overall claim scope."""
    try:
        if state.get("error"): return state

        await ws_manager.send_agent_update(
            agent_name="Coverage Analysis",
            status="started",
            message='Mapping evidence coverage to claim atoms...',
        )

        atoms = state["claim_atoms"]
        supporting = state["supporting_evidence"]
        contradicting = state["contradicting_evidence"]
        conflicts = state["conflicts"]
        llm = state.get("llm")
        use_mock = state["use_mock"]

        coverage, scope, audit = await run_coverage_analysis(
            atoms, supporting, contradicting, conflicts, llm=llm, use_mock=use_mock
        )
        
        state["coverage"] = coverage
        state["scope"] = scope
        state["audit_trace"].append(audit)

        await ws_manager.send_agent_update(
            agent_name="Coverage Analysis",
            status="complete",
            message=f"Coverage mapped: {coverage.overall_status}",
        )
        await asyncio.sleep(0.5)
    except Exception as e:
        logger.error(f"Coverage analysis failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Coverage analysis failed: {e}")
    return state


async def verdict_node(state: AnalysisState) -> AnalysisState:
    """Node 8: Produce final verdict using deterministic rules."""
    try:
        if state.get("error"): return state

        await ws_manager.send_agent_update(
            agent_name="Verdict Engine",
            status="started",
            message="Generating deterministic verdict based on evidence coverage...",
        )

        claim = state["detected_claim"]
        atoms = state["claim_atoms"]
        coverage = state["coverage"]
        scope = state["scope"]
        supporting = state["supporting_evidence"]
        contradicting = state["contradicting_evidence"]
        neutral = state["neutral_evidence"]
        conflicts = state["conflicts"]
        audit_trace = state["audit_trace"]
        llm = state.get("llm")
        use_mock = state["use_mock"]

        response = await run_verdict(
            claim=claim,
            atoms=atoms,
            coverage=coverage,
            scope=scope,
            supporting=supporting,
            contradicting=contradicting,
            neutral=neutral,
            conflicts=conflicts,
            audit_trace=audit_trace,
            llm=llm,
            use_mock=use_mock
        )

        state["final_response"] = response
        state["audit_trace"] = response.audit_trace

        await ws_manager.send_agent_update(
            agent_name="Verdict Engine",
            status="complete",
            message=f"Final Verdict: {response.verdict}",
            data={
                "verdict": response.verdict,
            },
        )
        await ws_manager.send_analysis_complete(response.model_dump())
    except Exception as e:
        logger.error(f"Verdict generation failed: {e}")
        state["error"] = str(e)
        await ws_manager.send_error(f"Verdict generation failed: {e}")
    return state


# ─── Graph Construction ──────────────────────────────────────────────────────

def build_workflow() -> StateGraph:
    """
    Build the LangGraph workflow as a sequential pipeline:
    Decomposition → Query Expansion → Research → Ranking → Evidence Extraction →
    Adversarial Critic → Coverage → Verdict
    """
    workflow = StateGraph(AnalysisState)

    workflow.add_node("claim_decomposition", claim_decomposition_node)
    workflow.add_node("query_expansion", query_expansion_node)
    workflow.add_node("research", research_node)
    workflow.add_node("relevance_ranking", relevance_ranking_node)
    workflow.add_node("evidence_extraction", evidence_extraction_node)
    workflow.add_node("adversarial_critic", adversarial_critic_node)
    workflow.add_node("coverage_analysis", coverage_analysis_node)
    workflow.add_node("verdict", verdict_node)

    workflow.set_entry_point("claim_decomposition")
    workflow.add_edge("claim_decomposition", "query_expansion")
    workflow.add_edge("query_expansion", "research")
    workflow.add_edge("research", "relevance_ranking")
    workflow.add_edge("relevance_ranking", "evidence_extraction")
    workflow.add_edge("evidence_extraction", "adversarial_critic")
    workflow.add_edge("adversarial_critic", "coverage_analysis")
    workflow.add_edge("coverage_analysis", "verdict")
    workflow.add_edge("verdict", END)

    return workflow


def compile_workflow():
    workflow = build_workflow()
    return workflow.compile()

analysis_graph = compile_workflow()
