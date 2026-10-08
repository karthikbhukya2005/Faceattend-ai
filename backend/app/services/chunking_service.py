import re
from typing import List, Dict, Any


class ChunkingService:
    """
    Splits extracted documents into overlapping text chunks while preserving
    source metadata. The default settings are intentionally conservative for
    the local FaceAttend RAG pipeline.
    """

    def __init__(self, chunk_size: int = 3200, chunk_overlap: int = 400):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    @staticmethod
    def _clean_text(text: str) -> str:
        text = text.replace("\x00", " ")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n[ \t]+", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def chunk_text(
        self,
        text: str,
        metadata: Dict[str, Any] | None = None,
    ) -> List[Dict[str, Any]]:
        metadata = metadata or {}
        text = self._clean_text(text)

        if not text:
            return []

        chunks: List[Dict[str, Any]] = []
        start = 0
        chunk_index = 0

        while start < len(text):
            end = min(start + self.chunk_size, len(text))

            # Prefer a paragraph/sentence boundary near the target end.
            if end < len(text):
                candidates = [
                    text.rfind("\n\n", start, end),
                    text.rfind(". ", start, end),
                    text.rfind(" ", start, end),
                ]
                boundary = max(candidates)
                if boundary > start + int(self.chunk_size * 0.55):
                    end = boundary + (2 if text[boundary:boundary + 2] == "\n\n" else 1)

            chunk = text[start:end].strip()
            if chunk:
                chunks.append({
                    "chunk_index": chunk_index,
                    "content": chunk,
                    "metadata": {
                        **metadata,
                        "chunk_index": chunk_index,
                        "char_start": start,
                        "char_end": end,
                    },
                })
                chunk_index += 1

            if end >= len(text):
                break

            next_start = max(end - self.chunk_overlap, start + 1)
            start = next_start

        return chunks


chunking_service = ChunkingService()
