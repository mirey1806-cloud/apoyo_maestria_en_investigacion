from dotenv import load_dotenv
load_dotenv()  # Carga las variables desde el archivo .env automáticamente

import os

# IA groq
LLM_PROVIDER = os.environ.get("LLM_PROVIDER", "groq").lower()


GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")

GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")

# Anthropic queda como alternativa
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")


MOCK_MODE = os.environ.get("MOCK_MODE", "true").lower() == "true"


# Idiomas soportados — ampliado según observación del asesor externo
IDIOMAS_SOPORTADOS = ["es", "en", "fr", "pt", "de", "it"]

FORMATOS_SOPORTADOS = [".pdf", ".txt"]

# Tamaño máximo de archivo aceptado (en MB) — ampliado según observación
# del asesor externo. Ajusta este valor en .env si necesitas más.
TAMANO_MAXIMO_ARCHIVO_MB = int(os.environ.get("TAMANO_MAXIMO_ARCHIVO_MB", "50"))

MAX_TOKENS_RESPUESTA = 4096
