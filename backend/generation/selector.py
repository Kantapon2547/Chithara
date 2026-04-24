"""
generation/selector.py

Single place that maps the GENERATOR_STRATEGY Django setting (or environment
variable) to the correct concrete strategy instance.

Usage:
    from generation.selector import get_generator
    generator = get_generator()
    result = generator.generate(request)
"""

"""
generation/selector.py
"""

from django.conf import settings

from .strategies import (
    MockSongGeneratorStrategy,
    SunoSongGeneratorStrategy,
    SongGeneratorStrategy,
)


def get_generator(mode: str | None = None) -> SongGeneratorStrategy:
    """
    Priority:
    1. request mode (frontend switch)
    2. settings default
    """

    mode = (mode or "").lower().strip()

    print(f"[Selector] mode={mode}")

    # -----------------------------
    # 1. FRONTEND OVERRIDE
    # -----------------------------
    if mode == "suno":
        return SunoSongGeneratorStrategy()

    if mode == "mock":
        return MockSongGeneratorStrategy()

    # -----------------------------
    # 2. SETTINGS FALLBACK
    # -----------------------------
    default_mode = getattr(settings, "GENERATOR_STRATEGY", "mock")
    default_mode = str(default_mode).lower().strip()

    if default_mode == "suno":
        return SunoSongGeneratorStrategy()

    return MockSongGeneratorStrategy()
