// ---------- Render de Markdown (convierte **negritas**, ## títulos, tablas, etc.) ----------
function mostrarMarkdown(elemento, texto) {
  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(texto, { breaks: true });
    elemento.innerHTML = window.DOMPurify.sanitize(html);
  } else {
    elemento.textContent = texto; // respaldo si no cargaron las librerías
  }
}


// ---------- Sesión ----------
function guardarSesion(token, usuario) {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("usuario", usuario);
}
function obtenerToken() {
  return sessionStorage.getItem("token");
}
function cerrarSesionLocal() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("usuario");
}

function mostrarApp() {
  document.getElementById("pantalla-login").classList.add("oculto");
  document.getElementById("app").classList.remove("oculto");
  document.getElementById("nombre-usuario").textContent = sessionStorage.getItem("usuario") || "";
}
function mostrarLogin() {
  document.getElementById("app").classList.add("oculto");
  document.getElementById("pantalla-login").classList.remove("oculto");
}

if (obtenerToken()) {
  mostrarApp();
}

document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("error-login");
  errorEl.textContent = "";
  const datos = Object.fromEntries(new FormData(e.target).entries());
  try {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!respuesta.ok) {
      const err = await respuesta.json().catch(() => ({}));
      throw new Error(err.detail || "No se pudo iniciar sesión");
    }
    const resultado = await respuesta.json();
    guardarSesion(resultado.token, resultado.usuario);
    mostrarApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: "Bearer " + obtenerToken() },
    });
  } catch (e) { /* si falla, igual cerramos sesión localmente */ }
  cerrarSesionLocal();
  mostrarLogin();
});

// ---------- Navegación de pestañas (botones + tarjetas de servicio) ----------
function activarPestana(nombreTab) {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === nombreTab));
  document.querySelectorAll(".tarjeta-servicio").forEach((c) => c.classList.toggle("activa", c.dataset.tab === nombreTab));
  document.querySelectorAll(".tab-content").forEach((c) => c.classList.toggle("active", c.id === nombreTab));
}

document.querySelectorAll(".tab-btn, .tarjeta-servicio").forEach((el) => {
  el.addEventListener("click", () => activarPestana(el.dataset.tab));
});

// ---------- Módulo 1: Constructor de protocolos ----------
let ultimoProtocoloGenerado = "";

document.getElementById("form-protocolos").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type="submit"]');
  const bloqueResultado = document.getElementById("bloque-resultado-protocolos");
  const contenedor = document.getElementById("resultado-protocolos");

  bloqueResultado.classList.remove("oculto");
  contenedor.textContent = "Procesando con IA, esto puede tardar unos segundos...";
  boton.disabled = true;

  const formData = new FormData(e.target);
  const archivo = formData.get("archivo");
  const hayArchivo = archivo && archivo.size > 0;

  try {
    let respuesta;
    if (hayArchivo) {
      // Usa el endpoint que acepta multipart/form-data (con PDF adjunto)
      respuesta = await fetch("/api/protocolos/generar-con-archivo", {
        method: "POST",
        headers: { Authorization: "Bearer " + obtenerToken() },
        body: formData,
      });
    } else {
      const datos = {};
      formData.forEach((valor, llave) => {
        if (llave !== "archivo" && valor !== "") datos[llave] = valor;
      });
      respuesta = await fetch("/api/protocolos/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + obtenerToken(),
        },
        body: JSON.stringify(datos),
      });
    }

    if (respuesta.status === 401) {
      cerrarSesionLocal();
      mostrarLogin();
      throw new Error("Tu sesión expiró, vuelve a iniciar sesión.");
    }
    if (!respuesta.ok) {
      const err = await respuesta.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${respuesta.status}`);
    }

    const resultado = await respuesta.json();
    ultimoProtocoloGenerado = resultado.protocolo_markdown;
    mostrarMarkdown(contenedor, ultimoProtocoloGenerado);
  } catch (err) {
    contenedor.textContent = "Ocurrió un error: " + err.message;
    ultimoProtocoloGenerado = "";
  } finally {
    boton.disabled = false;
  }
});

// ---------- Exportar a Word (Módulo 1) ----------
document.getElementById("btn-exportar-word").addEventListener("click", async () => {
  if (!ultimoProtocoloGenerado) return;
  const boton = document.getElementById("btn-exportar-word");
  boton.disabled = true;
  boton.textContent = "Generando Word...";
  try {
    const respuesta = await fetch("/api/protocolos/exportar-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + obtenerToken(),
      },
      body: JSON.stringify({
        protocolo_markdown: ultimoProtocoloGenerado,
        titulo: "Protocolo de investigación",
      }),
    });
    if (!respuesta.ok) throw new Error("No se pudo generar el archivo Word");

    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "protocolo_investigacion.docx";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    boton.disabled = false;
    boton.textContent = "Descargar en Word";
  }
});

// ---------- Módulo 2: Analizador de literatura ----------
let ultimoAnalisisGenerado = "";

document.getElementById("form-literatura").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type="submit"]');
  const bloqueResultado = document.getElementById("bloque-resultado-literatura");
  const contenedor = document.getElementById("resultado-literatura");

  bloqueResultado.classList.remove("oculto");
  contenedor.textContent = "Procesando con IA, esto puede tardar unos segundos...";
  boton.disabled = true;

  const formData = new FormData(e.target);
  const archivo = formData.get("archivo");
  const hayArchivo = archivo && archivo.size > 0;

  try {
    let respuesta;
    if (hayArchivo) {
      respuesta = await fetch("/api/literatura/generar-con-archivo", {
        method: "POST",
        headers: { Authorization: "Bearer " + obtenerToken() },
        body: formData,
      });
    } else {
      const datos = {
        idioma: formData.get("idioma"),
        articulos_texto: formData.get("articulos_texto"),
      };
      respuesta = await fetch("/api/literatura/generar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + obtenerToken(),
        },
        body: JSON.stringify(datos),
      });
    }

    if (respuesta.status === 401) {
      cerrarSesionLocal();
      mostrarLogin();
      throw new Error("Tu sesión expiró, vuelve a iniciar sesión.");
    }
    if (!respuesta.ok) {
      const err = await respuesta.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${respuesta.status}`);
    }

    const resultado = await respuesta.json();
    ultimoAnalisisGenerado = resultado.analisis_markdown;
    mostrarMarkdown(contenedor, ultimoAnalisisGenerado);
  } catch (err) {
    contenedor.textContent = "Ocurrió un error: " + err.message;
    ultimoAnalisisGenerado = "";
  } finally {
    boton.disabled = false;
  }
});

