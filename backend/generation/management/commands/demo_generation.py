"""
python manage.py demo_generation [--strategy mock|suno] [--song-id <id>]

Demonstrates both the mock and Suno strategies.
If no Song exists, creates a temporary one for demo purposes.
"""

from django.core.management.base import BaseCommand
from django.conf import settings

from generation.strategies import (
    MockSongGeneratorStrategy,
    SunoSongGeneratorStrategy,
    SongGenerationRequest,
)
from generation.selector import get_generator


class Command(BaseCommand):
    help = "Demonstrate song generation strategies (mock or suno)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--strategy",
            choices=["mock", "suno"],
            default=None,
            help="Override the active strategy for this run",
        )

    def handle(self, *args, **options):
        strategy_override = options.get("strategy")

        # ── override setting if requested ──────────────────────────────
        if strategy_override:
            settings.GENERATOR_STRATEGY = strategy_override
            self.stdout.write(f"Strategy overridden to: {strategy_override}")

        active = getattr(settings, "GENERATOR_STRATEGY", "mock")
        self.stdout.write(self.style.SUCCESS(f"\n=== Active strategy: {active.upper()} ===\n"))

        # ── build a sample request ──────────────────────────────────────
        request = SongGenerationRequest(
            title="Demo Song",
            prompt="An upbeat pop song about summer adventures",
            style="pop",
            mood="happy",
            duration=30,
        )

        generator = get_generator()
        self.stdout.write(f"Using: {type(generator).__name__}")

        # ── generate ───────────────────────────────────────────────────
        self.stdout.write("\n[1] Calling generate()...")
        result = generator.generate(request)
        self.stdout.write(self.style.SUCCESS(f"  taskId  : {result.task_id}"))
        self.stdout.write(f"  status  : {result.status}")
        self.stdout.write(f"  audioUrl: {result.audio_url}")

        # ── poll status ────────────────────────────────────────────────
        self.stdout.write("\n[2] Calling get_status()...")
        status_result = generator.get_status(result.task_id)
        self.stdout.write(self.style.SUCCESS(f"  taskId  : {status_result.task_id}"))
        self.stdout.write(f"  status  : {status_result.status}")
        self.stdout.write(f"  audioUrl: {status_result.audio_url}")

        self.stdout.write(self.style.SUCCESS("\nDemo complete.\n"))
