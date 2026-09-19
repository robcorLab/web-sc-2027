import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SimboloOrbital, PolvoProfundidad } from "./components/HeroParticles";
import { PostFX } from "./components/PostFX";
import { CONTENIDO } from "./data/contenido";

gsap.registerPlugin(ScrollTrigger);

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".bloque");
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("vis")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function App() {
  const [menu, setMenu] = useState(false);
  const [light, setLight] = useState(null);
  const [form, setForm] = useState({ nombre: "", email: "", telefono: "", mensaje: "" });
  const scrollY = useRef(0);
  const heroText = useRef(null);
  useReveal();

  useEffect(() => {
    const onScroll = () => {
      scrollY.current = window.scrollY;
      if (heroText.current) {
        const y = window.scrollY;
        heroText.current.style.transform = `translateY(${y * 0.18}px) scale(${1 + y * 0.00035})`;
        heroText.current.style.filter = `blur(${Math.min(8, y * 0.006)}px)`; // profundidad de campo
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const enviar = (e) => {
    e.preventDefault();
    const txt = `Hola Sector Creativo, soy ${form.nombre} (${form.email} / ${form.telefono}): ${form.mensaje}`;
    window.open(`${CONTENIDO.contacto.whatsapp}?text=${encodeURIComponent(txt)}`, "_blank");
  };

  return (
    <>
      <header>
        <a className="logo" href="#top">
          <img className="logo-img logo-desktop" src={import.meta.env.BASE_URL + "logo_sc_3.svg"} alt="Sector Creativo" />
          <img className="logo-img logo-tablet" src={import.meta.env.BASE_URL + "logo_sc_3.svg"} alt="Sector Creativo" />
          <img className="logo-img logo-phone" src={import.meta.env.BASE_URL + "symbol_sc_2.svg"} alt="SC" />
        </a>
        <nav className={menu ? "open" : ""}>
          <a href="#top" onClick={() => setMenu(false)}>WE ARE</a>
          <a href="#servicios" onClick={() => setMenu(false)}>SERVICIOS</a>
          <a href="#proyectos" onClick={() => setMenu(false)}>PROYECTOS</a>
          <a href="#contacto" onClick={() => setMenu(false)}>CONTACTO</a>
        </nav>
        <div className="hamb" onClick={() => setMenu(!menu)}><div /><div /><div /></div>
      </header>

      <div className="fondo-canvas">
        <Canvas camera={{ position: [0, 0.4, 9], fov: 68 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
          <fog attach="fog" args={["#000000", 8, 18]} />
          <ambientLight intensity={0.6} />
          <Suspense fallback={null}>
            <SimboloOrbital scrollY={scrollY} />
            <PolvoProfundidad scrollY={scrollY} />
          </Suspense>
          <PostFX scrollY={scrollY} />
        </Canvas>
      </div>

      <div className="hero" id="top">

        <div className="hero-inner" ref={heroText}>
          <div className="hero-pill hero-kicker">
            <p className="hero-sub">{CONTENIDO.marca.heroKicker}</p>
          </div>
          <h1 className="hero-title">
            <span>{CONTENIDO.marca.tagline}</span>
            <span className="grad">{CONTENIDO.marca.tagline2}</span>
          </h1>
          <div className="hero-pill">
            <p className="hero-sub"><span className="destacado">{CONTENIDO.marca.heroSubIni}</span>{CONTENIDO.marca.heroSubResto}</p>
          </div>
          <div className="hero-cta">
            <a className="btn primary" href="#contacto">Cotizar por WhatsApp</a>
            <a className="btn ghost" href="#proyectos">Ver proyectos</a>
          </div>
        </div>
        <div className="scroll-hint">SCROLL · 3D</div>
      </div>

      <section className="bloque" id="servicios">
        <h2 className="sec">Servicios</h2>
        <p className="lead">{CONTENIDO.marca.descripcion}</p>
        <div className="grid-serv">
          {CONTENIDO.servicios.map((s, i) => (
            <div className="card" key={s.titulo}>
              <span className="n">0{i + 1}</span>
              <h3>{s.titulo}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bloque" id="proyectos">
        <h2 className="sec">Proyectos</h2>
        <p className="lead">Algunos de nuestros proyectos recientes — toca para ampliar.</p>
        <div className="galeria">
          {Array.from({ length: CONTENIDO.proyectosTotal }).map((_, i) => (
            <div className="proy" key={i} onClick={() => setLight(i + 1)}>
              P{i + 1}<small>PROYECTO {i + 1}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="bloque" id="contacto">
        <h2 className="sec">Contacto</h2>
        <p className="lead">Cotizaciones directas por teléfono o WhatsApp en Nuevo Laredo.</p>
        <div className="contacto-wrap">
          <form onSubmit={enviar}>
            <input placeholder="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <input placeholder="Correo electrónico" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <textarea placeholder="Mensaje" required value={form.mensaje} onChange={(e) => setForm({ ...form, mensaje: e.target.value })} />
            <button className="enviar" type="submit">Enviar por WhatsApp</button>
          </form>
          <div className="datos">
            <div className="dato"><b>COTIZACIONES</b>{CONTENIDO.contacto.telefonos.map((t) => (<div key={t.label}><a href={t.href}>{t.label}</a></div>))}</div>
            <div className="dato"><b>DIRECCIÓN</b><a href={CONTENIDO.contacto.maps} target="_blank" rel="noreferrer">{CONTENIDO.contacto.direccion}</a></div>
            <div className="dato"><b>SÍGUENOS · {CONTENIDO.contacto.redes.length} REDES</b>
              <div className="redes">{CONTENIDO.contacto.redes.map((r) => (<a className="red" key={r.nombre} href={r.href} target="_blank" rel="noreferrer" title={r.nombre}>{r.icon}</a>))}</div>
            </div>
          </div>
        </div>
      </section>

      <footer>{CONTENIDO.footer}<a href={CONTENIDO.designByGithub} target="_blank" rel="noreferrer">{CONTENIDO.designBy}</a></footer>

      {light && (
        <div className="lightbox" onClick={() => setLight(null)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>Proyecto {light} / 22</h3>
            <p style={{ color: "#999", margin: "10px 0 18px" }}>Sector Creativo · Comunicación visual — sustituye por img/proyecto{light}.png original.</p>
            <div className="proy" style={{ minHeight: 260 }}>P{light}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <button className="btn ghost" onClick={() => setLight(light === 1 ? 22 : light - 1)}>‹</button>
              <button className="btn primary" onClick={() => setLight(null)}>Cerrar ×</button>
              <button className="btn ghost" onClick={() => setLight(light === 22 ? 1 : light + 1)}>›</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
