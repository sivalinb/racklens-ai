from __future__ import annotations

import json
from urllib.request import Request, urlopen


class OpenAICompatibleModel:
    """Optional provider adapter for Fireworks, Mistral, Ollama, or another compatible endpoint."""

    def __init__(self, base_url: str, api_key: str, model: str, timeout: float = 30.0):
        self.url = base_url.rstrip("/") + "/chat/completions"
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    def generate_json(self, system: str, user: str) -> dict:
        payload = json.dumps({
            "model": self.model,
            "temperature": 0,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }).encode()
        request = Request(self.url, data=payload, method="POST", headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"})
        with urlopen(request, timeout=self.timeout) as response:
            data = json.loads(response.read().decode())
        return json.loads(data["choices"][0]["message"]["content"])
