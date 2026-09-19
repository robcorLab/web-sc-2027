import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PALETA_PARTICULAS } from "../data/contenido";

const SIMBOLO_URL = import.meta.env.BASE_URL + "symbol_sc_2.svg";
const WORLD = 10.264; // emblema cuadrado en unidades 3D (+15% sobre 8.925)
const MAX_PUNTOS = 5000;
// Ciclo enjambre: cada 30s las partículas se dispersan por la sección (5s)
// y se retraen formando de nuevo el símbolo (1.75s). Primer evento a los 8s.
const CICLO = 30;
const FASE_DISPERSION = 5;
const FASE_RETRACCION = 1.75;
const PRIMER_EVENTO = 8;

/* Rasteriza el emblema SC y devuelve posiciones + colores rojos originales */
function useSimboloTargets() {
  const [data, setData] = useState(null);

  useEffect(() => {
    let vivo = true;
    const img = new Image();
    img.src = SIMBOLO_URL;
    img.onload = () => {
      if (!vivo) return;
      const S = 560;
      const c = document.createElement("canvas");
      c.width = S;
      c.height = S;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.clearRect(0, 0, S, S);
      ctx.drawImage(img, 0, 0, S, S);
      const px = ctx.getImageData(0, 0, S, S).data;
      const gap = 3;
      const pts = [];
      const cols = [];
      for (let y = 0; y < S; y += gap) {
        for (let x = 0; x < S; x += gap) {
          const i = (y * S + x) * 4;
          if (px[i + 3] > 120) {
            pts.push([
              (x / S - 0.5) * WORLD,
              -(y / S - 0.5) * WORLD,
              (Math.random() - 0.5) * 0.5,
            ]);
            cols.push([px[i] / 255, px[i + 1] / 255, px[i + 2] / 255]);
          }
        }
      }
      const step = Math.max(1, Math.floor(pts.length / MAX_PUNTOS));
      const targets = [];
      const colors = [];
      for (let k = 0; k < pts.length; k += step) {
        targets.push(pts[k]);
        colors.push(cols[k]);
      }
      setData({ targets, colors });
    };
    img.onerror = () => vivo && setData({ targets: [], colors: [] });
    return () => {
      vivo = false;
    };
  }, []);

  return data;
}

function haloTexture() {
  const S = 256;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, "rgba(255,70,70,0.85)");
  g.addColorStop(0.35, "rgba(255,60,60,0.32)");
  g.addColorStop(0.65, "rgba(255,60,90,0.10)");
  g.addColorStop(1, "rgba(255,60,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return new THREE.CanvasTexture(c);
}

function squareTexture() {
  const c = document.createElement("canvas");
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(2, 2, 28, 28);
  return new THREE.CanvasTexture(c);
}

