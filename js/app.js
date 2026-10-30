/* Lógica de la interfaz: navegación, formularios, diseño, exportación y zona de usuario. */
(function (A) {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = A.esc;
  const view = $("#view");

  let S = A.cargar();
  let vistaActual = "cvs";
  let subtab = "datos";

  /* ---------- Acceso al estado ---------- */
  const perfil = () => S.perfiles.find(p => p.id === S.perfilActivo) || S.perfiles[0];
  const cvActual = () => {
    const p = perfil();
    let c = p.cvs.find(x => x.id === S.cvActivo);
    if (!c && p.cvs.length) { c = p.cvs[0]; S.cvActivo = c.id; }
    return c || null;
  };
  const inicialesDe = n => (n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";
  const fechaCorta = iso => { try { return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch (e) { return ""; } };

  let tGuardar = null;
  function guardarYa() {
    if (!A.guardar(S)) toast("No se pudo guardar: el navegador no tiene más espacio. Quita fotos o borra CV que no uses.", true);
  }
  function guardar() { clearTimeout(tGuardar); tGuardar = setTimeout(guardarYa, 300); }
  function cambio() {
    const c = cvActual(); if (c) c.actualizado = new Date().toISOString();
    guardar(); programarPreview();
  }

  /* ---------- Avisos y ventanas ---------- */
  let tToast = null;
  function toast(msg, err) {
    const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (err ? " err" : "");
    clearTimeout(tToast); tToast = setTimeout(() => { t.className = "toast"; }, err ? 5200 : 2600);
  }
  function modal(html, { ancho } = {}) {
    const root = $("#modal-root");
    root.innerHTML = `<div class="modal-back"><div class="modal${ancho ? " wide" : ""}" role="dialog" aria-modal="true">${html}</div></div>`;
    const back = root.firstElementChild;
    const cerrar = () => { root.innerHTML = ""; document.removeEventListener("keydown", tecla); };
    const tecla = e => { if (e.key === "Escape") cerrar(); };
    document.addEventListener("keydown", tecla);
    back.addEventListener("mousedown", e => { if (e.target === back) cerrar(); });
    const f = back.querySelector("input, textarea, select, button.primary, button"); if (f) setTimeout(() => f.focus(), 30);
    return { el: back.firstElementChild, cerrar };
  }
  function confirmar(titulo, texto, boton = "Eliminar") {
    return new Promise(ok => {
      const m = modal(`<h2>${esc(titulo)}</h2><p class="hint">${texto}</p><div class="foot"><button class="btn" data-no type="button">Cancelar</button><button class="btn danger fill" data-si type="button">${esc(boton)}</button></div>`);
      m.el.querySelector("[data-no]").onclick = () => { m.cerrar(); ok(false); };
      m.el.querySelector("[data-si]").onclick = () => { m.cerrar(); ok(true); };
    });
  }
  function pedirTexto(titulo, valor, boton = "Guardar") {
    return new Promise(ok => {
      const m = modal(`<h2>${esc(titulo)}</h2><form><label class="field"><span>Nombre</span><input type="text" id="mInput" value="${esc(valor)}" maxlength="80"></label>
        <div class="foot" style="margin-top:16px"><button class="btn" data-no type="button">Cancelar</button><button class="btn primary" type="submit">${esc(boton)}</button></div></form>`);
      const inp = m.el.querySelector("#mInput"); setTimeout(() => { inp.focus(); inp.select(); }, 40);
      m.el.querySelector("[data-no]").onclick = () => { m.cerrar(); ok(null); };
      m.el.querySelector("form").onsubmit = e => { e.preventDefault(); const v = inp.value.trim(); m.cerrar(); ok(v || null); };
    });
  }
  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  const slug = s => (s || "cv").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "") || "cv";

  /* ---------- Barra superior ---------- */
  function pintarBarra() {
    const p = perfil(), c = cvActual();
    const chip = $("#cvChip");
    chip.textContent = c ? c.titulo : "Sin CV";
    chip.hidden = !c || vistaActual === "cvs" || vistaActual === "perfil";
    const u = $("#userChip"); u.textContent = inicialesDe(p.nombre); u.style.background = p.color; u.title = "Mi perfil: " + p.nombre;
    $("#btnPdfTop").disabled = !c;
    $$("#nav a").forEach(a => a.classList.toggle("on", a.dataset.view === vistaActual));
  }
  $("#cvChip").onclick = async () => {
    const c = cvActual(); if (!c) return;
    const v = await pedirTexto("Cambiar el nombre del CV", c.titulo);
    if (v) { c.titulo = v; cambio(); pintarBarra(); }
  };
  $("#btnPdfTop").onclick = () => exportarPDF();

  /* ---------- Vista previa ---------- */
  let tPrev = null;
  function programarPreview() { clearTimeout(tPrev); tPrev = setTimeout(pintarPreview, 160); }
  function escalar(wrap) {
    const cv = wrap.firstElementChild; if (!cv) return;
    const s = wrap.clientWidth / A.PAGE_W;
    cv.style.transform = `scale(${s})`;
    wrap.style.height = (cv.offsetHeight * s) + "px";
    $$(".page-break", wrap).forEach((b, i) => { b.style.top = ((i + 1) * A.PAGE_H * s) + "px"; });
  }
  function pintarPreview() {
    const c = cvActual();
    $$(".preview-wrap").forEach(wrap => {
      if (!c) { wrap.innerHTML = ""; return; }
      const r = A.cvAjustado(c);
      let cortes = "";
      for (let i = 1; i < r.paginas; i++) cortes += `<div class="page-break"><span>Página ${i + 1}</span></div>`;
      wrap.innerHTML = r.html + cortes;
      escalar(wrap);
      const info = wrap.closest(".pane-preview") && wrap.closest(".pane-preview").querySelector("[data-pages]");
      if (info) info.textContent = r.paginas === 1 ? "1 página A4" : `${r.paginas} páginas A4`;
    });
    if (vistaActual === "diseno") pintarMiniaturasPlantillas();
  }
  const ro = "ResizeObserver" in window ? new ResizeObserver(entries => entries.forEach(e => {
    if (e.target.classList.contains("preview-wrap")) escalar(e.target); else ajustarMiniaturas(e.target);
  })) : null;

  function panelPreview(titulo) {
    return `<div class="pane-preview"><div class="preview-bar"><b>${esc(titulo || "Vista previa")}</b><span data-pages></span>
      <button class="btn small grow" type="button" data-cerrar-preview>Cerrar</button></div><div class="preview-wrap"></div></div>`;
  }
  function montarPreview() {
    $$(".preview-wrap").forEach(w => ro && ro.observe(w));
    const split = $(".split");
    const fab = $(".fab-preview");
    if (fab && split) fab.onclick = () => { split.classList.add("show-preview"); pintarPreview(); };
    $$("[data-cerrar-preview]").forEach(b => { b.onclick = () => split && split.classList.remove("show-preview"); });
    pintarPreview();
  }

  function ajustarMiniaturas(root) {
    $$(".thumb", root).forEach(t => { const cv = t.firstElementChild; if (cv) cv.style.transform = `scale(${t.clientWidth / A.PAGE_W})`; });
  }

  /* ---------- Navegación ---------- */
  const VISTAS = { cvs: vistaCVs, editor: vistaEditor, diseno: vistaDiseno, exportar: vistaExportar, perfil: vistaPerfil };
  function ir() {
    const h = (location.hash || "#cvs").slice(1);
    vistaActual = VISTAS[h] ? h : "cvs";
    if (["editor", "diseno", "exportar"].includes(vistaActual) && !cvActual()) vistaActual = "cvs";
    if (ro) ro.disconnect();
    view.onclick = null;
    VISTAS[vistaActual]();
    pintarBarra();
    view.scrollTop = 0;
  }
  window.addEventListener("hashchange", ir);
  function navegar(v) { if (location.hash === "#" + v) ir(); else location.hash = v; }

  const SIN_CV = `<div class="empty"><b>Este perfil no tiene ningún CV.</b><span>Crea uno nuevo desde «Mis CV».</span><a class="btn primary" href="#cvs">Ir a Mis CV</a></div>`;

  /* =========================================================
     MIS CV
     ========================================================= */
  function vistaCVs() {
    const p = perfil();
    const cvs = p.cvs.slice().sort((a, b) => (b.actualizado || "").localeCompare(a.actualizado || ""));
    view.innerHTML = `
      <div class="page-head"><div><h1>Mis currículums</h1><p>Perfil «${esc(p.nombre)}» · ${cvs.length} ${cvs.length === 1 ? "CV" : "CV"}</p></div>
        <div class="actions"><button class="btn" type="button" data-importar>Importar archivo</button><button class="btn primary" type="button" data-nuevo>Nuevo CV</button></div></div>
      <div class="cv-grid">
        ${cvs.map(c => {
          const t = A.plantilla(c.plantilla), r = A.cvAjustado(c);
          return `<article class="cv-card${c.id === S.cvActivo ? " on" : ""}" data-id="${c.id}">
            <button class="thumb-btn" type="button" data-abrir aria-label="Abrir ${esc(c.titulo)}"><div class="thumb">${r.html}</div></button>
            <div class="info"><b>${esc(c.titulo)}</b>
              <span class="meta">${esc(t.nombre)} · ${r.paginas} ${r.paginas === 1 ? "página" : "páginas"} · editado ${fechaCorta(c.actualizado)}</span>
              ${c.id === S.cvActivo ? `<span><span class="badge">Abierto</span></span>` : ""}
              <div class="row"><button class="btn small primary" type="button" data-abrir>Editar</button><button class="btn small" type="button" data-dup>Duplicar</button>
                <button class="btn small" type="button" data-ren>Renombrar</button><button class="btn small ghost danger" type="button" data-del>Eliminar</button></div>
            </div></article>`;
        }).join("")}
        <div class="new-card"><b>Empieza un CV</b><div class="btns">
          <button class="btn primary" type="button" data-nuevo>En blanco</button>
          <button class="btn" type="button" data-ejemplo>Con datos de ejemplo</button>
          ${S.cvActivo && cvActual() ? `<button class="btn" type="button" data-copia-datos>Con mis datos personales</button>` : ""}
        </div></div>
      </div>`;
    const grid = $(".cv-grid", view);
    ajustarMiniaturas(grid); if (ro) ro.observe(grid);
    view.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      const card = b.closest(".cv-card"); const c = card && p.cvs.find(x => x.id === card.dataset.id);
      if (b.hasAttribute("data-abrir") && c) { S.cvActivo = c.id; guardarYa(); navegar("editor"); }
      else if (b.hasAttribute("data-dup") && c) {
        const n = A.normalizarCV(JSON.parse(JSON.stringify(c))); n.id = A.uid(); n.titulo = c.titulo + " (copia)"; n.creado = n.actualizado = new Date().toISOString();
        p.cvs.push(n); guardarYa(); vistaCVs(); toast("CV duplicado.");
      }
      else if (b.hasAttribute("data-ren") && c) { const v = await pedirTexto("Cambiar el nombre del CV", c.titulo); if (v) { c.titulo = v; guardarYa(); vistaCVs(); } }
      else if (b.hasAttribute("data-del") && c) {
        if (await confirmar("Eliminar CV", `Se eliminará «${esc(c.titulo)}» de este navegador. No se puede deshacer.`)) {
          p.cvs = p.cvs.filter(x => x !== c); if (S.cvActivo === c.id) S.cvActivo = p.cvs[0] ? p.cvs[0].id : null;
          guardarYa(); vistaCVs(); pintarBarra(); toast("CV eliminado.");
        }
      }
      else if (b.hasAttribute("data-nuevo")) { const v = await pedirTexto("Nuevo CV", "Mi currículum", "Crear"); if (v) crearCV(A.cvVacio(v)); }
      else if (b.hasAttribute("data-ejemplo")) crearCV(A.cvEjemplo());
      else if (b.hasAttribute("data-copia-datos")) {
        const base = cvActual(); const v = await pedirTexto("Nuevo CV con tus datos personales", "Nuevo CV", "Crear"); if (!v) return;
        const n = A.cvVacio(v); n.datos.personal = JSON.parse(JSON.stringify(base.datos.personal)); n.plantilla = base.plantilla; n.diseno = Object.assign({}, base.diseno);
        crearCV(n);
      }
      else if (b.hasAttribute("data-importar")) importarArchivo();
    };
  }
  function crearCV(cv) { perfil().cvs.push(cv); S.cvActivo = cv.id; subtab = "datos"; guardarYa(); navegar("editor"); toast("CV creado."); }

  /* =========================================================
     EDITOR
     ========================================================= */
  const ICO = {
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    del: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    eye: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  const SUBTABS = [
    { id: "datos", nombre: "Datos personales" }, { id: "perfil", nombre: "Perfil" }, { id: "experiencia", nombre: "Experiencia" },
    { id: "formacion", nombre: "Formación" }, { id: "aptitudes", nombre: "Aptitudes" }, { id: "idiomas", nombre: "Idiomas" }, { id: "meritos", nombre: "Cursos y méritos" }
  ];

  function vistaEditor() {
    const c = cvActual(); if (!c) { view.innerHTML = SIN_CV; return; }
    view.innerHTML = `<div class="split"><div class="pane-form">
        <div class="subtabs" role="tablist" id="subtabs"></div><div class="stack" id="formBody"></div></div>
        ${panelPreview()}</div>
      <button class="btn primary fab-preview" type="button">${ICO.eye}Vista previa</button>`;
    pintarSubtabs(); pintarFormulario(); montarPreview();
    $("#subtabs").onclick = e => { const b = e.target.closest("[data-tab]"); if (!b) return; subtab = b.dataset.tab; pintarSubtabs(); pintarFormulario(); view.scrollTop = 0; };
    const fb = $("#formBody");
    fb.addEventListener("input", onInput); fb.addEventListener("change", onInput); fb.addEventListener("click", onClickForm);
  }
  function contar(id, d) {
    if (["experiencia", "formacion", "idiomas", "meritos"].includes(id)) return d[id].length;
    if (id === "aptitudes") return d.aptitudes.filter(x => x.trim()).length;
    return null;
  }
  function pintarSubtabs() {
    const d = cvActual().datos;
    $("#subtabs").innerHTML = SUBTABS.map(t => { const n = contar(t.id, d);
      return `<button type="button" role="tab" data-tab="${t.id}" class="${t.id === subtab ? "on" : ""}" aria-selected="${t.id === subtab}">${t.nombre}${n != null ? `<span class="n">${n}</span>` : ""}</button>`; }).join("");
  }
  const idDe = path => "f-" + path.replace(/[^\w]/g, "_");
  const inp = (label, path, val, type = "text", ph = "") =>
    `<label class="field"><span>${label}</span><input type="${type}" id="${idDe(path)}" data-bind="${path}" value="${esc(val)}" placeholder="${esc(ph)}"></label>`;
  const ctl = (path, i, len, que) => `
    <button class="icon-btn" type="button" data-act="up" data-path="${path}" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir ${que}">${ICO.up}</button>
    <button class="icon-btn" type="button" data-act="down" data-path="${path}" data-i="${i}" ${i === len - 1 ? "disabled" : ""} aria-label="Bajar ${que}">${ICO.down}</button>
    <button class="icon-btn del" type="button" data-act="del" data-path="${path}" data-i="${i}" aria-label="Borrar ${que}">${ICO.del}</button>`;
  const lineas = (path, arr, ph, multi) => `<div class="lines">${arr.map((t, i) => `<div class="line">
      ${multi ? `<textarea id="${idDe(path + "." + i)}" data-bind="${path}.${i}" placeholder="${esc(ph)}">${esc(t)}</textarea>`
              : `<input type="text" id="${idDe(path + "." + i)}" data-bind="${path}.${i}" value="${esc(t)}" placeholder="${esc(ph)}">`}
      ${ctl(path, i, arr.length, "línea")}</div>`).join("")}</div>`;
  const tituloSeccion = clave => { const s = cvActual().secciones.find(x => x.clave === clave); return s && s.titulo ? s.titulo : A.seccionDef(clave).titulo; };
  const avisoOculta = clave => { const s = cvActual().secciones.find(x => x.clave === clave); return s && !s.visible ? `<p class="hint">Esta sección está oculta en el CV. Puedes mostrarla en <a href="#diseno">Diseño</a>.</p>` : ""; };

  function pintarFormulario() {
    const c = cvActual(), d = c.datos, p = d.personal, fb = $("#formBody");
    let h = "";
    switch (subtab) {
      case "datos": {
        const e = A.edad(p.fechaNacimiento);
        h = `<div class="card"><h2>Foto e identidad</h2>
          <div class="photo-row">${p.foto ? `<img class="avatar" src="${p.foto}" alt="Foto actual">` : `<div class="avatar">${esc(A.iniciales(p)) || "?"}</div>`}
            <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn small" type="button" data-foto="subir">${p.foto ? "Cambiar foto" : "Subir foto"}</button>
            ${p.foto ? `<button class="btn small" type="button" data-foto="ajustar">Ajustar encuadre y luz</button><button class="btn small ghost danger" type="button" data-foto="quitar">Quitar</button>` : ""}</div></div>
          <div class="grid2">${inp("Nombre", "personal.nombre", p.nombre)}${inp("Apellidos", "personal.apellidos", p.apellidos)}</div>
          ${inp("Titular profesional (opcional)", "personal.titular", p.titular, "text", "Por ejemplo: Responsable de almacén")}
          <p class="hint">El nombre aparece en dos colores: el nombre con el color de acento y los apellidos en gris.</p></div>
        <div class="card"><h2>Contacto</h2><div class="grid2">
          ${inp("Teléfono", "personal.telefono", p.telefono, "tel")}${inp("Correo electrónico", "personal.email", p.email, "email")}
          ${inp("Dirección", "personal.direccion", p.direccion)}${inp("Localidad", "personal.localidad", p.localidad)}
          ${inp("Web o LinkedIn (opcional)", "personal.web", p.web, "text", "linkedin.com/in/…")}</div></div>
        <div class="card"><h2>${esc(tituloSeccion("personal"))}</h2>${avisoOculta("personal")}<div class="grid2">
          <label class="field"><span>Fecha de nacimiento</span><input type="date" id="f-fn" data-bind="personal.fechaNacimiento" value="${esc(p.fechaNacimiento)}"></label>
          <div class="field"><span>Mostrar en el CV</span>
            <label class="check"><input type="checkbox" id="f-mfecha" data-bind="personal.mostrarFecha" ${p.mostrarFecha ? "checked" : ""}> Fecha de nacimiento</label>
            <label class="check"><input type="checkbox" id="f-medad" data-bind="personal.mostrarEdad" ${p.mostrarEdad ? "checked" : ""}> Edad <span class="hint" id="edadOut">${e !== null ? `(${e} años)` : ""}</span></label></div>
          ${inp("Carné de conducir", "personal.carnet", p.carnet, "text", "B, C1…")}
          <div class="field"><span>Vehículo</span><label class="check"><input type="checkbox" id="f-veh" data-bind="personal.vehiculo" ${p.vehiculo ? "checked" : ""}> Vehículo propio</label></div>
          ${inp("Disponibilidad", "personal.disponibilidad", p.disponibilidad, "text", "Mañana, tarde y noche.")}
          ${inp("Incorporación", "personal.incorporacion", p.incorporacion, "text", "Incorporación inmediata")}</div>
          <div class="sub">Otros datos</div>${lineas("personal.otros", p.otros, "Por ejemplo: Certificado de discapacidad 33 %", false)}
          <div><button class="btn small" type="button" data-add="personal.otros">+ Añadir dato</button></div></div>`;
        break;
      }
      case "perfil":
        h = `<div class="card"><h2>${esc(tituloSeccion("perfil"))}</h2>${avisoOculta("perfil")}
          <p class="hint">Dos o tres frases sobre tu experiencia y lo que aportas. Entre 200 y 350 caracteres suele funcionar bien.</p>
          <label class="field"><span>Resumen</span><textarea id="f-perfil" data-bind="perfil" rows="6" style="min-height:140px">${esc(d.perfil)}</textarea></label>
          <span class="hint" id="perfilCount">${d.perfil.length} caracteres</span></div>`;
        break;
      case "experiencia":
        h = `<div class="card"><div class="card-head"><h2>${esc(tituloSeccion("experiencia"))}</h2><button class="btn small primary" type="button" data-add="experiencia">+ Añadir puesto</button></div>${avisoOculta("experiencia")}
          ${d.experiencia.length ? "" : `<div class="empty">Todavía no hay puestos. Añade el más reciente primero.</div>`}
          ${d.experiencia.map((j, i) => `<div class="item">
            <div class="item-head"><b>${esc(j.puesto) || "Puesto nuevo"}</b>${ctl("experiencia", i, d.experiencia.length, "puesto")}</div>
            <div class="grid2">${inp("Puesto", `experiencia.${i}.puesto`, j.puesto)}${inp("Empresa", `experiencia.${i}.empresa`, j.empresa)}
              ${inp("Ciudad", `experiencia.${i}.ciudad`, j.ciudad)}
              <label class="field"><span>Inicio</span><input type="month" id="f-ex${i}ini" data-bind="experiencia.${i}.inicio" value="${esc(j.inicio)}"></label>
              <label class="field"><span>Fin</span><input type="month" id="f-ex${i}fin" data-bind="experiencia.${i}.fin" value="${esc(j.fin)}" ${j.actual ? "disabled" : ""}></label>
              <div class="field"><span>&nbsp;</span><label class="check"><input type="checkbox" id="f-ex${i}act" data-bind="experiencia.${i}.actual" ${j.actual ? "checked" : ""}> Trabajo aquí actualmente</label></div></div>
            <div class="sub">Funciones y logros</div>
            ${lineas(`experiencia.${i}.tareas`, j.tareas, "Empieza por un verbo en infinitivo: Coordinar, Gestionar…", true)}
            <div><button class="btn small" type="button" data-add="experiencia.${i}.tareas">+ Añadir función</button></div></div>`).join("")}
          ${d.experiencia.length > 1 ? `<div><button class="btn small" type="button" data-ordenar>Ordenar por fecha (más reciente primero)</button></div>` : ""}
          <p class="hint">Para poner subpuntos dentro de una función, escribe cada uno en una línea nueva que empiece por «*».</p></div>`;
        break;
      case "formacion":
        h = `<div class="card"><div class="card-head"><h2>${esc(tituloSeccion("formacion"))}</h2><button class="btn small primary" type="button" data-add="formacion">+ Añadir estudio</button></div>${avisoOculta("formacion")}
          ${d.formacion.length ? "" : `<div class="empty">Todavía no hay estudios.</div>`}
          ${d.formacion.map((f, i) => `<div class="item"><div class="item-head"><b>${esc(f.centro) || "Estudio nuevo"}</b>${ctl("formacion", i, d.formacion.length, "estudio")}</div>
            <div class="grid2">${inp("Centro", `formacion.${i}.centro`, f.centro)}${inp("Titulación", `formacion.${i}.titulo`, f.titulo)}
            ${inp("Año", `formacion.${i}.anio`, f.anio, "text", "2016")}${inp("Ciudad", `formacion.${i}.ciudad`, f.ciudad)}</div></div>`).join("")}</div>`;
        break;
      case "aptitudes":
        h = `<div class="card"><div class="card-head"><h2>${esc(tituloSeccion("aptitudes") || "Aptitudes")}</h2><button class="btn small primary" type="button" data-add="aptitudes">+ Añadir aptitud</button></div>${avisoOculta("aptitudes")}
          ${lineas("aptitudes", d.aptitudes, "Una aptitud o conocimiento", true)}
          <p class="hint">Si dejas el título de esta sección vacío en Diseño, las aptitudes aparecen unidas a Formación, como en «Formación y aptitudes».</p></div>`;
        break;
      case "idiomas":
        h = `<div class="card"><div class="card-head"><h2>${esc(tituloSeccion("idiomas"))}</h2><button class="btn small primary" type="button" data-add="idiomas">+ Añadir idioma</button></div>${avisoOculta("idiomas")}
          ${d.idiomas.length ? "" : `<div class="empty">Sin idiomas. Si no añades ninguno, la sección no aparece en el CV.</div>`}
          ${d.idiomas.map((x, i) => `<div class="item"><div class="item-head"><b>${esc(x.idioma) || "Idioma nuevo"}</b>${ctl("idiomas", i, d.idiomas.length, "idioma")}</div>
            <div class="grid2">${inp("Idioma", `idiomas.${i}.idioma`, x.idioma)}${inp("Nivel", `idiomas.${i}.nivel`, x.nivel, "text", "B1, nativo, básico…")}</div></div>`).join("")}</div>`;
        break;
      case "meritos":
        h = `<div class="card"><div class="card-head"><h2>${esc(tituloSeccion("meritos"))}</h2><button class="btn small primary" type="button" data-add="meritos">+ Añadir curso o mérito</button></div>${avisoOculta("meritos")}
          ${d.meritos.length ? "" : `<div class="empty">Sin cursos ni méritos todavía.</div>`}
          ${d.meritos.map((m, i) => `<div class="item"><div class="item-head"><b>${esc(m.titulo) || "Mérito nuevo"}</b>${ctl("meritos", i, d.meritos.length, "mérito")}</div>
            <div class="grid2">${inp("Curso o actividad", `meritos.${i}.titulo`, m.titulo)}${inp("Entidad", `meritos.${i}.entidad`, m.entidad)}
            ${inp("Horas", `meritos.${i}.horas`, m.horas, "text", "Opcional")}${inp("Año", `meritos.${i}.anio`, m.anio, "text", "2022")}</div></div>`).join("")}</div>`;
        break;
    }
    fb.innerHTML = h;
  }

  const getAt = path => path.split(".").reduce((o, k) => o[k], cvActual().datos);
  function setAt(path, val) { const ks = path.split("."); const last = ks.pop(); ks.reduce((o, k) => o[k], cvActual().datos)[last] = val; }

  function onInput(ev) {
    const el = ev.target, b = el.dataset.bind; if (!b) return;
    if (ev.type === "change" && el.type !== "checkbox" && el.type !== "date" && el.type !== "month") return;
    setAt(b, el.type === "checkbox" ? el.checked : el.value);
    if (b === "personal.fechaNacimiento") { const e = A.edad(el.value); const o = $("#edadOut"); if (o) o.textContent = e !== null ? `(${e} años)` : ""; }
    if (b === "perfil") { const o = $("#perfilCount"); if (o) o.textContent = el.value.length + " caracteres"; }
    const m = b.match(/^experiencia\.(\d+)\.actual$/); if (m) { const f = $(`#f-ex${m[1]}fin`); if (f) f.disabled = el.checked; }
    const head = el.closest(".item") && el.closest(".item").querySelector(".item-head b");
    if (head && /^(experiencia\.\d+\.puesto|formacion\.\d+\.centro|idiomas\.\d+\.idioma|meritos\.\d+\.titulo)$/.test(b)) head.textContent = el.value || "Sin título";
    cambio();
  }

  async function onClickForm(ev) {
    const a = ev.target.closest("[data-act]");
    if (a) {
      const arr = getAt(a.dataset.path), i = +a.dataset.i;
      if (a.dataset.act === "del") {
        const esObjeto = typeof arr[i] === "object";
        if (esObjeto && !(await confirmar("Eliminar entrada", "Se borrará esta entrada del CV.", "Eliminar"))) return;
        arr.splice(i, 1);
      }
      if (a.dataset.act === "up" && i > 0) [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
      if (a.dataset.act === "down" && i < arr.length - 1) [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]];
      pintarFormulario(); pintarSubtabs(); cambio(); return;
    }
    const add = ev.target.closest("[data-add]");
    if (add) {
      const path = add.dataset.add, arr = getAt(path); let foco;
      if (path === "experiencia") { arr.unshift({ id: A.uid(), puesto: "", empresa: "", ciudad: "", inicio: "", fin: "", actual: false, tareas: [""] }); foco = "#f-experiencia_0_puesto"; }
      else if (path === "formacion") { arr.push({ id: A.uid(), centro: "", titulo: "", anio: "", ciudad: "" }); foco = `#f-formacion_${arr.length - 1}_centro`; }
      else if (path === "idiomas") { arr.push({ id: A.uid(), idioma: "", nivel: "" }); foco = `#f-idiomas_${arr.length - 1}_idioma`; }
      else if (path === "meritos") { arr.push({ id: A.uid(), titulo: "", entidad: "", horas: "", anio: "" }); foco = `#f-meritos_${arr.length - 1}_titulo`; }
      else { arr.push(""); foco = "#" + idDe(path + "." + (arr.length - 1)); }
      pintarFormulario(); pintarSubtabs(); cambio();
      const f = $(foco); if (f) { f.focus(); f.scrollIntoView({ block: "center", behavior: "smooth" }); }
      return;
    }
    if (ev.target.closest("[data-ordenar]")) {
      cvActual().datos.experiencia.sort((x, y) => { const k = j => j.actual ? "9999-99" : (j.fin || j.inicio || ""); return k(y).localeCompare(k(x)); });
      pintarFormulario(); cambio(); return;
    }
    const fo = ev.target.closest("[data-foto]");
    if (fo) {
      const p = cvActual().datos.personal;
      if (fo.dataset.foto === "subir") $("#fileFoto").click();
      if (fo.dataset.foto === "ajustar") editorFoto(p.fotoOriginal || p.foto, p.fotoAjuste);
      if (fo.dataset.foto === "quitar") { p.foto = ""; p.fotoOriginal = ""; p.fotoAjuste = null; pintarFormulario(); cambio(); }
    }
  }

  /* ---------- Foto: subir y ajustar ---------- */
  $("#fileFoto").onchange = () => {
    const f = $("#fileFoto").files[0]; $("#fileFoto").value = ""; if (!f) return;
    const url = URL.createObjectURL(f), img = new Image();
    img.onload = () => {
      const max = 1000, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      editorFoto(c.toDataURL("image/jpeg", 0.9), null, true);
    };
    img.onerror = () => toast("No se pudo abrir esa imagen. Prueba con un JPG o PNG.", true);
    img.src = url;
  };

  function editorFoto(src, ajuste, nueva) {
    if (!src) return;
    const a = Object.assign({ zoom: 100, x: 0, y: 0, brillo: 100, contraste: 100 }, ajuste || {});
    const m = modal(`<h2>Ajustar la foto</h2>
      <div class="photo-editor"><canvas id="fotoCanvas" width="400" height="400" aria-label="Vista previa de la foto"></canvas>
        <div class="opts">
          ${[["zoom", "Zoom", 100, 300, "%"], ["x", "Mover horizontal", -50, 50, ""], ["y", "Mover vertical", -50, 50, ""], ["brillo", "Luz", 60, 160, "%"], ["contraste", "Contraste", 70, 140, "%"]]
            .map(([k, l, mi, ma, u]) => `<label class="field"><span>${l}</span><div class="range-row"><input type="range" id="fe-${k}" min="${mi}" max="${ma}" value="${a[k]}"><output id="fe-${k}-o">${a[k]}${u}</output></div></label>`).join("")}
          <button class="btn small ghost" type="button" data-reset>Restablecer</button>
        </div></div>
      <div class="foot"><button class="btn" type="button" data-no>Cancelar</button><button class="btn primary" type="button" data-ok>Usar esta foto</button></div>`, { ancho: true });
    const cv = m.el.querySelector("#fotoCanvas"), g = cv.getContext("2d");
    const img = new Image();
    const dibujar = (destino, S) => {
      const s0 = Math.min(img.width, img.height) / (a.zoom / 100);
      const cx = img.width / 2 + (a.x / 100) * img.width * 0.5, cy = img.height / 2 + (a.y / 100) * img.height * 0.5;
      const sx = Math.max(0, Math.min(img.width - s0, cx - s0 / 2)), sy = Math.max(0, Math.min(img.height - s0, cy - s0 / 2));
      const ctx = destino.getContext("2d");
      ctx.fillStyle = "#f2f2f2"; ctx.fillRect(0, 0, S, S);
      ctx.drawImage(img, sx, sy, Math.min(s0, img.width), Math.min(s0, img.height), 0, 0, S, S);
      if (a.brillo !== 100 || a.contraste !== 100) {
        const d = ctx.getImageData(0, 0, S, S), px = d.data;
        const gamma = 100 / a.brillo, k = a.contraste / 100;
        const lut = new Uint8ClampedArray(256);
        for (let i = 0; i < 256; i++) { let v = 255 * Math.pow(i / 255, gamma); v = (v - 128) * k + 128; lut[i] = v; }
        for (let i = 0; i < px.length; i += 4) { px[i] = lut[px[i]]; px[i + 1] = lut[px[i + 1]]; px[i + 2] = lut[px[i + 2]]; }
        ctx.putImageData(d, 0, 0);
      }
    };
    const pintar = () => dibujar(cv, 400);
    img.onload = pintar; img.src = src;
    const unidades = { zoom: "%", x: "", y: "", brillo: "%", contraste: "%" };
    Object.keys(unidades).forEach(k => {
      const r = m.el.querySelector("#fe-" + k);
      r.oninput = () => { a[k] = +r.value; m.el.querySelector(`#fe-${k}-o`).textContent = r.value + unidades[k]; pintar(); };
    });
    m.el.querySelector("[data-reset]").onclick = () => {
      Object.assign(a, { zoom: 100, x: 0, y: 0, brillo: 100, contraste: 100 });
      Object.keys(unidades).forEach(k => { m.el.querySelector("#fe-" + k).value = a[k]; m.el.querySelector(`#fe-${k}-o`).textContent = a[k] + unidades[k]; });
      pintar();
    };
    m.el.querySelector("[data-no]").onclick = () => m.cerrar();
    m.el.querySelector("[data-ok]").onclick = () => {
      const out = document.createElement("canvas"); out.width = out.height = 400; dibujar(out, 400);
      const p = cvActual().datos.personal;
      p.foto = out.toDataURL("image/jpeg", 0.88); p.fotoOriginal = src; p.fotoAjuste = Object.assign({}, a);
      m.cerrar(); if (vistaActual === "editor") pintarFormulario(); cambio(); toast(nueva ? "Foto añadida." : "Foto ajustada.");
    };
  }

  /* =========================================================
     DISEÑO
     ========================================================= */
  const PRESETS = ["#5b8a8c", "#2f6f6b", "#2e64a3", "#1f3a5f", "#7a2a3e", "#b0413e", "#c25b2e", "#a77a12", "#55702a", "#7d4f8f", "#3a3f44"];

  function vistaDiseno() {
    const c = cvActual(); if (!c) { view.innerHTML = SIN_CV; return; }
    view.innerHTML = `<div class="split"><div class="stack" id="disenoForm"></div>${panelPreview()}</div>
      <button class="btn primary fab-preview" type="button">${ICO.eye}Vista previa</button>`;
    pintarDiseno(); montarPreview();
    const f = $("#disenoForm");
    f.addEventListener("click", onClickDiseno);
    f.addEventListener("input", onInputDiseno);
    f.addEventListener("change", onInputDiseno);
  }

  function pintarDiseno() {
    const c = cvActual(), t = A.plantilla(c.plantilla), di = c.diseno, pal = A.paleta(c);
    const fuenteSel = di.fuente || "";
    $("#disenoForm").innerHTML = `
      <div class="card"><div class="card-head"><h2>Plantilla</h2><span class="hint">${esc(t.nombre)}: ${esc(t.desc)}</span></div>
        <div class="tpl-grid" id="tplGrid">${A.PLANTILLAS.map(x => `<button type="button" class="tpl${x.id === c.plantilla ? " on" : ""}" data-tpl="${x.id}" aria-pressed="${x.id === c.plantilla}">
          <div class="thumb" data-thumb="${x.id}"></div><span class="tpl-name"><span class="tick"></span>${esc(x.nombre)}</span></button>`).join("")}</div></div>
      <div class="card"><h2>Color de acento</h2>
        <div class="swatches"><button type="button" class="swatch auto${di.acento ? "" : " on"}" data-color="" title="Color de la plantilla" aria-label="Color de la plantilla"></button>
          ${PRESETS.map(col => `<button type="button" class="swatch${di.acento.toLowerCase() === col ? " on" : ""}" data-color="${col}" style="background:${col}" aria-label="Color ${col}"></button>`).join("")}
          <label class="check" title="Elegir otro color"><input type="color" class="color-in" id="dColor" value="${pal.acento}"> Otro</label></div>
        <p class="hint">${di.acento ? "Color personalizado." : "Usando el color propio de la plantilla."} Si eliges un color claro, el texto de la columna lateral pasa a oscuro para que se lea.</p></div>
      <div class="card"><h2>Texto</h2><div class="opts">
        <label class="field"><span>Tipografía</span><select id="dFuente">
          <option value="" ${fuenteSel === "" ? "selected" : ""}>La de la plantilla (${esc(A.FUENTES[t.fuente].nombre)})</option>
          ${Object.entries(A.FUENTES).map(([k, f]) => `<option value="${k}" ${fuenteSel === k ? "selected" : ""}>${esc(f.nombre)}</option>`).join("")}</select></label>
        <label class="field"><span>Tamaño del texto</span><div class="range-row"><input type="range" id="dEscala" min="85" max="115" step="1" value="${di.escala}"><output id="dEscalaO">${di.escala}%</output></div></label>
        <div class="opt-row"><label class="switch"><input type="checkbox" id="dAjustar" ${di.ajustar !== false ? "checked" : ""}><span class="track"></span>Ajustar a una página</label>
          <span class="hint">Reduce un poco la letra si no cabe.</span></div>
        <div class="opt-row"><label class="switch"><input type="checkbox" id="dFoto" ${di.foto !== false ? "checked" : ""}><span class="track"></span>Mostrar foto</label></div>
        <div class="opt-row"><span class="label">Columna lateral</span><div class="seg" id="dLateral"><button type="button" data-lat="centro" class="${di.lateral !== "izq" ? "on" : ""}">Centrada</button><button type="button" data-lat="izq" class="${di.lateral === "izq" ? "on" : ""}">A la izquierda</button></div></div>
      </div></div>
      <div class="card"><h2>Secciones</h2><p class="hint">Cambia el título, el orden o si aparecen. Una sección sin datos no se muestra aunque esté activada.</p>
        <div class="sec-list">${c.secciones.map((s, i) => { const def = A.seccionDef(s.clave); return `<div class="sec-row${s.visible ? "" : " off"}">
          <label class="check" title="Mostrar u ocultar"><input type="checkbox" data-sec-vis="${i}" ${s.visible ? "checked" : ""} aria-label="Mostrar ${esc(def.nombre)}"></label>
          <input type="text" id="sec-${s.clave}" data-sec-tit="${i}" value="${esc(s.titulo)}" placeholder="Sin título (${esc(def.nombre)})" aria-label="Título de ${esc(def.nombre)}">
          <span class="col">${def.col === "side" ? "Lateral" : "Principal"}</span>
          <button class="icon-btn" type="button" data-sec-mv="up" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Subir">${ICO.up}</button>
          <button class="icon-btn" type="button" data-sec-mv="down" data-i="${i}" ${i === c.secciones.length - 1 ? "disabled" : ""} aria-label="Bajar">${ICO.down}</button></div>`; }).join("")}</div></div>`;
    const g = $("#tplGrid"); if (ro) ro.observe(g);
    pintarMiniaturasPlantillas();
  }
  function pintarMiniaturasPlantillas() {
    const c = cvActual(); if (!c) return;
    $$("[data-thumb]").forEach(el => { el.innerHTML = A.cvAjustado(c, el.dataset.thumb).html; });
    const g = $("#tplGrid"); if (g) ajustarMiniaturas(g);
  }
  function onClickDiseno(e) {
    const c = cvActual(), di = c.diseno;
    const tp = e.target.closest("[data-tpl]");
    if (tp) { c.plantilla = tp.dataset.tpl; pintarDiseno(); cambio(); return; }
    const sw = e.target.closest("[data-color]");
    if (sw) { di.acento = sw.dataset.color; pintarDiseno(); cambio(); return; }
    const lat = e.target.closest("[data-lat]");
    if (lat) { di.lateral = lat.dataset.lat; pintarDiseno(); cambio(); return; }
    const mv = e.target.closest("[data-sec-mv]");
    if (mv) { const i = +mv.dataset.i, a = c.secciones, j = mv.dataset.secMv === "up" ? i - 1 : i + 1; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; pintarDiseno(); cambio(); }
  }
  function onInputDiseno(e) {
    const c = cvActual(), di = c.diseno, el = e.target;
    if (el.id === "dColor") { if (e.type === "change") { di.acento = el.value; pintarDiseno(); } else { di.acento = el.value; } cambio(); }
    else if (el.id === "dFuente") { di.fuente = el.value; cambio(); }
    else if (el.id === "dEscala") { di.escala = +el.value; $("#dEscalaO").textContent = el.value + "%"; cambio(); }
    else if (el.id === "dAjustar" && e.type === "change") { di.ajustar = el.checked; cambio(); }
    else if (el.id === "dFoto" && e.type === "change") { di.foto = el.checked; cambio(); }
    else if (el.dataset.secVis != null && e.type === "change") { c.secciones[+el.dataset.secVis].visible = el.checked; el.closest(".sec-row").classList.toggle("off", !el.checked); cambio(); }
    else if (el.dataset.secTit != null && e.type === "input") { c.secciones[+el.dataset.secTit].titulo = el.value; cambio(); }
  }

  /* =========================================================
     EXPORTAR
     ========================================================= */
  function vistaExportar() {
    const c = cvActual(); if (!c) { view.innerHTML = SIN_CV; return; }
    view.innerHTML = `<div class="page-head"><div><h1>Exportar</h1><p>${esc(c.titulo)}</p></div></div>
      <div class="export-grid"><div class="stack">
        <div class="card big-action"><div class="ic">PDF</div><div><h2>Descargar en PDF</h2>
          <p>El formato recomendado para enviar a empresas: se ve igual en cualquier dispositivo.</p>
          <button class="btn primary" type="button" data-pdf>Descargar PDF</button>
          <ol class="steps" style="margin-top:12px"><li>Se abre la ventana de impresión del navegador.</li><li>En «Destino», elige <b>Guardar como PDF</b>.</li>
          <li>Márgenes: <b>Ninguno</b>. Activa <b>Gráficos de fondo</b> si aparece la opción.</li></ol></div></div>
        <div class="card big-action"><div class="ic">DOCX</div><div><h2>Descargar en Word</h2>
          <p>Para editarlo en Microsoft Word, LibreOffice o Google Docs. Mantiene colores, foto y columnas, aunque el diseño es algo más sencillo que el PDF.</p>
          <button class="btn" type="button" data-docx>Descargar Word (.docx)</button></div></div>
        <div class="card big-action"><div class="ic">JSON</div><div><h2>Copia de este CV</h2>
          <p>Guarda todos los datos y el diseño en un archivo para abrirlo en otro navegador o dispositivo con «Importar archivo».</p>
          <button class="btn" type="button" data-json>Guardar copia (.json)</button></div></div>
      </div>${panelPreview("Así quedará")}</div>`;
    montarPreview();
    view.onclick = async e => {
      if (e.target.closest("[data-pdf]")) exportarPDF();
      if (e.target.closest("[data-docx]")) exportarDOCX();
      if (e.target.closest("[data-json]")) {
        const blob = new Blob([JSON.stringify({ app: "generador-cv", tipo: "cv", version: 1, cv: cvActual() }, null, 2)], { type: "application/json" });
        descargar(blob, `cv-${slug(cvActual().titulo)}.json`); toast("Copia guardada.");
      }
    };
  }

  function nombreArchivo(c) { const p = c.datos.personal; return "CV " + [p.nombre, p.apellidos].join(" ").trim() || c.titulo; }
  function exportarPDF() {
    const c = cvActual(); if (!c) return;
    const root = $("#print-root");
    root.innerHTML = A.cvAjustado(c).html;
    const titulo = document.title; document.title = nombreArchivo(c);
    const fin = () => { document.title = titulo; root.innerHTML = ""; window.removeEventListener("afterprint", fin); };
    window.addEventListener("afterprint", fin);
    setTimeout(() => { window.print(); setTimeout(() => { if (document.title !== titulo) fin(); }, 1500); }, 60);
  }
  async function exportarDOCX() {
    const c = cvActual(); if (!c) return;
    try { const blob = await A.exportarWord(c); descargar(blob, slug(nombreArchivo(c)) + ".docx"); toast("Documento de Word descargado."); }
    catch (err) { console.error(err); toast("No se pudo crear el archivo de Word.", true); }
  }

  /* =========================================================
     MI PERFIL (zona de usuario)
     ========================================================= */
  function vistaPerfil() {
    const p = perfil();
    const usado = A.bytesUsados(), limite = 5 * 1024 * 1024, pct = Math.min(100, usado / limite * 100);
    view.innerHTML = `<div class="page-head"><div><h1>Mi perfil</h1><p>Tus datos se guardan solo en este navegador. Nada se envía a ningún servidor.</p></div></div>
      <div class="two-col"><div class="stack">
        <div class="card"><div class="profile-hero"><div class="big-avatar" style="background:${p.color}">${esc(inicialesDe(p.nombre))}</div>
          <div class="stack" style="flex:1;gap:10px"><label class="field"><span>Nombre del perfil</span><input type="text" id="pNombre" value="${esc(p.nombre)}" maxlength="60"></label>
          <div class="swatches">${A.COLORES_PERFIL.map(col => `<button type="button" class="swatch${p.color === col ? " on" : ""}" data-pcolor="${col}" style="background:${col}" aria-label="Color ${col}"></button>`).join("")}</div></div></div>
          <p class="hint">Este perfil tiene ${p.cvs.length} ${p.cvs.length === 1 ? "CV" : "CV"}. Usa varios perfiles si compartes el ordenador o llevas los CV de otras personas.</p></div>
        <div class="card"><div class="card-head"><h2>Perfiles</h2><button class="btn small primary" type="button" data-pnuevo>+ Nuevo perfil</button></div>
          <div class="prof-list">${S.perfiles.map(x => `<div class="prof-row${x.id === p.id ? " on" : ""}" data-pid="${x.id}"><span class="dot" style="background:${x.color}">${esc(inicialesDe(x.nombre))}</span>
            <span class="nm">${esc(x.nombre)}<small>${x.cvs.length} ${x.cvs.length === 1 ? "CV" : "CV"}${x.id === p.id ? " · perfil activo" : ""}</small></span>
            ${x.id === p.id ? "" : `<button class="btn small" type="button" data-pusar>Usar este perfil</button>`}
            ${S.perfiles.length > 1 ? `<button class="btn small ghost danger" type="button" data-pdel>Eliminar</button>` : ""}</div>`).join("")}</div></div>
      </div><div class="stack">
        <div class="card"><h2>Copia de seguridad</h2>
          <p class="hint">Al borrar los datos del navegador se pierden los CV. Guarda una copia de vez en cuando.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" data-backup>Guardar copia de todo (.json)</button><button class="btn" type="button" data-importar>Importar archivo</button></div>
          <p class="hint">«Importar» acepta copias completas, CV sueltos y los archivos del editor de CV anterior.</p></div>
        <div class="card"><h2>Espacio usado</h2><div class="meter"><i style="width:${pct.toFixed(1)}%"></i></div>
          <p class="hint">${(usado / 1024).toFixed(0)} KB de unos 5 000 KB disponibles. Las fotos son lo que más ocupa.</p></div>
        <div class="card"><h2>Borrar datos</h2><p class="hint">Elimina todos los perfiles y CV de este navegador y vuelve a empezar con el ejemplo.</p>
          <div><button class="btn danger" type="button" data-borrar>Borrar todos los datos</button></div></div>
      </div></div>`;
    $("#pNombre").oninput = e => { p.nombre = e.target.value || "Mi perfil"; guardar(); pintarBarra(); $(".big-avatar").textContent = inicialesDe(p.nombre); };
    $("#pNombre").onchange = () => vistaPerfil();
    view.onclick = async e => {
      const b = e.target.closest("button"); if (!b) return;
      const row = b.closest("[data-pid]"); const x = row && S.perfiles.find(q => q.id === row.dataset.pid);
      if (b.dataset.pcolor) { p.color = b.dataset.pcolor; guardarYa(); vistaPerfil(); pintarBarra(); }
      else if (b.hasAttribute("data-pnuevo")) {
        const v = await pedirTexto("Nuevo perfil", "", "Crear"); if (!v) return;
        const np = A.perfilNuevo(v, S.perfiles.length); S.perfiles.push(np); S.perfilActivo = np.id; S.cvActivo = null;
        guardarYa(); vistaPerfil(); pintarBarra(); toast(`Perfil «${v}» creado.`);
      }
      else if (b.hasAttribute("data-pusar") && x) { S.perfilActivo = x.id; S.cvActivo = x.cvs[0] ? x.cvs[0].id : null; guardarYa(); vistaPerfil(); pintarBarra(); toast(`Ahora usas el perfil «${x.nombre}».`); }
      else if (b.hasAttribute("data-pdel") && x) {
        if (!(await confirmar("Eliminar perfil", `Se eliminará el perfil «${esc(x.nombre)}» con sus ${x.cvs.length} CV. No se puede deshacer.`))) return;
        S.perfiles = S.perfiles.filter(q => q !== x);
        if (S.perfilActivo === x.id) { S.perfilActivo = S.perfiles[0].id; S.cvActivo = S.perfiles[0].cvs[0] ? S.perfiles[0].cvs[0].id : null; }
        guardarYa(); vistaPerfil(); pintarBarra(); toast("Perfil eliminado.");
      }
      else if (b.hasAttribute("data-backup")) {
        const blob = new Blob([JSON.stringify({ app: "generador-cv", tipo: "copia", version: 1, fecha: new Date().toISOString(), datos: S }, null, 2)], { type: "application/json" });
        descargar(blob, `generador-cv-copia-${new Date().toISOString().slice(0, 10)}.json`); toast("Copia guardada.");
      }
      else if (b.hasAttribute("data-importar")) importarArchivo();
      else if (b.hasAttribute("data-borrar")) {
        if (!(await confirmar("Borrar todos los datos", "Se eliminarán todos los perfiles y CV de este navegador. Guarda antes una copia si los quieres conservar.", "Borrar todo"))) return;
        A.borrarTodo(); S = A.estadoInicial(); guardarYa(); navegar("cvs"); toast("Datos borrados.");
      }
    };
  }

  /* ---------- Importar ---------- */
  function importarArchivo() { $("#fileJson").click(); }
  $("#fileJson").onchange = async () => {
    const f = $("#fileJson").files[0]; $("#fileJson").value = ""; if (!f) return;
    let j;
    try { j = JSON.parse(await f.text()); } catch (e) { toast("Ese archivo no es un JSON válido.", true); return; }
    const p = perfil();
    if (j && j.app === "generador-cv" && j.tipo === "copia" && j.datos && Array.isArray(j.datos.perfiles)) {
      const reemplazar = await confirmar("Importar copia completa", `La copia tiene ${j.datos.perfiles.length} perfil(es). Puedes añadirlos a los que ya tienes o reemplazar todo.`, "Reemplazar todo");
      const perfiles = j.datos.perfiles.map(x => Object.assign({}, x, { cvs: (x.cvs || []).map(A.normalizarCV) }));
      if (reemplazar) { S = { version: 1, perfiles, perfilActivo: perfiles[0].id, cvActivo: perfiles[0].cvs[0] ? perfiles[0].cvs[0].id : null }; }
      else { perfiles.forEach(x => { x.id = A.uid(); S.perfiles.push(x); }); }
      guardarYa(); navegar("cvs"); toast(reemplazar ? "Copia restaurada." : "Perfiles añadidos.");
      return;
    }
    let cv = null;
    if (j && j.app === "generador-cv" && j.tipo === "cv" && j.cv) cv = A.normalizarCV(j.cv);
    else if (j && j.tipo === "datos-cv") cv = A.desdeDatosCV(j);
    else if (j && j.datos && j.datos.personal) cv = A.normalizarCV(j);
    if (!cv) { toast("No reconozco el formato de ese archivo.", true); return; }
    cv.id = A.uid(); p.cvs.push(cv); S.cvActivo = cv.id; guardarYa(); subtab = "datos"; navegar("editor"); toast(`«${cv.titulo}» importado.`);
  };

  /* ---------- Arranque ---------- */
  function iniciar() {
    if (!location.hash) history.replaceState(null, "", "#cvs");
    ir();
    guardarYa();
  }
  iniciar();
  if (document.fonts) {
    let tF = null;
    const refrescar = () => { clearTimeout(tF); tF = setTimeout(() => { if (vistaActual === "cvs") vistaCVs(); else programarPreview(); }, 120); };
    document.fonts.ready.then(refrescar);
    if (document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", refrescar);
  }
})(window.CVApp);
