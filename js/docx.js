/* Exportación a Word (.docx) sin librerías externas: genera el XML de Office y lo empaqueta en un ZIP. */
window.CVApp = window.CVApp || {};
(function (A) {
  "use strict";

  /* ---------- ZIP (sin compresión) ---------- */
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const enc = new TextEncoder();

  function zip(files) {
    const partes = [], central = [];
    let offset = 0;
    const d = new Date();
    const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(f => {
      const name = enc.encode(f.name);
      const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      partes.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    const tamCentral = central.reduce((s, x) => s + x.length, 0);
    const fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, files.length, true); fin.setUint16(10, files.length, true);
    fin.setUint32(12, tamCentral, true); fin.setUint32(16, offset, true);
    return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  /* ---------- Ayudas de WordprocessingML ---------- */
  const x = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hx = c => (c || "#000000").replace("#", "").toUpperCase();
  const tw = px => Math.round(px * 15);            // píxel → twips
  const hp = px => Math.max(2, Math.round(px * 1.5)); // píxel → medios puntos

  function r(texto, o = {}) {
    const props = [
      o.b ? "<w:b/><w:bCs/>" : "", o.i ? "<w:i/>" : "", o.caps ? "<w:caps/>" : "", o.smallCaps ? "<w:smallCaps/>" : "",
      o.color ? `<w:color w:val="${hx(o.color)}"/>` : "",
      o.sp ? `<w:spacing w:val="${o.sp}"/>` : "",
      o.size ? `<w:sz w:val="${o.size}"/><w:szCs w:val="${o.size}"/>` : "",
      o.fondo ? `<w:shd w:val="clear" w:color="auto" w:fill="${hx(o.fondo)}"/>` : ""
    ].join("");
    const partes = String(texto == null ? "" : texto).split("\n");
    const cuerpo = partes.map((t, i) => (i ? "<w:br/>" : "") + `<w:t xml:space="preserve">${x(t)}</w:t>`).join("");
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}${o.tab ? "<w:tab/>" : ""}${cuerpo}</w:r>`;
  }
  function p(runs, o = {}) {
    const props = [
      "",  // sin «conservar con el siguiente»: dentro de tablas impide que el contenido pase de página
      o.bordeArriba ? `<w:pBdr><w:top w:val="single" w:sz="${o.bordeArriba.sz}" w:space="${o.bordeArriba.space || 8}" w:color="${hx(o.bordeArriba.color)}"/></w:pBdr>` : "",
      o.bordeAbajo ? `<w:pBdr><w:bottom w:val="single" w:sz="${o.bordeAbajo.sz}" w:space="${o.bordeAbajo.space || 8}" w:color="${hx(o.bordeAbajo.color)}"/></w:pBdr>` : "",
      `<w:spacing w:before="${o.antes || 0}" w:after="${o.despues == null ? 60 : o.despues}" w:line="${o.linea || 259}" w:lineRule="auto"/>`,
      o.ind ? `<w:ind w:left="${o.ind}" w:hanging="${o.colgante || 0}"/>` : "",
      `<w:jc w:val="${o.alin || "left"}"/>`
    ].join("");
    return `<w:p><w:pPr>${props}</w:pPr>${Array.isArray(runs) ? runs.join("") : runs}</w:p>`;
  }

  function imagen(rid, px, nombre) {
    const emu = Math.round(px * 9525);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${emu}" cy="${emu}"/><wp:docPr id="1" name="${nombre}"/>
<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${nombre}"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${emu}" cy="${emu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>
</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
  }

  function celda(ancho, contenido, o = {}) {
    const props = [
      `<w:tcW w:w="${ancho}" w:type="dxa"/>`,
      o.span ? `<w:gridSpan w:val="${o.span}"/>` : "",
      (o.bordeDer || o.bordeIzq) ? `<w:tcBorders>${o.bordeIzq ? `<w:left w:val="single" w:sz="6" w:color="${hx(o.bordeIzq)}"/>` : ""}${o.bordeDer ? `<w:right w:val="single" w:sz="6" w:color="${hx(o.bordeDer)}"/>` : ""}</w:tcBorders>` : "",
      o.fondo && o.fondo.toLowerCase() !== "#ffffff" ? `<w:shd w:val="clear" w:color="auto" w:fill="${hx(o.fondo)}"/>` : "",
      `<w:tcMar><w:top w:w="${o.arriba || 0}" w:type="dxa"/><w:left w:w="${o.izq || 0}" w:type="dxa"/><w:bottom w:w="${o.abajo || 0}" w:type="dxa"/><w:right w:w="${o.der || 0}" w:type="dxa"/></w:tcMar>`,
      o.valign ? `<w:vAlign w:val="${o.valign}"/>` : ""
    ].join("");
    return `<w:tc><w:tcPr>${props}</w:tcPr>${contenido || p("", { despues: 0 })}</w:tc>`;
  }

  function tabla(anchos, filas) {
    const total = anchos.reduce((a, b) => a + b, 0);
    return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/>
<w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders><w:tblLayout w:type="fixed"/>
<w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar><w:tblLook w:val="0000"/></w:tblPr>
<w:tblGrid>${anchos.map(a => `<w:gridCol w:w="${a}"/>`).join("")}</w:tblGrid>${filas.join("")}</w:tbl>`;
  }
  const fila = (celdas, alto) => `<w:tr><w:trPr>${alto ? `<w:trHeight w:val="${alto}" w:hRule="atLeast"/>` : ""}</w:trPr>${celdas.join("")}</w:tr>`;

  /* ---------- Contenido ---------- */
  function construir(cv, fotoPNG, fsAjustado) {
    const t = A.plantilla(cv.plantilla), pal = A.paleta(cv), d = cv.datos, per = d.personal;
    const fs = (fsAjustado || 13.4 * (cv.diseno.escala || 100) / 100) * 0.96;
    const T = hp(fs), TS = hp(fs * 0.95);
    const dosCol = t.layout === "lateral" || t.layout === "cabecera";
    const alin = t.id === "s3" || cv.diseno.lateral === "izq" ? "left" : "center";
    const visibles = cv.secciones.filter(s => s.visible && A.tieneDatos(s.clave, d));
    const conFoto = A.conFoto(cv, t) && !!fotoPNG;
    const ANCHO = 11906, ALTO = 16838;
    const banda = !!t.banda || t.id === "m1";
    const fgCab = banda ? pal.hdFg : null;
    const nombreEnTinta = !["t3", "s4", "f1", "f3", "f4"].includes(t.id);
    const smallCaps = t.id === "f1" || t.id === "f3";

    const contacto = [];
    if (per.telefono) contacto.push(per.telefono);
    if (per.email) contacto.push(per.email);
    if (per.web) contacto.push(per.web);
    if (per.direccion || per.localidad) contacto.push([per.direccion, per.localidad].filter(Boolean).join(dosCol && t.layout === "lateral" ? "\n" : ", "));

    // --- Nombre y titular
    const centrar = t.centrado ? "center" : "left";
    const ident = [
      p([r(per.nombre + " ", { b: t.id !== "f1", color: fgCab || (nombreEnTinta ? pal.tinta : pal.name), size: hp(t.layout === "lateral" ? 34 : 36) }),
         r(per.apellidos, { b: t.id !== "f1", color: fgCab || pal.name, size: hp(t.layout === "lateral" ? 34 : 36) })], { despues: per.titular ? 40 : 0, linea: 240, alin: centrar })
    ];
    if (per.titular) ident.push(p(r(per.titular, { color: fgCab || (t.id === "f3" ? pal.tinta : "#444444"), size: hp(fs * 1.3), i: t.id === "f1", caps: t.id === "f3" }), { despues: 0, alin: centrar }));

    // --- Columna lateral (solo plantillas de dos columnas)
    const lado = [];
    const tamFoto = t.layout === "lateral" ? (t.id === "t9" ? 140 : 165) : (t.layout === "cabecera" ? 130 : (t.id === "s4" ? 90 : 112));
    const fotoXML = conFoto ? p(imagen("rIdFoto", tamFoto, "Foto"), { alin: t.layout === "lateral" ? "center" : "left", despues: t.layout === "lateral" ? 240 : 0 }) : "";
    if (t.layout === "lateral") {
      if (fotoXML) lado.push(fotoXML);
      contacto.forEach(c => lado.push(p(r(c, { color: pal.sideFg, size: TS }), { alin, despues: 140 })));
    }
    const shLado = s => p(r(s.titulo, { b: true, caps: true, color: pal.sideHead, size: hp(fs * 1.25), sp: 10 }),
      { alin, antes: 300, despues: 120, keep: true, bordeArriba: t.id === "s3" ? null : { sz: 24, color: pal.sideRule, space: 10 } });
    if (dosCol) visibles.filter(s => A.seccionDef(s.clave).col === "side").forEach(s => {
      if (s.titulo) lado.push(shLado(s));
      if (s.clave === "personal") {
        A.itemsPersonales(per).forEach(i => {
          const runs = [];
          if (i.etiqueta) runs.push(r(i.etiqueta.toUpperCase() + "\n", { color: pal.sideFg, size: hp(fs * 0.78), sp: 8 }));
          runs.push(r(i.destacado || i.valor, { b: !!i.destacado, color: pal.sideFg, size: TS }));
          lado.push(p(runs, { alin, despues: 110 }));
        });
      }
      if (s.clave === "idiomas") d.idiomas.forEach(i => lado.push(p([r(i.idioma, { b: true, color: pal.sideFg, size: TS }), i.nivel ? r("\n" + i.nivel, { color: pal.sideFg, size: TS }) : ""], { alin, despues: 110 })));
      if (s.clave === "meritos") d.meritos.forEach(m => {
        const extra = [m.horas ? `${m.horas} h.` : "", m.anio].filter(Boolean).join(" - ");
        lado.push(p([r(m.titulo, { b: true, color: pal.sideFg, size: TS }),
          (m.entidad || extra) ? r("\n" + [m.entidad, extra ? `(${extra}).` : ""].filter(Boolean).join(" "), { color: pal.sideFg, size: hp(fs * 0.86) }) : ""], { alin, despues: 140 }));
      });
    });

    // --- Contenido de cada sección en la columna principal
    const bullet = (txt, nivel) => p([r(nivel ? "•" : "▪", { color: nivel ? "#000000" : "#333333", size: T }), r(txt, { size: T, tab: true })],
      { ind: nivel ? 620 : 300, colgante: nivel ? 260 : 300, despues: 30 });
    function cuerpoSeccion(s) {
      const out = [];
      switch (s.clave) {
        case "perfil": out.push(p(r(d.perfil, { size: T }), { despues: 60 })); break;
        case "experiencia":
          d.experiencia.forEach((j, k) => {
            const per2 = A.periodo(j);
            out.push(p([r(j.puesto, { b: true, size: T }), per2 ? r(" | " + per2, { size: T }) : ""], { antes: k ? 100 : 0, despues: 20, keep: true }));
            if (j.empresa || j.ciudad) out.push(p([r(j.empresa, { b: true, size: T }), j.ciudad ? r(" – " + j.ciudad + ".", { size: T }) : ""], { despues: 40, keep: true }));
            (j.tareas || []).filter(z => z && z.trim()).forEach(z => {
              const { cabeza, subs } = A.partirTarea(z);
              out.push(bullet(cabeza, 0));
              subs.forEach(sb => out.push(bullet(sb, 1)));
            });
          });
          break;
        case "formacion":
          d.formacion.forEach(f => out.push(p([r("•", { size: T }), r(f.centro, { b: true, size: T, tab: true }), r((f.anio ? " | " + f.anio : "") + (f.ciudad ? " - " + f.ciudad + "." : ""), { size: T }),
            f.titulo ? r("\n" + f.titulo, { size: T }) : ""], { ind: 300, colgante: 300, despues: 80 })));
          break;
        case "aptitudes":
          d.aptitudes.filter(z => z && z.trim()).forEach(a => out.push(p([r(t.mono ? "•" : "✓", { b: true, color: pal.tinta, size: T }), r(a, { size: T, tab: true })], { ind: 320, colgante: 320, despues: 40 })));
          break;
        case "personal": {
          const runs = [];
          A.itemsPersonales(per).forEach((i, k) => {
            if (k) runs.push(r("   ·   ", { size: T, color: "#888888" }));
            if (i.destacado) runs.push(r(i.destacado, { b: true, size: T }));
            else { if (i.etiqueta) runs.push(r(i.etiqueta + ": ", { b: true, size: T })); runs.push(r(i.valor, { size: T })); }
          });
          out.push(p(runs, { despues: 60 }));
          break;
        }
        case "idiomas": {
          const runs = [];
          d.idiomas.forEach((i, k) => { if (k) runs.push(r("      ", { size: T })); runs.push(r(i.idioma, { b: true, size: T })); if (i.nivel) runs.push(r(" · " + i.nivel, { size: T })); });
          out.push(p(runs, { despues: 60 }));
          break;
        }
        case "meritos":
          d.meritos.forEach(m => {
            const extra = [m.horas ? `${m.horas} h.` : "", m.anio].filter(Boolean).join(" - ");
            out.push(p([r("▪", { size: T }), r(m.titulo, { b: true, size: T, tab: true }), r((m.entidad ? " " + m.entidad : "") + (extra ? ` (${extra}).` : ""), { size: T })], { ind: 300, colgante: 300, despues: 30 }));
          });
          break;
      }
      return out;
    }

    // --- Títulos de sección según el estilo de la plantilla
    function titulo(s, primera) {
      const o = { b: true, caps: !smallCaps && t.id !== "t6", smallCaps, color: pal.tinta, size: hp(fs * (t.id === "f2" ? 1.0 : 1.3)), sp: 8 };
      if (t.id === "m1") return p(r(" " + s.titulo + " ", Object.assign(o, { color: "#ffffff", fondo: pal.tinta, size: hp(fs * 1.05) })), { antes: primera ? 60 : 240, despues: 120, keep: true });
      if (t.layout === "lateral" || t.layout === "cabecera") {
        const fina = ["t6", "t3", "t8", "s3"].includes(t.id);
        return p(r(s.titulo, o), { antes: primera ? 120 : 220, despues: 100, keep: true,
          bordeArriba: primera ? null : { sz: fina ? 6 : 18, color: t.id === "t3" || t.id === "t8" ? "#d8d8d8" : pal.rule, space: 10 } });
      }
      return p(r(s.titulo, o), { antes: primera ? 60 : 240, despues: 120, keep: true,
        bordeAbajo: ["m2", "m3", "m4"].includes(t.id) ? null : { sz: t.id === "f1" ? 6 : 10, color: t.mono ? pal.rule : pal.rule, space: 2 } });
    }

    const mainSecs = visibles.filter(s => !dosCol || A.seccionDef(s.clave).col === "main");
    const main = [];
    if (t.layout === "lateral") {
      main.push(...ident);
      main.push(p("", { despues: 120, bordeAbajo: { sz: t.id === "t6" ? 6 : 18, color: t.id === "t3" ? pal.acento : pal.rule, space: 1 }, linea: 120 }));
    }
    let cuerpoEtiquetas = null;
    if (t.layout === "etiquetas") {
      const wEt = tw(170), wRest = ANCHO - tw(84) - wEt;
      const filas = mainSecs.map(s => fila([
        celda(wEt, p(r(s.titulo, { b: true, caps: true, color: pal.tinta, size: hp(fs * 0.98), sp: 8 }), { alin: "right", despues: 0 }), { der: tw(18), arriba: 60, abajo: 160 }),
        celda(wRest, cuerpoSeccion(s).join(""), { izq: tw(20), arriba: 60, abajo: 160, bordeIzq: pal.rule })
      ]));
      cuerpoEtiquetas = filas.length ? tabla([wEt, wRest], filas) : "";
    } else {
      let primera = true;
      mainSecs.forEach(s => {
        if (s.titulo) main.push(titulo(s, primera));
        else if (!primera) main.push(p("", { despues: 40, linea: 120 }));
        primera = false;
        main.push(...cuerpoSeccion(s));
      });
    }

    // --- Montaje de la página
    let cuerpo;
    if (t.layout === "lateral") {
      const wLado = tw(t.ancho), wMain = ANCHO - wLado;
      const cL = celda(wLado, lado.join("") || p("", { despues: 0 }), { fondo: pal.sideBg, arriba: tw(30), izq: tw(22), der: tw(22), abajo: tw(24), bordeDer: t.id === "t6" ? pal.rule : null });
      const cM = celda(wMain, main.join("") || p("", { despues: 0 }), { arriba: tw(30), izq: tw(30), der: tw(30), abajo: tw(24) });
      cuerpo = t.lado === "der" ? tabla([wMain, wLado], [fila([cM, cL], ALTO - 120)]) : tabla([wLado, wMain], [fila([cL, cM], ALTO - 120)]);
    } else {
      // Cabecera: foto + nombre y contacto
      const franja = t.id === "m4" ? tw(16) : 0;
      const anchoUtil = ANCHO - franja;
      const margen = t.layout === "cabecera" ? 34 : (t.id === "m4" ? 42 : 42);
      const wInt = anchoUtil - tw(margen * 2);
      const lineaContacto = contacto.length ? p(contacto.map((c, k) => r((k ? "   ·   " : "") + c, { color: fgCab || "#222222", size: TS })), { despues: 0, antes: 120, alin: centrar }) : "";
      const textoCab = ident.join("") + lineaContacto;
      const wFoto = conFoto ? tw(tamFoto + 26) : 0;
      let interior;
      if (conFoto) {
        const cF = celda(wFoto, fotoXML, { valign: "center", der: t.fotoPos === "der" ? 0 : tw(20), izq: t.fotoPos === "der" ? tw(20) : 0 });
        const cT = celda(wInt - wFoto, textoCab, { valign: "center" });
        interior = t.fotoPos === "der" ? tabla([wInt - wFoto, wFoto], [fila([cT, cF])]) : tabla([wFoto, wInt - wFoto], [fila([cF, cT])]);
      } else interior = textoCab;
      const separador = banda ? "" : p("", { despues: 0, linea: 120, bordeAbajo: { sz: t.id === "f3" ? 24 : (t.id === "f1" ? 6 : 18), color: t.id === "f1" ? "#111111" : (t.id === "s3" || t.id === "f2" || t.id === "m4" ? pal.acento : pal.rule), space: 6 } });
      const cabFondo = banda ? pal.hdBg : null;
      const sep = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>';
      const cabCelda = celda(anchoUtil, interior + p("", { despues: 0, linea: 120 }) + separador,
        { fondo: cabFondo, arriba: tw(t.layout === "cabecera" ? 26 : 34), abajo: tw(banda ? 24 : 6), izq: tw(margen), der: tw(margen) });
      const cabCeldaSola = cabCelda;

      if (t.layout === "cabecera") {
        const wLado = tw(t.ancho), wMain = ANCHO - wLado;
        const cL = celda(wLado, lado.join("") || p("", { despues: 0 }), { fondo: pal.sideBg, arriba: tw(24), izq: tw(22), der: tw(22), abajo: tw(24), bordeIzq: t.id === "s3" ? pal.rule : null });
        const cM = celda(wMain, main.join("") || p("", { despues: 0 }), { arriba: tw(24), izq: tw(30), der: tw(30), abajo: tw(24) });
        const anchos = t.lado === "der" ? [wMain, wLado] : [wLado, wMain];
        cuerpo = tabla([ANCHO], [fila([cabCeldaSola])]) + sep + tabla(anchos, [fila(t.lado === "der" ? [cM, cL] : [cL, cM], ALTO - 4400)]);
      } else {
        const contenido = (cuerpoEtiquetas != null ? cuerpoEtiquetas + p("", { despues: 0 }) : main.join("")) || p("", { despues: 0 });
        const cBody = celda(anchoUtil, contenido, { arriba: tw(banda ? 24 : 14), izq: tw(margen), der: tw(margen), abajo: tw(24) });
        if (franja) {
          const cS = (alto) => celda(franja, "", { fondo: pal.acento });
          cuerpo = tabla([franja, anchoUtil], [fila([cS(), cabCelda])]) + sep + tabla([franja, anchoUtil], [fila([cS(), cBody], ALTO - 4400)]);
        } else {
          cuerpo = tabla([ANCHO], [fila([cabCelda])]) + sep + tabla([ANCHO], [fila([cBody])]);
        }
      }
    }
    const fuente = x(pal.fuente.word);
    const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<w:body>${cuerpo}<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/><w:rPr><w:sz w:val="2"/></w:rPr></w:pPr></w:p>
<w:sectPr><w:pgSz w:w="${ANCHO}" w:h="${ALTO}"/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>
</w:body></w:document>`;

    const estilos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${fuente}" w:hAnsi="${fuente}" w:cs="${fuente}" w:eastAsia="${fuente}"/><w:sz w:val="${T}"/><w:szCs w:val="${T}"/><w:lang w:val="es-ES"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
</w:styles>`;
    const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rIdEstilos" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${conFoto ? '<Relationship Id="rIdFoto" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/foto.png"/>' : ""}
</Relationships>`;
    const tipos = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
</Types>`;
    const raiz = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
</Relationships>`;
    const ahora = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>${x("Currículum " + [per.nombre, per.apellidos].join(" ").trim())}</dc:title><dc:creator>${x([per.nombre, per.apellidos].join(" ").trim())}</dc:creator><dc:language>es-ES</dc:language>
<dcterms:created xsi:type="dcterms:W3CDTF">${ahora}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${ahora}</dcterms:modified>
</cp:coreProperties>`;

    const files = [
      { name: "[Content_Types].xml", data: tipos }, { name: "_rels/.rels", data: raiz },
      { name: "docProps/core.xml", data: core },
      { name: "word/document.xml", data: doc }, { name: "word/styles.xml", data: estilos },
      { name: "word/_rels/document.xml.rels", data: rels }
    ];
    if (conFoto) files.push({ name: "word/media/foto.png", data: fotoPNG });
    return zip(files);
  }

  // Dibuja la foto en círculo con su aro, como en la plantilla, y la devuelve como PNG.
  function fotoCircular(src, aro, fondo, forma) {
    return new Promise((ok) => {
      if (!src) return ok(null);
      const img = new Image();
      img.onload = () => {
        const S = 480, B = 14, c = document.createElement("canvas"); c.width = c.height = S;
        const g = c.getContext("2d");
        g.fillStyle = fondo; g.fillRect(0, 0, S, S);
        const s0 = Math.min(img.width, img.height);
        if (forma === "rect") { g.drawImage(img, (img.width - s0) / 2, (img.height - s0) / 2, s0, s0, 0, 0, S, S); c.toBlob(b => b.arrayBuffer().then(buf => ok(new Uint8Array(buf))), "image/png"); return; }
        if (aro) { g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fillStyle = aro; g.fill(); }
        g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - (aro ? B : 0), 0, Math.PI * 2); g.clip();
        const s = Math.min(img.width, img.height);
        const m = aro ? B : 0; g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, m, m, S - 2 * m, S - 2 * m);
        g.restore();
        c.toBlob(b => b.arrayBuffer().then(buf => ok(new Uint8Array(buf))), "image/png");
      };
      img.onerror = () => ok(null);
      img.src = src;
    });
  }

  A.exportarWord = async (cv) => {
    const t = A.plantilla(cv.plantilla), pal = A.paleta(cv);
    const fondo = t.layout === "lateral" ? pal.sideBg : (t.banda || t.id === "m1" ? pal.hdBg : "#ffffff");
    const forma = ["f2", "f3"].includes(t.id) ? "rect" : "circulo";
    const aro = ["s4"].includes(t.id) ? null : pal.ring;
    const foto = A.conFoto(cv, t) ? await fotoCircular(cv.datos.personal.foto, aro, fondo, forma) : null;
    const fit = A.cvAjustado(cv);
    return construir(cv, foto, fit.fs);
  };
  A._zip = zip;
})(window.CVApp);
