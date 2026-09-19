import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import { Uniform } from "three";

/* Ojo de pez + aberración cromática + viñeta en un solo pase custom.
   La distorsión respira con la velocidad del scroll: quieto = gran angular
   elegante, scrolleando = warp impactante. */
const FisheyeShader = /* glsl */ `
  uniform float distortion;
  uniform float aberration;
  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    vec2 cc = uv - 0.5;
    float r2 = dot(cc, cc);
    vec2 warped = uv + cc * r2 * distortion;
    float off = aberration * (0.35 + r2 * 2.4);
    vec4 cr = texture2D(inputBuffer, warped + vec2(off, 0.0));
    vec4 cg = texture2D(inputBuffer, warped);
    vec4 cb = texture2D(inputBuffer, warped - vec2(off, 0.0));
    outputColor = vec4(cr.r, cg.g, cb.b, 1.0);
    float vig = smoothstep(0.95, 0.30, length(cc));
    outputColor.rgb *= mix(0.5, 1.0, vig);
  }
`;

class FisheyeEffect extends Effect {
  constructor() {
    super("FisheyeEffect", FisheyeShader, {
      uniforms: new Map([
        ["distortion", new Uniform(0.4)],
        ["aberration", new Uniform(0.0012)],
      ]),
    });
  }
}

export function PostFX({ scrollY }) {
  const fisheye = useMemo(() => new FisheyeEffect(), []);
  const last = useRef(0);
  const ema = useRef(0);
  const init = useRef(false);

  useFrame((state, dt) => {
    const s = scrollY.current;
    if (!init.current) {
      last.current = s;
      init.current = true;
    }
    // velocidad del scroll normalizada (px por frame a 60fps)
    const inst = Math.min(60, Math.abs(s - last.current) / Math.max(0.001, dt * 60));
    last.current = s;
    ema.current += (inst - ema.current) * 0.1;
    const v = ema.current;
    fisheye.uniforms.get("distortion").value = 0.4 + Math.min(0.85, v * 0.09);
    fisheye.uniforms.get("aberration").value = 0.0012 + Math.min(0.006, v * 0.0009);
    // patada de FOV con la velocidad: el lente "respira" al scrollear
    const cam = state.camera;
    const fov = 68 + Math.min(14, v * 1.6);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <EffectComposer multisampling={0}>
      <primitive object={fisheye} />
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.08} luminanceSmoothing={0.2} />
    </EffectComposer>
  );
}
