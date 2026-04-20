"""
generation/selector.py

Single place that maps the GENERATOR_STRATEGY Django setting (or environment
variable) to the correct concrete strategy instance.

Usage:
    from generation.selector import get_generator
    generator = get_generator()
    result = generator.generate(request)
"""

import os

from django.conf import settings

from .strategies import (
    MockSongGeneratorStrategy,
    SongGeneratorStrategy,
    SunoSongGeneratorStrategy,
)


def get_generator() -> SongGeneratorStrategy:
    """
    Read GENERATOR_STRATEGY from Django settings (falls back to the
    GENERATOR_STRATEGY environment variable, then defaults to 'mock').

    Accepted values (case-insensitive):
        'mock'  → MockSongGeneratorStrategy
        'suno'  → SunoSongGeneratorStrategy
    """
    strategy_name: str = getattr(
        settings,
        "GENERATOR_STRATEGY",
        os.environ.get("GENERATOR_STRATEGY", "mock"),
    ).lower().strip()

    if strategy_name == "mock":
        return MockSongGeneratorStrategy()
    elif strategy_name == "suno":
        return SunoSongGeneratorStrategy()
    else:
        raise ValueError(
            f"Unknown GENERATOR_STRATEGY '{strategy_name}'. "
            "Valid values are: 'mock', 'suno'."
        )