// ---------- Exportar a Word (Módulo 2) ----------
document.getElementById("btn-exportar-word-literatura").addEventListener("click", async () => {
  if (!ultimoAnalisisGenerado) return;
  const boton = document.getElementById("btn-exportar-word-literatura");
  boton.disabled = true;
  boton.textContent = "Generando Word...";
  try {
    const respuesta = await fetch("/api/literatura/exportar-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + obtenerToken(),
      },
      body: JSON.stringify({
        analisis_markdown: ultimoAnalisisGenerado,
        titulo: "Análisis de literatura científica",
      }),
    });
    if (!respuesta.ok) throw new Error("No se pudo generar el archivo Word");

    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "analisis_literatura.docx";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    boton.disabled = false;
    boton.textContent = "Descargar en Word";
  }
});


// ---------- Módulo 3: Detector de errores metodológicos ----------
let ultimoReporteGenerado = "";

document.getElementById("form-errores").addEventListener("submit", async (e) => {
  e.preventDefault();
  const boton = e.target.querySelector('button[type="submit"]');
  const bloqueResultado = document.getElementById("bloque-resultado-errores");
  const contenedor = document.getElementById("resultado-errores");

  bloqueResultado.classList.remove("oculto");
  contenedor.textContent = "Procesando con IA, esto puede tardar unos segundos...";
  boton.disabled = true;

  const formData = new FormData(e.target);
  const archivo = formData.get("archivo");
  const hayArchivo = archivo && archivo.size > 0;

  try {
    let respuesta;
    if (hayArchivo) {
      respuesta = await fetch("/api/errores/revisar-con-archivo", {
        method: "POST",
        headers: { Authorization: "Bearer " + obtenerToken() },
        body: formData,
      });
    } else {
      const datos = {
        idioma: formData.get("idioma"),
        nombre_documento: formData.get("nombre_documento") || null,
        texto_documento: formData.get("texto_documento"),
      };
      respuesta = await fetch("/api/errores/revisar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + obtenerToken(),
        },
        body: JSON.stringify(datos),
      });
    }

    if (respuesta.status === 401) {
      cerrarSesionLocal();
      mostrarLogin();
      throw new Error("Tu sesión expiró, vuelve a iniciar sesión.");
    }
    if (!respuesta.ok) {
      const err = await respuesta.json().catch(() => ({}));
      throw new Error(err.detail || `Error ${respuesta.status}`);
    }

    const resultado = await respuesta.json();
    ultimoReporteGenerado = resultado.reporte_markdown;
    mostrarMarkdown(contenedor, ultimoReporteGenerado);
  } catch (err) {
    contenedor.textContent = "Ocurrió un error: " + err.message;
    ultimoReporteGenerado = "";
  } finally {
    boton.disabled = false;
  }
});

// ---------- Exportar a Word (Módulo 3) ----------
document.getElementById("btn-exportar-word-errores").addEventListener("click", async () => {
  if (!ultimoReporteGenerado) return;
  const boton = document.getElementById("btn-exportar-word-errores");
  boton.disabled = true;
  boton.textContent = "Generando Word...";
  try {
    const respuesta = await fetch("/api/errores/exportar-word", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + obtenerToken(),
      },
      body: JSON.stringify({
        reporte_markdown: ultimoReporteGenerado,
        titulo: "Reporte de revisión metodológica",
      }),
    });
    if (!respuesta.ok) throw new Error("No se pudo generar el archivo Word");

    const blob = await respuesta.blob();
    const url = window.URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "reporte_revision_metodologica.docx";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert(err.message);
  } finally {
    boton.disabled = false;
    boton.textContent = "Descargar en Word";
  }
});

