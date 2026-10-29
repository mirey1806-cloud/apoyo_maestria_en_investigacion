
from backend.core.config import (
    LLM_PROVIDER, GROQ_API_KEY, GROQ_MODEL,
    ANTHROPIC_API_KEY, ANTHROPIC_MODEL, MAX_TOKENS_RESPUESTA, MOCK_MODE,
)

_client_groq = None
_client_anthropic = None


def _get_client_groq():
    global _client_groq
    if _client_groq is None:
        if not GROQ_API_KEY:
            raise RuntimeError(
                "No se encontró GROQ_API_KEY. Consigue una gratis en "
                "https://console.groq.com y configúrala como variable de "
                "entorno antes de iniciar el servidor (o deja MOCK_MODE=true "
                "para probar sin API key)."
            )
        from groq import Groq
        _client_groq = Groq(api_key=GROQ_API_KEY)
    return _client_groq


def _get_client_anthropic():
    global _client_anthropic
    if _client_anthropic is None:
        if not ANTHROPIC_API_KEY:
            raise RuntimeError(
                "No se encontró ANTHROPIC_API_KEY. Configúrala como variable "
                "de entorno, o usa LLM_PROVIDER=groq (gratis) en su lugar."
            )
        import anthropic
        _client_anthropic = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client_anthropic


def _generar_con_groq(system_prompt: str, mensaje_usuario: str, max_tokens: int) -> str:
    client = _get_client_groq()
    try:
        respuesta = client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": mensaje_usuario},
            ],
        )
        return respuesta.choices[0].message.content
    except Exception as e:
        raise RuntimeError(f"Error al comunicarse con Groq: {e}")


def _generar_con_anthropic(system_prompt: str, mensaje_usuario: str, max_tokens: int) -> str:
    import anthropic
    client = _get_client_anthropic()
    try:
        respuesta = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system_prompt,
            messages=[{"role": "user", "content": mensaje_usuario}],
        )
        return "".join(
            bloque.text for bloque in respuesta.content if bloque.type == "text"
        )
    except anthropic.APIError as e:
        raise RuntimeError(f"Error al comunicarse con Anthropic: {e}")


def generar_respuesta(system_prompt: str, mensaje_usuario: str,
                       max_tokens: int = MAX_TOKENS_RESPUESTA,
                       respuesta_simulada: str | None = None) -> str:
   
    if MOCK_MODE:
        aviso = ("\n\n---\n*[MODO SIMULADO: esta respuesta es de ejemplo, no fue "
                  "generada por IA real. Para usar IA real, configura "
                  f"{'GROQ_API_KEY' if LLM_PROVIDER == 'groq' else 'ANTHROPIC_API_KEY'} "
                  "y MOCK_MODE=false]*")
        if respuesta_simulada:
            return respuesta_simulada + aviso
        return ("(Respuesta simulada genérica: este módulo aún no tiene un "
                 "ejemplo predefinido.)" + aviso)

    if LLM_PROVIDER == "groq":
        return _generar_con_groq(system_prompt, mensaje_usuario, max_tokens)
    elif LLM_PROVIDER == "anthropic":
        return _generar_con_anthropic(system_prompt, mensaje_usuario, max_tokens)
    else:
        raise RuntimeError(
            f"LLM_PROVIDER='{LLM_PROVIDER}' no reconocido. Usa 'groq' o 'anthropic'."
        )
