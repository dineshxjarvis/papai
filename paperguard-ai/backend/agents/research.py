"""
PaperGuard AI - Research Agent
Searches academic literature using Semantic Scholar API.
Builds intelligent search queries from detected claims.
"""

import json
import logging
import re
from datetime import datetime

from models.schemas import DetectedClaim, Paper, AuditEntry, ResearchQuery
from services.semantic_scholar import SemanticScholarClient, get_mock_papers

logger = logging.getLogger(__name__)


def _build_search_queries(claim: DetectedClaim) -> list[str]:
    """
    Build multiple search queries from a detected claim.
    Uses different angles to maximize paper coverage.
    """
    queries = []

    # Primary: subject + outcome keywords
    subject = claim.subject
    queries.append(f'"{subject}" cognitive decline Alzheimer')

    # Secondary: broader subject search
    queries.append(f'"{subject}" neuroprotective efficacy')

    # Tertiary: outcome-focused
    if "%" in claim.outcome:
        queries.append(f'"{subject}" clinical trial results')

    return queries



async def run_research(
    queries: list[ResearchQuery],
    scholar_client: SemanticScholarClient,
    use_mock: bool = False
) -> tuple[list[Paper], AuditEntry]:
    """
    Main entry point for the Research Agent.
    Searches Semantic Scholar for papers related to the queries.
    Returns papers and an audit entry.
    """
    timestamp = datetime.now().strftime("%H:%M:%S")

    if use_mock:
        # Mock mode
        all_papers = []
        # For mock, we just generate mock papers based on the queries
        # and assign them to the queries.
        # We can just pick the first query as the "claim" proxy for the mock generator
        if queries:
            dummy_claim = DetectedClaim(claim_id="mock", claim_text=queries[0].query)
            mock_papers = get_mock_papers(dummy_claim)
            for i, p in enumerate(mock_papers):
                # Distribute queries across mock papers
                q = queries[i % len(queries)]
                p.query_used = q.query
                p.query_direction = q.direction
                all_papers.append(p)
                
        audit = AuditEntry(
            agent_name="Research Agent",
            timestamp=timestamp,
            stage="Literature Search",
            message=f"Retrieved {len(all_papers)} mock papers.",
            status="complete",
        )
        return all_papers, audit

    # REAL MODE
    all_papers = []
    seen_titles: set[str] = set()

    for q in queries:
        try:
            results = await scholar_client.search_papers(q.query, limit=3)
            for paper in results:
                title_lower = paper.title.lower()
                if title_lower not in seen_titles:
                    seen_titles.add(title_lower)
                    paper.query_used = q.query
                    paper.query_direction = q.direction
                    all_papers.append(paper)
        except Exception as e:
            logger.error(f"Search failed for query '{q.query}': {e}")
            raise Exception(f"Research source failed: {str(e)}")

    if not all_papers:
        # No fallback to mock in real mode!
        logger.warning("No papers found from Semantic Scholar.")

    # Sort by citation count (most cited first) and limit overall to top 15
    all_papers.sort(key=lambda p: p.citation_count or 0, reverse=True)
    top_papers = all_papers[:15]

    audit = AuditEntry(
        agent_name="Research Agent",
        timestamp=timestamp,
        stage="Literature Search",
        message=f"Retrieved {len(top_papers)} unique papers using {len(queries)} queries.",
        status="complete",
    )

    logger.info(f"Research agent found {len(top_papers)} papers")
    return top_papers, audit
