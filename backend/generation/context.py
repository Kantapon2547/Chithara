class SongGenerationContext:
    def __init__(self, strategy):
        self.strategy = strategy

    def set_strategy(self, strategy):
        self.strategy = strategy

    def generate(self, request):
        return self.strategy.generate(request)

    def get_status(self, task_id):
        return self.strategy.get_status(task_id)