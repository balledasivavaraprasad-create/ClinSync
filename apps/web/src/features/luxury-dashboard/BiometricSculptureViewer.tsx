import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface BiometricSculptureViewerProps {
  className?: string;
  variant?: 'torus' | 'dna' | 'organic';
}

export const BiometricSculptureViewer: React.FC<BiometricSculptureViewerProps> = ({
  className = '',
  variant: _variant = 'torus',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [modelMode, setModelMode] = useState<'torus' | 'helix' | 'sphere'>('torus');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Check WebGL availability
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // Headless or no WebGL fallback
      return;
    }

    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 5.8);

    // Create sculptural geometry matching the twisted ribbon in reference image
    let geometry: THREE.BufferGeometry;
    if (modelMode === 'torus') {
      // Sculptural 2,3 Torus Knot (Twisted ribbon ring)
      geometry = new THREE.TorusKnotGeometry(1.4, 0.42, 128, 32, 2, 3);
    } else if (modelMode === 'helix') {
      geometry = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32, 3, 5);
    } else {
      geometry = new THREE.TorusGeometry(1.5, 0.5, 32, 100);
    }

    // Ultra-clean high-end ceramic plaster material with soft sheen
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf3f4f6,
      roughness: 0.28,
      metalness: 0.08,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      reflectivity: 0.4,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Core sphere inside the knot (like the floating orb in the user image)
    const orbGeo = new THREE.SphereGeometry(0.55, 32, 32);
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.1,
    });
    const innerOrb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(innerOrb);

    // Soft architectural 3-point lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8);
    keyLight.position.set(4, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    rimLight.position.set(-4, -3, -3);
    scene.add(rimLight);

    const topFill = new THREE.PointLight(0x2dd4bf, 0.7, 10);
    topFill.position.set(0, 3, 2);
    scene.add(topFill);

    // Subtle floating dust/biometric telemetry particles
    const particleCount = 45;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 6;
      particlePositions[i + 1] = (Math.random() - 0.5) * 6;
      particlePositions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa5f3fc,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // Smooth inertia mouse tracking
    let targetRotationX = 0;
    let targetRotationY = 0;
    let isDragging = false;
    let previousMouseX = 0;
    let previousMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        targetRotationY = x * 1.5;
        targetRotationX = y * 1.5;
      } else {
        const deltaX = e.clientX - previousMouseX;
        const deltaY = e.clientY - previousMouseY;
        mesh.rotation.y += deltaX * 0.01;
        mesh.rotation.x += deltaY * 0.01;
        previousMouseX = e.clientX;
        previousMouseY = e.clientY;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Render loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Idle smooth floating rotation
      if (!isDragging) {
        mesh.rotation.y += (targetRotationY - mesh.rotation.y) * 0.05 + 0.006;
        mesh.rotation.x += (targetRotationX - mesh.rotation.x) * 0.05;
        mesh.rotation.z = Math.sin(elapsedTime * 0.5) * 0.1;

        innerOrb.position.y = Math.sin(elapsedTime * 1.2) * 0.08;
      }

      particles.rotation.y -= 0.001;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      orbGeo.dispose();
      orbMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      renderer.dispose();
    };
  }, [modelMode]);

  return (
    <div
      className={`relative w-full h-full min-h-[220px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid="biometric-sculpture-3d"
    >
      <div ref={mountRef} className="w-full h-full absolute inset-0 flex items-center justify-center" />

      {/* Floating Interactive 3D Mode Switcher */}
      <div
        className={`absolute bottom-2 right-2 flex items-center space-x-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 transition-opacity duration-300 z-10 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModelMode('torus');
          }}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            modelMode === 'torus' ? 'bg-white text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="Torus Knot Ribbon"
        >
          Ribbon
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setModelMode('helix');
          }}
          className={`px-2 py-0.5 text-[10px] rounded-full transition-colors ${
            modelMode === 'helix' ? 'bg-white text-black font-bold' : 'text-slate-400 hover:text-white'
          }`}
          title="DNA Biometric Helix"
        >
          Helix
        </button>
      </div>

      {/* Touch hint overlay */}
      <div
        className={`absolute top-2 left-2 text-[10px] font-mono tracking-wider text-slate-400 uppercase pointer-events-none transition-opacity ${
          isHovered ? 'opacity-90' : 'opacity-0'
        }`}
      >
        Drag to rotate 3D
      </div>
    </div>
  );
};