/* Nube de píxeles que FORMA el emblema y VIAJA con el scroll desde el hero
hasta el footer, con movimiento orbital permanente detrás del contenido */
export function SimboloOrbital({ scrollY }) {
  const ref = useRef();
  const grupo = useRef();
  const giro = useRef();
  const halo = useRef();
  const simbolo = useSimboloTargets();
  const map = useMemo(() => squareTexture(), []);
  const mapHalo = useMemo(() => haloTexture(), []);
  const mouse = useRef({ x: 0, y: 0 });
  // Estado del puntero para órbitas reactivas: giro acumulado al mover (revolver),
  // energía (velocidad suavizada) y posición previa.
  const giroExtra = useRef(0);
  const energia = useRef(0);
  const energiaAcum = useRef(0);
  const prevPuntero = useRef({ x: 0, y: 0 });
  const iniciado = useRef(false);

  const nube = useMemo(() => {
    if (!simbolo || simbolo.targets.length === 0) return null;
    const n = simbolo.targets.length;
    const targets = new Float32Array(n * 3);
    const positions = new Float32Array(n * 3);
    const dispersos = new Float32Array(n * 3); // destino al dispersarse: toda la sección visible
    const colors = new Float32Array(n * 3);
    const seeds = new Float32Array(n * 4); // fase, velocidad, radioX, radioY
    for (let i = 0; i < n; i++) {
      targets[i * 3] = simbolo.targets[i][0];
      targets[i * 3 + 1] = simbolo.targets[i][1] + 0.6;
      targets[i * 3 + 2] = simbolo.targets[i][2];
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 13;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      // Punto de dispersión: cubre todo el viewport (la sección en la que estás,
      // porque el grupo viaja bloqueado con la cámara).
      dispersos[i * 3] = (Math.random() - 0.5) * 26;
      dispersos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      dispersos[i * 3 + 2] = -4 + Math.random() * 6;
      // Reparto aleatorio para que no se vea todo rojo: 30% blanco brillante,
      // 15% negro (con blending aditivo se vuelve calado/transparente y da textura),
      // 55% rojo original del emblema.
      const azar = Math.random();
      if (azar < 0.3) {
        colors[i * 3] = 1;
        colors[i * 3 + 1] = 1;
        colors[i * 3 + 2] = 1;
      } else if (azar < 0.45) {
        colors[i * 3] = 0;
        colors[i * 3 + 1] = 0;
        colors[i * 3 + 2] = 0;
      } else {
        colors[i * 3] = simbolo.colors[i][0];
        colors[i * 3 + 1] = simbolo.colors[i][1];
        colors[i * 3 + 2] = simbolo.colors[i][2];
      }
      seeds[i * 4] = Math.random() * Math.PI * 2; // fase
      seeds[i * 4 + 1] = 0.13 + Math.random() * 0.35; // velocidad orbital
      seeds[i * 4 + 2] = 0.11 + Math.random() * 0.37; // radio X (intermedio)
      seeds[i * 4 + 3] = 0.09 + Math.random() * 0.29; // radio Y (intermedio)
    }
    return { targets, positions, dispersos, colors, seeds, n };
  }, [simbolo]);

  useFrame((state) => {
    if (!ref.current || !nube) return;
    const t = state.clock.elapsedTime;
    mouse.current.x += (state.pointer.x - mouse.current.x) * 0.04;
    mouse.current.y += (state.pointer.y - mouse.current.y) * 0.04;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array;
    const { targets, positions, dispersos, seeds, n } = nube;
    // --- Ciclo enjambre: dispersión (5s) + retracción (1.75s) cada 30s ---
    const te = t - PRIMER_EVENTO;
    let base = 0; // 0 = símbolo formado, 1 = totalmente disperso
    let pulso = 0; // destello al recomponerse
    if (te > 0) {
      const tt = te % CICLO;
      const total = FASE_DISPERSION + FASE_RETRACCION;
      if (tt < total) {
        const crudo =
          tt < FASE_DISPERSION ? tt / FASE_DISPERSION : 1 - (tt - FASE_DISPERSION) / FASE_RETRACCION;
        base = crudo * crudo * (3 - 2 * crudo); // smootherstep global
        if (tt >= FASE_DISPERSION) pulso = Math.sin(((tt - FASE_DISPERSION) / FASE_RETRACCION) * Math.PI); // 0→1→0 al retraer
      }
    }
    const prog = Math.min(1, t / 2.8); // convergencia: disperso -> emblema
    const ease = 1 - Math.pow(1 - prog, 3);
    // Viaje vertical SIN desfase: la cámara desciende exactamente lo mismo
    // que el emblema, así queda siempre bloqueado detrás de la sección visible
    // (misma distancia = sin niebla, sin encogerse, imposible que se esconda).
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const p = Math.min(1, Math.max(0, scrollY.current / max));
    const cam = state.camera;
    const vh = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    // --- Puntero -> órbitas: mover el mouse revuelve el enjambre ---
    if (!iniciado.current) {
      prevPuntero.current.x = state.pointer.x;
      prevPuntero.current.y = state.pointer.y;
      iniciado.current = true;
    }
    const mdx = state.pointer.x - prevPuntero.current.x;
    const mdy = state.pointer.y - prevPuntero.current.y;
    prevPuntero.current.x = state.pointer.x;
    prevPuntero.current.y = state.pointer.y;
    giroExtra.current += mdx * 2.2; // revolver horizontal: gira las órbitas
    const instE = Math.min(3, Math.hypot(mdx, mdy) * 9);
    energia.current += (instE - energia.current) * 0.08; // energía suavizada
    energiaAcum.current += energia.current * 0.045; // fase extra por energía
    // Puntero en unidades mundo (plano del emblema) para atracción suave
    const pwx = mouse.current.x * ((vh * cam.aspect) / 2) - grupo.current.position.x;
    const pwy = mouse.current.y * (vh / 2);
    const wy = scrollY.current * (vh / window.innerHeight); // px scroll -> unidades mundo
    const baseY = 0.4;
    cam.position.y = baseY - wy;
    grupo.current.position.y = baseY - wy;
    grupo.current.position.x = Math.sin(p * Math.PI) * 1.0; // curva suave: se abre al centro del viaje
    // Eje Y en oscilación ±38° (siempre se reconoce el círculo)
    // + vaivén suave permanente para que nunca se quede quieto.
    const VUELTA_34 = Math.PI * 1.5;
    giro.current.rotation.set(
      p * VUELTA_34 + Math.sin(t * 0.18) * 0.35,
      Math.sin(t * 0.22) * 0.66,
      p * VUELTA_34 + Math.sin(t * 0.15) * 0.06
    );
    // El halo respira: ilumina la sección que está detrás en cada momento.
    // Durante la dispersión se atenúa (el símbolo se disuelve) y al retraer
    // lanza un pulso de luz cuando el emblema se recompone.
    if (halo.current) {
      halo.current.material.opacity =
        (0.34 + Math.sin(t * 1.1) * 0.08) * (1 - base * 0.55) + pulso * 0.3;
      const s = 17 + Math.sin(t * 0.7) * 1.2 + base * 10;
      halo.current.scale.set(s, s, 1);
    }
    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const is = i * 4;
      const fase = seeds[is];
      const vel = seeds[is + 1];
      // órbita elíptica alrededor de su punto del emblema + deriva en Z.
      // Sigue al puntero: giro acumulado por movimiento + impulso por energía.
      const ang =
        fase +
        t * vel +
        giroExtra.current * (0.6 + ((seeds[is + 2] * 7) % 0.8)) +
        energiaAcum.current * (0.5 + ((seeds[is + 3] * 9) % 1));
      const ox = Math.cos(ang) * seeds[is + 2];
      const oy = Math.sin(ang) * seeds[is + 3];
      const oz = Math.sin(ang * 0.7 + fase) * 0.42;
      const bx = positions[ix] + (targets[ix] - positions[ix]) * ease;
      const by = positions[ix + 1] + (targets[ix + 1] - positions[ix + 1]) * ease;
      const bz = positions[ix + 2] + (targets[ix + 2] - positions[ix + 2]) * ease;
      // Mezcla enjambre: formado -> disperso por la sección -> formado.
      // Escalonado por partícula (según su fase) para efecto de enjambre orgánico.
      const st = (fase / (Math.PI * 2)) % 1;
      let di = base * 1.4 - st * 0.4;
      di = di < 0 ? 0 : di > 1 ? 1 : di;
      di = di * di * (3 - 2 * di);
      const mx = bx + (dispersos[ix] - bx) * di;
      const my = by + (dispersos[ix + 1] - by) * di;
      const mz = bz + (dispersos[ix + 2] - bz) * di;
      // Atracción suave hacia el puntero (más notable cuando está disperso)
      const atr = 0.1 + di * 0.25;
      const atx = (pwx - mx) * atr;
      const aty = (pwy - my) * atr;
      arr[ix] = mx + ox + atx + mouse.current.x * (0.7 - mz * 0.08);
      arr[ix + 1] = my + oy + aty + mouse.current.y * 0.5;
      arr[ix + 2] = mz + oz; // el viaje vertical lo hace el grupo, no la partícula
    }
    pos.needsUpdate = true;
    ref.current.material.size = 0.072 + Math.sin(t * 1.4) * 0.008;
  });

  if (!nube) return null;
  return (
    <group ref={grupo}>
      {/* halo de luz trasera: ilumina por detrás la sección visible */}
      <sprite ref={halo} position={[0, 0.6, -2.2]}>
        <spriteMaterial
          map={mapHalo}
          transparent
          opacity={0.34}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      <group ref={giro}>
      <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[nube.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[nube.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.072}
        map={map}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
      </points>
      </group>
    </group>
  );
}

