import React, { useRef, useState } from 'react';
import { easing } from 'maath';
import { useSnapshot } from 'valtio';
import { useFrame } from '@react-three/fiber';
import { Decal, useGLTF, useTexture } from '@react-three/drei';

import state from '../store';

const Shirt = () => {
  const snap = useSnapshot(state);
  const { nodes, materials } = useGLTF('/shirt_baked.glb');
  const meshRef = useRef();
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragDirection, setDragDirection] = useState(0);

  const logoTexture = useTexture(snap.logoDecal);
  const fullTexture = useTexture(snap.fullDecal);

  const handleMouseDown = (event) => {
    setIsDragging(true);
  };

  const handleMouseUp = (event) => {
    setIsDragging(false);
    setDragDirection(0);
  };

  const handleMouseMove = (event) => {
    if (isDragging && meshRef.current) {
      const { movementX } = event;
      setDragDirection(movementX * 0.01);
    }
  };

  // Add event listeners for mouse events
  React.useEffect(() => {
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += dragDirection;
    }
  });

  useFrame((state, delta) => easing.dampC(materials.lambert1.color, snap.color, 0.25, delta));

  const stateString = JSON.stringify(snap);

  return (
    <group key={stateString}>
      <mesh
        ref={meshRef}
        castShadow
        geometry={nodes.T_Shirt_male.geometry}
        material={materials.lambert1}
        material-roughness={1}
        dispose={null}
      >
        {snap.isFullTexture && (
          <Decal 
            position={[0, 0, 0]}
            rotation={[0, 0, 0]}
            scale={1}
            map={fullTexture}
          />
        )}

        {snap.isLogoTexture && (
          <Decal 
            position={[0, 0.04, 0.15]}
            rotation={[0, 0, 0]}
            scale={0.15}
            map={logoTexture}
            map-anisotropy={16}
            depthTest={false}
            depthWrite={true}
          />
        )}
      </mesh>
    </group>
  );
};

export default Shirt;
