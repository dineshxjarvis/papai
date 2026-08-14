import asyncio
from typing import Type

from pydantic import BaseModel, Field
from crewai.tools import BaseTool

from services.semantic_scholar import SemanticScholarClient

class SemanticScholarSearchInput(BaseModel):
    """Input schema for SemanticScholarSearchTool."""
    query: str = Field(..., description="The search query to find academic papers.")

class SemanticScholarSearchTool(BaseTool):
    name: str = "Semantic Scholar Search"
    description: str = (
        "Search the Semantic Scholar API for academic papers. "
        "Returns a list of papers with their title, abstract, year, authors, and citation count."
    )
    args_schema: Type[BaseModel] = SemanticScholarSearchInput
    
    # Needs a scholar_client injected when created
    scholar_client: SemanticScholarClient = Field(default=None, exclude=True)
    
    def _run(self, query: str) -> str:
        """Run the tool synchronously (since CrewAI tools are often sync, we wrap the async call)."""
        # Create a new event loop or run in current
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
        if loop.is_running():
            # Create a task to run it in the background if loop is already running
            # In crewai it's safer to use asyncio.run in a separate thread but we'll try this
            import nest_asyncio
            nest_asyncio.apply()
            
        papers = loop.run_until_complete(self.scholar_client.search_papers(query, limit=5))
        
        if not papers:
            return "No papers found for the given query."
            
        results = []
        for p in papers:
            results.append(f"Title: {p.title}\nYear: {p.year}\nCitations: {p.citation_count}\nAbstract: {p.abstract}\n---")
            
        return "\n".join(results)
