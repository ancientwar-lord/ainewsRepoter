import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { VISEMES } from "wawa-lipsync";
import { lipsyncManager } from "../App";

const facialExpression = {
  browInnerUp: 0.17,
    eyeSquintLeft: 0.4,
    eyeSquintRight: 0.44,
    noseSneerLeft: 0.1700000727403593,
    noseSneerRight: 0.14000002836874015,
    mouthPressLeft: 0.61,
    mouthPressRight: 0.41000000000000003,}

let setupMode = false;

export function Avatar(props) {
  const { nodes, materials, scene } = useGLTF(
    "/models/686f742935402afcb99dd966.glb"
  );
  
  const {animations} = useGLTF("/models/animations.glb");
  
  const group = useRef();
  const {actions, mixer} = useAnimations(animations, group);
  const [animation, setAnimation] = useState(animations.find((a) => a.name === "Idle") ? "Idle" : animations[0].name);
  const [prevIsSpeaking, setPrevIsSpeaking] = useState(false);
  const [prevIsListening, setPrevIsListening] = useState(false);
  
  useEffect(() => {
    if (actions[animation]) {
      actions[animation]
        ?.reset()
        .fadeIn(mixer.stats.actions.inUse === 0 ? 0 : 0.5)
        .play();}
        // If setupMode is true, we don't want 
    return () => {
      if (actions[animation]) {
        actions[animation]?.fadeOut(0.5);
      }
    };
  }, [animation, actions]);

  const lerpMorphTarget = (target, value, speed = 0.1) => {
    scene.traverse((child) => {
      if (child.isSkinnedMesh && child.morphTargetDictionary) {
        const index = child.morphTargetDictionary[target];
        if (
          index === undefined ||
          child.morphTargetInfluences[index] === undefined
        ) {
          return;
        }
        child.morphTargetInfluences[index] = THREE.MathUtils.lerp(
          child.morphTargetInfluences[index],
          value,
          speed
        );      
        if (!setupMode) {
          try {
            set({
              [target]: value,
            });
          } catch (e) {}
        }
      }
    });
  };

  const [blink, setBlink] = useState(false);
  const [winkLeft, setWinkLeft] = useState(false);
  const [winkRight, setWinkRight] = useState(false);

  useFrame((frameState) => {

    if (!setupMode && nodes.EyeLeft?.morphTargetDictionary) {
      Object.keys(nodes.EyeLeft.morphTargetDictionary).forEach((key) => {
        const mapping = facialExpression;
        if (key === "eyeBlinkLeft" || key === "eyeBlinkRight") {
          return;
        }
        if (mapping && mapping[key]) {
          lerpMorphTarget(key, mapping[key], 0.1);
        } else {
          lerpMorphTarget(key, 0, 0.1);
        }
      });
    }
    // Handle blinking
    lerpMorphTarget("eyeBlinkLeft", blink || winkLeft ? 1 : 0, 0.5);
    lerpMorphTarget("eyeBlinkRight", blink || winkRight ? 1 : 0, 0.5);

    // LIPSYNC
    if (setupMode) {
      return;
    }

    const viseme = lipsyncManager.viseme;
    const lipsyncState = lipsyncManager.state;
    const isSpeaking = lipsyncManager.state === "speaking" || viseme !== "viseme_sil" || lipsyncManager.isSpeaking;
    const isListening = lipsyncManager.isListening || false;
    
    // Debug logging for state changes
    if (isListening !== prevIsListening) {
      console.log("Avatar: Listening state changed from", prevIsListening, "to", isListening);
    }
    if (isSpeaking !== prevIsSpeaking) {
      console.log("Avatar: Speaking state changed from", prevIsSpeaking, "to", isSpeaking);
    }
    
    // Handle animation switching based on speaking and listening states
    if (isSpeaking !== prevIsSpeaking || isListening !== prevIsListening) {
      setPrevIsSpeaking(isSpeaking);
      setPrevIsListening(isListening);
      
      if (isSpeaking) {
        // Priority 1: Switch to talking animation with hand gestures
        console.log("Avatar: Switching to talking animation");
        const talkingAnimation = animations.find((a) => a.name === "Talking_1") || 
                                animations.find((a) => a.name.toLowerCase().includes("talking")) ||
                                animations.find((a) => a.name.toLowerCase().includes("talk"));
        
        if (talkingAnimation && actions[talkingAnimation.name]) {
          setAnimation(talkingAnimation.name);
        }
      } else if (isListening) {
        // Priority 2: Switch to listening animation
        console.log("Avatar: Switching to listening animation");
        const listeningAnimation = animations.find((a) => a.name === "Angry") || 
                                  animations.find((a) => a.name.toLowerCase().includes("listening")) ||
                                  animations.find((a) => a.name.toLowerCase().includes("listen"));
        
        if (listeningAnimation && actions[listeningAnimation.name]) {
          setAnimation(listeningAnimation.name);
        } else {
          console.log("Avatar: No listening animation found, available animations:", animations.map(a => a.name));
        }
      } else {
        // Priority 3: Switch back to idle animation
        const idleAnimation = animations.find((a) => a.name === "Idle") || animations[0];
        if (idleAnimation && actions[idleAnimation.name]) {
          setAnimation(idleAnimation.name);
        }
      }
    }
    
    // Apply current viseme
    lerpMorphTarget(
      viseme,
      1,
      lipsyncState === "vowel" ? 0.2 : 0.4
    );

    // Reset other visemes
    Object.values(VISEMES).forEach((value) => {
      if (viseme === value) {
        return;
      }
      lerpMorphTarget(
        value,
        0,
        lipsyncState === "vowel" ? 0.1 : 0.2
      );
    });
  });

  useEffect(() => {
    let blinkTimeout;
    const nextBlink = () => {
      blinkTimeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          nextBlink();
        }, 200);
      }, THREE.MathUtils.randInt(1000, 5000));
    };
    nextBlink();
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Leva controls for morph targets (optional, for debugging)
  const [, set] = (() => {
    try {
      // Try to import useControls if leva is available
      const { useControls } = require('leva');
      return useControls("MorphTarget", () => ({}));
    } catch (e) {
      // Fallback if leva is not available
      return [null, () => {}];
    }
  })();

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={nodes.Hips} />
      <skinnedMesh
        name="Wolf3D_Body"
        geometry={nodes.Wolf3D_Body.geometry}
        material={materials.Wolf3D_Body}
        skeleton={nodes.Wolf3D_Body.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Bottom"
        geometry={nodes.Wolf3D_Outfit_Bottom.geometry}
        material={materials.Wolf3D_Outfit_Bottom}
        skeleton={nodes.Wolf3D_Outfit_Bottom.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Footwear"
        geometry={nodes.Wolf3D_Outfit_Footwear.geometry}
        material={materials.Wolf3D_Outfit_Footwear}
        skeleton={nodes.Wolf3D_Outfit_Footwear.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Outfit_Top"
        geometry={nodes.Wolf3D_Outfit_Top.geometry}
        material={materials.Wolf3D_Outfit_Top}
        skeleton={nodes.Wolf3D_Outfit_Top.skeleton}
      />
      <skinnedMesh
        name="Wolf3D_Hair"
        geometry={nodes.Wolf3D_Hair.geometry}
        material={materials.Wolf3D_Hair}
        skeleton={nodes.Wolf3D_Hair.skeleton}
      />
      <skinnedMesh
        name="EyeLeft"
        geometry={nodes.EyeLeft.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeLeft.skeleton}
        morphTargetDictionary={nodes.EyeLeft.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeLeft.morphTargetInfluences}
      />
      <skinnedMesh
        name="EyeRight"
        geometry={nodes.EyeRight.geometry}
        material={materials.Wolf3D_Eye}
        skeleton={nodes.EyeRight.skeleton}
        morphTargetDictionary={nodes.EyeRight.morphTargetDictionary}
        morphTargetInfluences={nodes.EyeRight.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Head"
        geometry={nodes.Wolf3D_Head.geometry}
        material={materials.Wolf3D_Skin}
        skeleton={nodes.Wolf3D_Head.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Head.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Head.morphTargetInfluences}
      />
      <skinnedMesh
        name="Wolf3D_Teeth"
        geometry={nodes.Wolf3D_Teeth.geometry}
        material={materials.Wolf3D_Teeth}
        skeleton={nodes.Wolf3D_Teeth.skeleton}
        morphTargetDictionary={nodes.Wolf3D_Teeth.morphTargetDictionary}
        morphTargetInfluences={nodes.Wolf3D_Teeth.morphTargetInfluences}
      />
    </group>
  );
}

useGLTF.preload("/models/686f742935402afcb99dd966.glb");
useGLTF.preload("/models/animations.glb");
