import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate

async def test_groq():
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    
    print(f"API Key present: {bool(api_key)}")
    print(f"Model: {model}")
    
    llm = ChatGroq(model=model, groq_api_key=api_key, temperature=0.1)
    
    prompt = PromptTemplate(template="Return a JSON object with a single key 'status' set to 'success' and 'message' set to 'Hello Groq'. Return ONLY valid JSON: {prompt_text}", input_variables=["prompt_text"])
    chain = prompt | llm
    
    response = await chain.ainvoke({"prompt_text": "now"})
    print(f"Response: {response.content}")

if __name__ == "__main__":
    asyncio.run(test_groq())
