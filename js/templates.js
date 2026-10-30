/* Plantillas del CV: colores, tipografías, generación del HTML y ajuste a página A4. */
window.CVApp = window.CVApp || {};
(function (A) {
  "use strict";

  A.PAGE_W = 794;   // A4 a 96 ppp
  A.PAGE_H = 1123;

  A.FUENTES = {
    arial:       { nombre: "Arial",           css: 'Arial, "Liberation Sans", Helvetica, sans-serif', word: "Arial" },
    lato:        { nombre: "Lato",            css: '"Lato", Arial, sans-serif', word: "Lato" },
    worksans:    { nombre: "Work Sans",       css: '"Work Sans", Arial, sans-serif', word: "Work Sans" },
    opensans:    { nombre: "Open Sans",       css: '"Open Sans", Arial, sans-serif', word: "Open Sans" },
    roboto:      { nombre: "Roboto",          css: '"Roboto", Arial, sans-serif', word: "Roboto" },
    montserrat:  { nombre: "Montserrat",      css: '"Montserrat", Arial, sans-serif', word: "Montserrat" },
    sourceserif: { nombre: "Source Serif",    css: '"Source Serif 4", Georgia, serif', word: "Source Serif 4" },
    merriweather:{ nombre: "Merriweather",    css: '"Merriweather", Georgia, serif', word: "Merriweather" },
    georgia:     { nombre: "Georgia",         css: 'Georgia, "Times New Roman", serif', word: "Georgia" }
  };

  /* ---------- Utilidades de color ---------- */
  const hex2rgb = h => { h = (h || "#000").replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb2hex = a => "#" + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  const mix = (a, b, t) => { const x = hex2rgb(a), y = hex2rgb(b); return rgb2hex(x.map((v, i) => v * (1 - t) + y[i] * t)); };
  const lum = h => { const c = hex2rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const sobre = bg => lum(bg) > 0.42 ? "#1d2526" : "#ffffff";
  // Oscurece el acento hasta que se lea sobre blanco.
  const legible = h => { let c = h, i = 0; while (lum(c) > 0.32 && i < 12) { c = mix(c, "#000000", 0.12); i++; } return c; };
  A.color = { mix, lum, sobre, legible, hex2rgb };

  /* ---------- Plantillas ---------- */
  A.PLANTILLAS = [
    { id: "t1", nombre: "Clásica lateral", desc: "Columna de color con foto y datos.", acento: "#5b8a8c", fuente: "arial", ancho: 262,
      colores: a => ({ sideBg: a, ring: "#2b2b2b" }) },
    { id: "t2", nombre: "Corporativa", desc: "Sobria, columna oscura.", acento: "#2e64a3", fuente: "lato", ancho: 262,
      colores: a => ({ sideBg: mix(a, "#0b1626", 0.55), ring: "#ffffff", name: mix(a, "#0b1626", 0.5) }) },
    { id: "t3", nombre: "Grafito", desc: "Columna a la derecha.", acento: "#c7861f", fuente: "worksans", ancho: 262, lado: "der",
      colores: a => ({ sideBg: "#3a3f44", sideHead: mix(a, "#ffffff", 0.3), ring: a }) },
    { id: "t4", nombre: "Cabecera", desc: "Foto y nombre en banda superior.", acento: "#7a2a3e", fuente: "lato", ancho: 250, cabecera: true,
      colores: a => ({ sideBg: mix(a, "#ffffff", 0.93), hdBg: a, ring: "#ffffff" }) },
    { id: "t5", nombre: "Línea de tiempo", desc: "Lateral claro y experiencia en línea.", acento: "#55702a", fuente: "worksans", ancho: 262,
      colores: a => ({ sideBg: mix(a, "#ffffff", 0.9), ring: a }) },
    { id: "t6", nombre: "Minimal", desc: "Fondo blanco y títulos serif.", acento: "#a77a12", fuente: "lato", ancho: 250,
      colores: a => ({ sideBg: "#ffffff", ring: a }) },
    { id: "t7", nombre: "Elegante", desc: "Texto serif y tono profundo.", acento: "#7d4f8f", fuente: "sourceserif", ancho: 262,
      colores: a => ({ sideBg: mix(a, "#1a1020", 0.45), sideHead: mix(a, "#ffffff", 0.65), ring: mix(a, "#ffffff", 0.55) }) }
  ];
  A.plantilla = id => A.PLANTILLAS.find(t => t.id === id) || A.PLANTILLAS[0];

  // Colores finales de un CV (los usa también la exportación a Word).
  A.paleta = (cv) => {
    const t = A.plantilla(cv.plantilla);
    const acento = cv.diseno.acento || t.acento;
    const c = t.colores(acento);
    const sideBg = c.sideBg;
    const sideFg = sobre(sideBg);
    const claro = sideFg !== "#ffffff";
    const tinta = legible(acento);
    return {
      acento, tinta,
      sideBg, sideFg,
      sideHead: c.sideHead || (claro ? tinta : sideFg),
      sideRule: claro ? mix(sideBg, "#000000", 0.12) : mix(sideBg, "#000000", 0.25),
      rule: t.id === "t6" ? mix(acento, "#ffffff", 0.7) : (t.id === "t4" || t.id === "t5" ? mix(acento, "#ffffff", 0.65) : tinta),
      name: c.name || "#4a4a4a",
      ring: c.ring || "#2b2b2b",
      hdBg: c.hdBg || acento, hdFg: sobre(c.hdBg || acento),
      fuente: A.FUENTES[cv.diseno.fuente || t.fuente] || A.FUENTES.arial
    };
  };

  /* ---------- Texto ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.esc = esc;
  const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  A.mesAnio = v => { if (!v) return ""; const [y, m] = v.split("-"); return m ? `${m}/${y}` : y; };
  A.fechaLarga = v => { if (!v) return ""; const [y, m, d] = v.split("-"); if (!d) return v; return `${+d} / ${MESES[+m - 1]} / ${y}`; };
  A.edad = fn => { if (!fn) return null; const b = new Date(fn + "T00:00:00"), n = new Date(); if (isNaN(b)) return null; let a = n.getFullYear() - b.getFullYear(); const mm = n.getMonth() - b.getMonth(); if (mm < 0 || (mm === 0 && n.getDate() < b.getDate())) a--; return a; };
  A.periodo = j => `${A.mesAnio(j.inicio)}${j.inicio || j.fin || j.actual ? " - " : ""}${j.actual ? "Actualidad" : A.mesAnio(j.fin)}`;
  A.iniciales = p => (((p.nombre || " ").trim()[0] || "") + ((p.apellidos || " ").trim()[0] || "")).toUpperCase();

  // Elementos de "Información personal" en orden.
  A.itemsPersonales = (p) => {
    const out = [];
    const e = A.edad(p.fechaNacimiento);
    if (p.mostrarEdad && e !== null) out.push({ etiqueta: "Edad", valor: `${e} años` });
    if (p.mostrarFecha && p.fechaNacimiento) out.push({ etiqueta: "Fecha de nacimiento", valor: A.fechaLarga(p.fechaNacimiento) });
    if (p.carnet) out.push({ etiqueta: "Carné de conducir", valor: p.carnet });
    if (p.vehiculo) out.push({ destacado: "Vehículo propio" });
    if (p.disponibilidad) out.push({ etiqueta: "Disponibilidad", valor: p.disponibilidad });
    if (p.incorporacion) out.push({ destacado: p.incorporacion });
    (p.otros || []).filter(x => x && x.trim()).forEach(x => out.push({ valor: x }));
    return out;
  };

  const tieneDatos = (clave, d) => {
    switch (clave) {
      case "perfil": return !!(d.perfil && d.perfil.trim());
      case "personal": return A.itemsPersonales(d.personal).length > 0;
      case "aptitudes": return d.aptitudes.some(x => x && x.trim());
      default: return (d[clave] || []).length > 0;
    }
  };
  A.tieneDatos = tieneDatos;

  // Tareas: una línea por tarea; las líneas que empiezan por "*" o "-" son subpuntos.
  A.partirTarea = t => {
    const lineas = String(t).split("\n");
    const cabeza = lineas.shift().trim();
    const subs = lineas.map(l => l.replace(/^\s*[*\-•]\s*/, "").trim()).filter(Boolean);
    return { cabeza, subs };
  };

  const ICON = {
    tel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zm2 2v.5l7 4.6 7-4.6V7zm14 2.9-7 4.6-7-4.6V17h14z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5.2-7 13-7 13S5 14.2 5 9a7 7 0 0 1 7-7zm0 4.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z"/></svg>',
    web: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6A15.7 15.7 0 0 0 8.1 8zM12 20c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.2 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6zM16.3 14a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4z"/></svg>'
  };

  // Parte un correo largo por la arroba para que no rompa la columna.
  const emailHTML = m => { m = esc(m); const i = m.indexOf("@"); return i > 0 && m.length > 24 ? m.slice(0, i) + "<wbr>" + m.slice(i) : m; };

  function contactoHTML(p) {
    const f = [];
    if (p.telefono) f.push(`<div>${ICON.tel}<span>${esc(p.telefono)}</span></div>`);
    if (p.email) f.push(`<div>${ICON.mail}<span>${emailHTML(p.email)}</span></div>`);
    if (p.web) f.push(`<div>${ICON.web}<span>${esc(p.web)}</span></div>`);
    if (p.direccion || p.localidad) f.push(`<div>${ICON.pin}<span>${esc(p.direccion)}${p.direccion && p.localidad ? "<br>" : ""}${esc(p.localidad)}</span></div>`);
    return f.length ? `<div class="contact">${f.join("")}</div>` : "";
  }

  function seccionHTML(sec, d, t) {
    const titulo = sec.titulo ? `<div class="sh">${esc(sec.titulo)}</div>` : "";
    const cls = `sec sec-${sec.clave}${sec.titulo ? "" : " sin-titulo"}`;
    let body = "";
    switch (sec.clave) {
      case "perfil":
        body = `<p class="perfil">${esc(d.perfil).replace(/\n/g, "<br>")}</p>`; break;
      case "experiencia":
        body = d.experiencia.map(j => {
          const tareas = (j.tareas || []).filter(x => x && x.trim()).map(x => {
            const { cabeza, subs } = A.partirTarea(x);
            return `<li>${esc(cabeza)}${subs.length ? `<ul class="subl">${subs.map(s => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}</li>`;
          }).join("");
          const per = A.periodo(j);
          return `<div class="job"><div class="jt"><b>${esc(j.puesto)}</b>${per ? ` <span class="sep">|</span> ${esc(per)}` : ""}</div>
            ${j.empresa || j.ciudad ? `<div class="co"><b>${esc(j.empresa)}</b>${j.ciudad ? ` – ${esc(j.ciudad)}.` : ""}</div>` : ""}
            ${tareas ? `<ul>${tareas}</ul>` : ""}</div>`;
        }).join(""); break;
      case "formacion":
        body = `<ul class="edu">${d.formacion.map(f => `<li><b>${esc(f.centro)}</b>${f.anio ? ` <span class="sep">|</span> ${esc(f.anio)}` : ""}${f.ciudad ? ` - ${esc(f.ciudad)}.` : ""}${f.titulo ? `<span class="t">${esc(f.titulo)}</span>` : ""}</li>`).join("")}</ul>`; break;
      case "aptitudes":
        body = `<ul class="apt">${d.aptitudes.filter(x => x && x.trim()).map(a => `<li>${esc(a)}</li>`).join("")}</ul>`; break;
      case "idiomas":
        body = `<ul class="idi">${d.idiomas.map(i => `<li><b>${esc(i.idioma)}</b>${i.nivel ? `<span class="lb2">${esc(i.nivel)}</span>` : ""}</li>`).join("")}</ul>`; break;
      case "meritos":
        body = `<ul class="mer">${d.meritos.map(m => {
          const extra = [m.horas ? `${esc(m.horas)} h.` : "", esc(m.anio)].filter(Boolean).join(" - ");
          return `<li><span class="ti">${esc(m.titulo)}</span>${m.entidad || extra ? `<span class="ent">${esc(m.entidad)}${extra ? ` <span class="nw">(${extra}).</span>` : ""}</span>` : ""}</li>`;
        }).join("")}</ul>`; break;
      case "personal":
        body = `<ul class="pers">${A.itemsPersonales(d.personal).map(i => i.destacado ? `<li><b>${esc(i.destacado)}</b></li>` :
          `<li>${i.etiqueta ? `<span class="lb">${esc(i.etiqueta)}</span>` : ""}${esc(i.valor)}</li>`).join("")}</ul>`; break;
    }
    return `<section class="${cls}">${titulo}${body}</section>`;
  }

  // HTML del CV (sin ajustar).
  A.cvHTML = (cv, plantillaId) => {
    const t = A.plantilla(plantillaId || cv.plantilla);
    const cvx = plantillaId ? Object.assign({}, cv, { plantilla: plantillaId }) : cv;
    const pal = A.paleta(cvx), d = cv.datos, p = d.personal, di = cv.diseno;
    const foto = di.foto !== false ? `<div class="photo">${p.foto ? `<img src="${p.foto}" alt="">` : `<span>${esc(A.iniciales(p))}</span>`}</div>` : "";
    const ident = `<div class="ident"><div class="name"><span class="a">${esc(p.nombre)}</span> ${esc(p.apellidos)}</div>${p.titular ? `<div class="titular">${esc(p.titular)}</div>` : ""}</div>`;
    const contacto = contactoHTML(p);
    const visibles = cv.secciones.filter(s => s.visible && tieneDatos(s.clave, d));
    const lado = visibles.filter(s => A.seccionDef(s.clave).col === "side").map(s => seccionHTML(s, d, t)).join("");
    const main = visibles.filter(s => A.seccionDef(s.clave).col === "main").map(s => seccionHTML(s, d, t)).join("");
    const vars = [
      `--sw:${t.ancho}px`, `--accent:${pal.acento}`, `--tinta:${pal.tinta}`, `--side-bg:${pal.sideBg}`, `--side-fg:${pal.sideFg}`,
      `--side-head:${pal.sideHead}`, `--side-rule:${pal.sideRule}`, `--rule:${pal.rule}`, `--name:${pal.name}`, `--ring:${pal.ring}`,
      `--hd-bg:${pal.hdBg}`, `--hd-fg:${pal.hdFg}`, `--font:${pal.fuente.css}`
    ].join(";");
    const clases = ["cv", t.id, t.lado === "der" ? "lado-der" : "", t.cabecera ? "con-cabecera" : "", di.lateral === "izq" ? "lat-izq" : "lat-centro", di.foto === false ? "sin-foto" : ""].filter(Boolean).join(" ");
    if (t.cabecera) {
      return `<div class="${clases}" style="${vars}"><header class="hd">${foto}<div class="hd-txt">${ident}${contacto}</div></header>
        <aside class="side">${lado}</aside><main class="main">${main}</main></div>`;
    }
    return `<div class="${clases}" style="${vars}"><aside class="side">${foto}${contacto}${lado}</aside><main class="main">${ident}${main}</main></div>`;
  };

  /* ---------- Ajuste a página ---------- */
  let host = null;
  function getHost() {
    if (!host) {
      host = document.createElement("div");
      host.setAttribute("aria-hidden", "true");
      host.style.cssText = "position:fixed;left:-20000px;top:0;width:794px;visibility:hidden;pointer-events:none;";
      document.body.appendChild(host);
    }
    return host;
  }

  // Ajusta tamaños de letra dentro de un .cv ya insertado en el documento.
  A.ajustar = (el, cv) => {
    const di = cv.diseno;
    const base = 13.4 * (di.escala || 100) / 100;
    const main = el.querySelector(".main"), side = el.querySelector(".side");
    const nm = el.querySelector(".name");
    let fs = base, sfs = base * 0.94, nfs = 36;
    const set = () => { el.style.setProperty("--fs", fs.toFixed(2) + "px"); el.style.setProperty("--sfs", sfs.toFixed(2) + "px"); el.style.setProperty("--nfs", nfs + "px"); };
    set();
    el.style.height = A.PAGE_H + "px";
    // Nombre en una sola línea
    if (nm) { while (nm.scrollWidth > nm.clientWidth + 1 && nfs > 18) { nfs -= 0.5; set(); } }
    const sobra = (x) => x.scrollHeight > x.clientHeight + 1;
    if (di.ajustar !== false) {
      const min = base * 0.78;
      while ((sobra(main) || sobra(side)) && fs > min) { fs -= 0.1; sfs = Math.min(sfs, fs * 0.94); if (sobra(side)) sfs -= 0.1; set(); }
    }
    let paginas = 1;
    if (sobra(main) || sobra(side)) {
      const alto = Math.max(main.scrollHeight, side.scrollHeight) + (el.querySelector(".hd") ? el.querySelector(".hd").offsetHeight : 0);
      paginas = Math.ceil(alto / A.PAGE_H);
      el.style.height = paginas * A.PAGE_H + "px";
    }
    // Columna lateral: crece y se reparte para no dejar hueco al final
    const ultimo = () => { const r = side.getBoundingClientRect(); const l = side.lastElementChild; return l ? (l.getBoundingClientRect().bottom - r.top) : 0; };
    side.style.justifyContent = "flex-start";
    const limite = side.clientHeight - 40;
    while (ultimo() < limite - 60 && sfs < Math.min(fs * 1.18, 16.5)) { sfs += 0.1; set(); }
    while (ultimo() > limite && sfs > 9) { sfs -= 0.1; set(); }
    side.style.justifyContent = ultimo() > side.clientHeight * 0.72 ? "space-between" : "flex-start";
    el.dataset.paginas = paginas;
    return { paginas, fs, sfs, nfs };
  };

  // Devuelve el HTML del CV ya ajustado (para miniaturas, vista previa e impresión).
  A.cvAjustado = (cv, plantillaId) => {
    const h = getHost();
    h.innerHTML = A.cvHTML(cv, plantillaId);
    const el = h.firstElementChild;
    const info = A.ajustar(el, cv);
    const html = h.innerHTML;
    h.innerHTML = "";
    return { html, paginas: info.paginas };
  };
})(window.CVApp);
