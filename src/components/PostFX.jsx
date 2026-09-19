import { EffectComposer, Bloom } from "@react-three/postprocessing";

export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={1.15} luminanceThreshold={0.08} luminanceSmoothing={0.2} />
    </EffectComposer>
  );
}