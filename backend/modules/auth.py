"""
Módulo de autenticación — versión simple para MVP académico.

No usa una base de datos de usuarios en producción; en su lugar, valida
contra una lista de usuarios definida en el archivo .env (variable
USUARIOS_PERMITIDOS). Esto es suficiente para el alcance del proyecto
(controlar quién entra: estudiantes/docentes de la maestría), pero NO es
un sistema de autenticación robusto para producción real a gran escala,
consistente con la delimitación del proyecto.

Cómo funciona:
1. El usuario manda su usuario/contraseña a /api/auth/login
2. Si es válido, se genera un token de sesión simple (aleatorio) y se
   guarda en memoria del servidor, asociado a ese usuario.
3. El token se regresa al frontend, que lo guarda y lo manda en cada
   petición siguiente dentro del header "Authorization".
4. Los endpoints protegidos (protocolos, literatura, errores) usan la
   dependencia `usuario_autenticado` para exigir ese token válido.
"""
import os
import secrets
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

# Formato en .env: USUARIOS_PERMITIDOS=docente1:clave123,estudiante1:clave456
def _cargar_usuarios() -> dict[str, str]:
    crudo = os.environ.get("USUARIOS_PERMITIDOS", "")
    usuarios = {}
    for par in crudo.split(","):
        if ":" in par:
            usuario, clave = par.split(":", 1)
            usuarios[usuario.strip()] = clave.strip()
    return usuarios


# Tokens de sesión activos: {token: nombre_usuario}
# En memoria — se pierden si el servidor se reinicia (suficiente para el MVP).
_sesiones_activas: dict[str, str] = {}


class CredencialesLogin(BaseModel):
    usuario: str
    contrasena: str


class RespuestaLogin(BaseModel):
    token: str
    usuario: str


@router.post("/login", response_model=RespuestaLogin)
def login(credenciales: CredencialesLogin) -> RespuestaLogin:
    usuarios = _cargar_usuarios()
    if not usuarios:
        raise HTTPException(
            status_code=500,
            detail=(
                "No hay usuarios configurados. Define USUARIOS_PERMITIDOS "
                "en tu archivo .env, formato: usuario1:clave1,usuario2:clave2"
            ),
        )

    clave_esperada = usuarios.get(credenciales.usuario)
    if clave_esperada is None or clave_esperada != credenciales.contrasena:
        raise HTTPException(status_code=401, detail="Usuario o contraseña incorrectos")

    token = secrets.token_hex(24)
    _sesiones_activas[token] = credenciales.usuario
    return RespuestaLogin(token=token, usuario=credenciales.usuario)


@router.post("/logout")
def logout(authorization: str | None = Header(default=None)):
    token = _extraer_token(authorization)
    _sesiones_activas.pop(token, None)
    return {"estado": "sesion cerrada"}


def _extraer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No se envió sesión (Authorization: Bearer <token>)")
    return authorization.removeprefix("Bearer ").strip()


def usuario_autenticado(authorization: str | None = Header(default=None)) -> str:
    """
    Dependencia de FastAPI: úsala en cualquier endpoint que quieras proteger
    con `Depends(usuario_autenticado)`. Regresa el nombre del usuario si el
    token es válido, o lanza 401 si no.
    """
    token = _extraer_token(authorization)
    usuario = _sesiones_activas.get(token)
    if usuario is None:
        raise HTTPException(status_code=401, detail="Sesión inválida o expirada, vuelve a iniciar sesión")
    return usuario
