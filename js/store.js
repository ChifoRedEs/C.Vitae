/* Datos de la app: perfiles, CV y guardado en el navegador (localStorage). */
window.CVApp = window.CVApp || {};
(function (A) {
  "use strict";
  const KEY = "generador-cv:v1";

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  A.uid = uid;

  // Secciones disponibles. "col" indica en qué columna del CV se colocan.
  A.SECCIONES = [
    { clave: "perfil", titulo: "Perfil profesional", col: "main", nombre: "Perfil" },
    { clave: "experiencia", titulo: "Experiencia laboral", col: "main", nombre: "Experiencia" },
    { clave: "formacion", titulo: "Formación", col: "main", nombre: "Formación" },
    { clave: "aptitudes", titulo: "Aptitudes", col: "main", nombre: "Aptitudes" },
    { clave: "personal", titulo: "Información personal", col: "side", nombre: "Información personal" },
    { clave: "idiomas", titulo: "Idiomas", col: "side", nombre: "Idiomas" },
    { clave: "meritos", titulo: "Cursos y méritos", col: "side", nombre: "Cursos y méritos" }
  ];
  A.seccionDef = clave => A.SECCIONES.find(s => s.clave === clave);

  A.personalVacio = () => ({
    nombre: "", apellidos: "", titular: "", foto: "", fotoOriginal: "", fotoAjuste: null,
    telefono: "", email: "", web: "", direccion: "", localidad: "",
    fechaNacimiento: "", mostrarFecha: true, mostrarEdad: false,
    carnet: "", vehiculo: false, disponibilidad: "", incorporacion: "", otros: []
  });

  A.disenoVacio = () => ({ acento: "", fuente: "", escala: 100, ajustar: true, foto: true, lateral: "centro" });

  A.cvVacio = (titulo) => {
    const now = new Date().toISOString();
    return {
      id: uid(), titulo: titulo || "CV sin título", creado: now, actualizado: now,
      plantilla: "t1", diseno: A.disenoVacio(),
      secciones: A.SECCIONES.map(s => ({ clave: s.clave, titulo: s.titulo, visible: true })),
      datos: {
        personal: A.personalVacio(), perfil: "",
        experiencia: [], formacion: [], aptitudes: [], idiomas: [], meritos: []
      }
    };
  };

  A.cvEjemplo = () => {
    const cv = A.cvVacio("Ejemplo · Técnica de logística");
    cv.datos = {
      personal: Object.assign(A.personalVacio(), {
        nombre: "Lucía", apellidos: "Martín Ortega", titular: "Técnica de logística y almacén",
        telefono: "(+34) 600 000 000", email: "lucia.ejemplo@correo.com",
        direccion: "C/ Ejemplo, 12", localidad: "Valencia",
        fechaNacimiento: "1990-03-15", carnet: "B", vehiculo: true,
        disponibilidad: "Mañana y tarde.", incorporacion: "Incorporación inmediata"
      }),
      perfil: "Técnica de logística con 10 años de experiencia en almacén, preparación de pedidos y control de inventario. Acostumbrada a trabajar con SGA y a coordinar equipos en temporadas de alta demanda.",
      experiencia: [
        { id: uid(), puesto: "Jefa de equipo de almacén", empresa: "LOGÍSTICA EJEMPLO S.L.", ciudad: "Valencia", inicio: "2021-03", fin: "", actual: true,
          tareas: ["Coordinar un equipo de 12 personas en turnos de mañana y tarde.", "Controlar el inventario y la trazabilidad con PDA y SGA.", "Planificar la carga de camiones según las rutas de reparto."] },
        { id: uid(), puesto: "Preparadora de pedidos", empresa: "DISTRIBUCIONES MODELO S.A.", ciudad: "Paterna", inicio: "2016-05", fin: "2021-02", actual: false,
          tareas: ["Preparar pedidos de alimentación con radiofrecuencia.", "Manejar carretilla retráctil y transpaleta eléctrica."] }
      ],
      formacion: [
        { id: uid(), titulo: "Técnico Superior en Transporte y Logística", centro: "I.E.S. Ejemplo", anio: "2015", ciudad: "Valencia" }
      ],
      aptitudes: ["Manejo de SGA: SAP y Mecalux.", "Carné de carretillera frontal y retráctil.", "Paquete Office a nivel usuario."],
      idiomas: [{ id: uid(), idioma: "Inglés", nivel: "B1" }, { id: uid(), idioma: "Valenciano", nivel: "C1" }],
      meritos: [
        { id: uid(), titulo: "Prevención de Riesgos Laborales en almacén", entidad: "Centro de Formación Ejemplo", horas: "60", anio: "2022" },
        { id: uid(), titulo: "Operadora de carretillas elevadoras «UNE 58451»", entidad: "Academia Modelo", horas: "8", anio: "2020" }
      ]
    };
    return cv;
  };

  // Completa los campos que falten (CV importados o de versiones anteriores).
  A.normalizarCV = (cv) => {
    const base = A.cvVacio(cv.titulo);
    const out = Object.assign(base, cv);
    out.id = cv.id || uid();
    out.diseno = Object.assign(A.disenoVacio(), cv.diseno || {});
    out.datos = Object.assign(base.datos, cv.datos || {});
    out.datos.personal = Object.assign(A.personalVacio(), out.datos.personal || {});
    ["experiencia", "formacion", "aptitudes", "idiomas", "meritos"].forEach(k => {
      if (!Array.isArray(out.datos[k])) out.datos[k] = [];
    });
    ["experiencia", "formacion", "idiomas", "meritos"].forEach(k => out.datos[k].forEach(x => { if (!x.id) x.id = uid(); }));
    out.datos.experiencia.forEach(x => { if (!Array.isArray(x.tareas)) x.tareas = []; });
    if (!Array.isArray(out.datos.personal.otros)) out.datos.personal.otros = [];
    const secs = Array.isArray(cv.secciones) ? cv.secciones.filter(s => A.seccionDef(s.clave)) : [];
    A.SECCIONES.forEach(s => { if (!secs.find(x => x.clave === s.clave)) secs.push({ clave: s.clave, titulo: s.titulo, visible: true }); });
    out.secciones = secs;
    return out;
  };

  // Convierte el archivo "datos-cv" del editor anterior.
  A.desdeDatosCV = (j) => {
    const cv = A.cvVacio("CV de " + ((j.informacionPersonal && j.informacionPersonal.nombre) || "importado"));
    const ip = j.informacionPersonal || {};
    cv.plantilla = (j.plantilla && j.plantilla.id) || "t1";
    cv.datos.personal = Object.assign(A.personalVacio(), {
      nombre: ip.nombre || "", apellidos: ip.apellidos || "", foto: ip.foto || "", fotoOriginal: ip.foto || "",
      telefono: ip.telefono || "", email: ip.email || "", direccion: ip.direccion || "", localidad: ip.localidad || "",
      fechaNacimiento: ip.fechaNacimiento || "", mostrarEdad: !!ip.mostrarEdad, vehiculo: !!ip.vehiculoPropio,
      disponibilidad: ip.disponibilidad || "", incorporacion: ip.incorporacion || "", otros: ip.otros || []
    });
    cv.datos.experiencia = (j.experienciaLaboral || []).map(x => Object.assign({ id: uid(), tareas: [] }, x));
    cv.datos.formacion = (j.formacion || []).map(x => Object.assign({ id: uid() }, x));
    cv.datos.aptitudes = j.aptitudes || [];
    cv.datos.meritos = (j.meritosYActividades || []).map(x => Object.assign({ id: uid() }, x));
    cv.secciones = [
      { clave: "experiencia", titulo: "Experiencia laboral", visible: true },
      { clave: "formacion", titulo: "Formación y aptitudes", visible: true },
      { clave: "aptitudes", titulo: "", visible: true },
      { clave: "perfil", titulo: "Perfil profesional", visible: true },
      { clave: "personal", titulo: "Información personal", visible: true },
      { clave: "meritos", titulo: "Méritos y actividades", visible: true },
      { clave: "idiomas", titulo: "Idiomas", visible: true }
    ];
    return A.normalizarCV(cv);
  };

  /* ---------- Estado y guardado ---------- */
  const COLORES_PERFIL = ["#3f7476", "#2e64a3", "#7a2a3e", "#55702a", "#a77a12", "#7d4f8f", "#c25b2e"];
  A.COLORES_PERFIL = COLORES_PERFIL;

  A.perfilNuevo = (nombre, i) => ({
    id: uid(), nombre: nombre || "Mi perfil", color: COLORES_PERFIL[(i || 0) % COLORES_PERFIL.length],
    creado: new Date().toISOString(), cvs: []
  });

  A.estadoInicial = () => {
    const p = A.perfilNuevo("Mi perfil", 0);
    const cv = A.cvEjemplo();
    p.cvs.push(cv);
    return { version: 1, perfiles: [p], perfilActivo: p.id, cvActivo: cv.id };
  };

  A.cargar = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.perfiles) && s.perfiles.length) {
          s.perfiles.forEach(p => { p.cvs = (p.cvs || []).map(A.normalizarCV); });
          return s;
        }
      }
    } catch (e) { console.warn("No se pudieron leer los datos guardados", e); }
    return A.estadoInicial();
  };

  let ultimoError = null;
  A.guardar = (s) => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); ultimoError = null; return true; }
    catch (e) { ultimoError = e; return false; }
  };
  A.errorGuardado = () => ultimoError;
  A.bytesUsados = () => { try { return (localStorage.getItem(KEY) || "").length * 2; } catch (e) { return 0; } };
  A.borrarTodo = () => { try { localStorage.removeItem(KEY); } catch (e) {} };
})(window.CVApp);
