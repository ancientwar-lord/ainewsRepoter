import { CameraControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom, ToneMapping } from "@react-three/postprocessing";
import { useEffect, useRef } from "react";
import { Avatar } from "./Avatar";

export const Experience = () => {
  const controls = useRef();

  useEffect(() => {
    controls.current.setLookAt(1, 2.2, 10, 0, 1.5, 0);
    controls.current.setLookAt(0, 1.7, 0.8, 0, 1.5, 0.4, true);
  }, []);

  return (
    <>
      <CameraControls ref={controls} />
      <directionalLight position={[1, 0.5, -3]} intensity={2} color="blue" />
      <directionalLight position={[-1, 0.5, -2]} intensity={2} color="green" />
      <directionalLight position={[1, 1, 3]} intensity={2} />
      <Stars
        radius={250}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />
      <Avatar />
      <EffectComposer>
        <Bloom mipmapBlur intensity={1.2} />
        <ToneMapping />
      </EffectComposer>
    </>
  );
};
