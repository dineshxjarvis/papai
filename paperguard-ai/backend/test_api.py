import httpx
import asyncio

async def test():
    async with httpx.AsyncClient() as client:
        res = await client.post("http://localhost:8000/api/verify", json={
            "text": "Convolutional neural networks achieve higher accuracy than traditional machine learning methods for medical image classification.",
            "id": "test-claim",
            "useMock": True
        }, timeout=60.0)
        with open("response.json", "w", encoding="utf-8") as f:
            f.write(res.text)

asyncio.run(test())
