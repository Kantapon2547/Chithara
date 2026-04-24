from django.conf import settings

from .strategies import (
    MockSongGeneratorStrategy,
    SunoSongGeneratorStrategy,
)


# =========================================================
# FACTORY: SELECT STRATEGY
# =========================================================

def get_song_strategy(mode: str = None):
    """
    Returns the correct SongGeneratorStrategy based on mode.

    Supported modes:
    - "mock"
    - "suno"
    """

    mode = (mode or getattr(settings, "GENERATION_MODE", "mock")).lower().strip()

    if mode == "mock":
        return MockSongGeneratorStrategy()

    if mode == "suno":
        return SunoSongGeneratorStrategy()

    # fallback safety
    return MockSongGeneratorStrategy()