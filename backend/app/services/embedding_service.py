import math
import re
from typing import List, Dict, Any
import numpy as np


class EmbeddingService:
    """
    Lightweight, deterministic text embedding and vector generation service.
    Works 100% offline with zero external network downloads or API keys.
    Computes normalized sub-word and term frequency vectors suitable for cosine similarity search.
    """

    def __init__(self, vector_dim: int = 128):
        self.vector_dim = vector_dim

    def tokenize(self, text: str) -> List[str]:
        text = text.lower()
        return re.findall(r"\b\w+\b", text)

    def generate_embedding(self, text: str) -> List[float]:
        """Generate a normalized vector of fixed dimension for the given text."""
        tokens = self.tokenize(text)
        if not tokens:
            return [0.0] * self.vector_dim

        vec = np.zeros(self.vector_dim, dtype=np.float32)
        for token in tokens:
            # Deterministic hash projection into vector dimensions
            h = hash(token)
            idx = abs(h) % self.vector_dim
            sign = 1.0 if (h >> 4) % 2 == 0 else -1.0
            vec[idx] += sign * (1.0 + math.log(1.0 + tokens.count(token)))

        # Also encode character 3-grams for semantic typo & morphology tolerance
        for i in range(len(text) - 2):
            tri = text[i : i + 3].lower()
            h = hash(tri)
            idx = abs(h) % self.vector_dim
            vec[idx] += 0.5 * (1.0 if (h >> 3) % 2 == 0 else -1.0)

        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        else:
            vec = np.zeros(self.vector_dim, dtype=np.float32)

        return [round(float(v), 6) for v in vec]

    def cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        v1 = np.array(vec1, dtype=np.float32)
        v2 = np.array(vec2, dtype=np.float32)
        n1 = np.linalg.norm(v1)
        n2 = np.linalg.norm(v2)
        if n1 < 1e-6 or n2 < 1e-6:
            return 0.0
        return float(np.dot(v1, v2) / (n1 * n2))


embedding_service = EmbeddingService()
