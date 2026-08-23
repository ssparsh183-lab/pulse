"""
PULSE — Embedder

Converts text into semantic vectors using a multilingual sentence transformer.
This is what enables "audio nahi aa rahi" and "can't hear" to be recognized
as semantically similar despite different words.

Model is loaded once (singleton) and reused for all embeddings.
"""

import logging
import os
from typing import Optional

import numpy as np
from sentence_transformers import SentenceTransformer


logger = logging.getLogger(__name__)


# Default model — multilingual, lightweight, handles English + Hindi + Hinglish
DEFAULT_MODEL_NAME = "sentence-transformers/LaBSE"

# Cache directory so model is downloaded only once per machine
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", ".model_cache")


class Embedder:
    """
    Wraps SentenceTransformer with lazy loading and a clean interface.
    Meant to be used as a singleton via get_embedder().
    """

    def __init__(self, model_name: str = DEFAULT_MODEL_NAME):
        self.model_name = model_name
        self._model: Optional[SentenceTransformer] = None
        self._dimension: Optional[int] = None

    def load(self) -> None:
        """Explicitly load the model. Idempotent — safe to call multiple times."""
        if self._model is not None:
            return

        logger.info(f"Loading embedding model: {self.model_name}")
        self._model = SentenceTransformer(
            self.model_name,
            cache_folder=MODEL_CACHE_DIR,
        )
        # Trigger one dummy encode to warm up and get dimension
        dummy = self._model.encode("warmup", convert_to_numpy=True)
        self._dimension = int(dummy.shape[0])
        logger.info(f"Model loaded. Embedding dimension: {self._dimension}")

    @property
    def dimension(self) -> int:
        """Vector size produced by this model."""
        if self._dimension is None:
            self.load()
        return self._dimension

    def embed(self, text: str) -> np.ndarray:
        """
        Convert a single text into an embedding vector.
        Returns a 1D numpy array (shape: [dimension]).
        """
        if self._model is None:
            self.load()

        vector = self._model.encode(
            text,
            convert_to_numpy=True,
            normalize_embeddings=True,  # unit-normalized → cosine similarity == dot product
            show_progress_bar=False,
        )
        return vector

    def embed_batch(self, texts: list[str]) -> np.ndarray:
        """
        Convert multiple texts at once. Much faster than calling embed() in a loop.
        Returns a 2D numpy array (shape: [len(texts), dimension]).
        """
        if self._model is None:
            self.load()

        vectors = self._model.encode(
            texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
            batch_size=32,
        )
        return vectors


# Singleton instance — one model shared across the entire app
_embedder_instance: Optional[Embedder] = None


def get_embedder(model_name: Optional[str] = None) -> Embedder:
    """
    Returns the shared Embedder instance. Creates it on first call.
    Pass model_name only if you need to override the default.
    """
    global _embedder_instance
    if _embedder_instance is None:
        _embedder_instance = Embedder(model_name or DEFAULT_MODEL_NAME)
    return _embedder_instance