"""Global pytest configuration and fixtures for backend test suite.

Ensures deterministic, hermetic test execution without live external API consumption.
"""
import pytest
from app.core.config import settings


@pytest.fixture(autouse=True)
def ensure_hermetic_test_environment(monkeypatch):
    """Hermetic test isolation: unsets OPENROUTER_API_KEY by default so tests mock AI providers."""
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
