from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.modules import protocolos, literatura, auth, errores

app = FastAPI(
    title="Sistema Web de Apoyo a la Investigación Científica con IA (Avance)",
    description=(
        "Maestría en Metodología de Investigación y Análisis de Datos (COCID)."
    ),
    version="0.3.0-avance",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(protocolos.router)
app.include_router(literatura.router)
app.include_router(errores.router)


@app.get("/api/salud")
def salud():
    return {"estado": "ok", "fase": "avance semanas 1-3"}


app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