/* Polvo ambiental en capas traseras = profundidad de campo */
export function PolvoProfundidad({ scrollY, cantidad = 900 }) {
  const ref = useRef();
  const grupoPolvo = useRef();
  const { positions, colors, seeds } = useMemo(() => {
    const positions = new Float32Array(cantidad * 3);
    const colors = new Float32Array(cantidad * 3);
    const seeds = new Float32Array(cantidad);
    const col = new THREE.Color();
    for (let i = 0; i < cantidad; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 26;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = -Math.random() * 12 - 1;
      col.set(PALETA_PARTICULAS[Math.floor(Math.random() * PALETA_PARTICULAS.length)]);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
      seeds[i] = Math.random() * Math.PI * 2;
    }
    return { positions, colors, seeds };
  }, [cantidad]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // El polvo acompaña a la cámara: siempre hay ambiente alrededor del viewport
    const cam = state.camera;
    const vh = 2 * cam.position.z * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const wy = scrollY.current * (vh / window.innerHeight);
    if (grupoPolvo.current) grupoPolvo.current.position.y = 0.4 - wy;
    const pos = ref.current.geometry.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < cantidad; i++) {
      const ix = i * 3;
      const s = seeds[i];
      arr[ix + 1] += Math.sin(t * 0.3 + s) * 0.0009 + 0.0022;
      arr[ix] += Math.cos(t * 0.22 + s) * 0.0009;
      if (arr[ix + 1] > 8) arr[ix + 1] = -8;
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={grupoPolvo}>
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
    </group>
  );
}
