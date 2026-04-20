from django.contrib import admin
from .models import GenerationJob


@admin.register(GenerationJob)
class GenerationJobAdmin(admin.ModelAdmin):
    list_display = ("task_id", "song", "strategy", "status", "audio_url", "created_at")
    list_filter = ("strategy", "status")
    search_fields = ("task_id", "song__title")
    readonly_fields = ("task_id", "strategy", "raw_response", "created_at", "updated_at")
