from app.services.embedding_service import embedding_service
from app.services.retrieval_service import retrieval_service

def test_embedding_generation():
    text = "Work hours are from 09:30 AM to 05:00 PM."
    emb = embedding_service.generate_embedding(text)
    assert isinstance(emb, list)
    assert len(emb) == 128

    norm = sum(x**2 for x in emb) ** 0.5
    assert abs(norm - 1.0) < 0.05

def test_vector_retrieval():
    query = "What is the policy for mandatory 75% attendance?"
    docs = retrieval_service.retrieve(query, top_k=2)
    assert len(docs) > 0
    # Should retrieve the 75% attendance rule or punctuality policy
    titles = [d["title"] for d in docs]
    assert any("75%" in t or "Attendance" in t or "Punctuality" in t for t in titles)
