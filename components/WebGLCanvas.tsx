'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Import our custom assets
import reliefBg from '@/src/assets/images/garden_relief_bg_1783827131534.jpg';
import letterIFloral from '@/src/assets/images/letter_i_floral_1783827154536.jpg';
import letterAFloral from '@/src/assets/images/letter_a_floral_1783827168960.jpg';
import letterSFloral from '@/src/assets/images/letter_s_floral_1783827183707.jpg';
import letterWFloral from '@/src/assets/images/letter_w_floral_1783827197103.jpg';
import letterCFloral from '@/src/assets/images/letter_c_floral_1783827209498.jpg';

interface WebGLCanvasProps {
  activePage: string;
}

// Custom Vertex Shader
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Custom Fragment Shader for Liquid Transition & Ripples & Base Water Reflection
const fragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform float uProgress;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uMouseStrength;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Define reflection water line (approx bottom 32% of canvas)
    float waterLine = 0.32;
    bool isReflection = uv.y < waterLine;

    if (isReflection) {
      // 1. WATER REFLECTION REGION
      // Calculate continuous ripple wave offsets based on time and position
      float wave = sin(uv.x * 28.0 + uTime * 3.0) * 0.009 + cos(uv.x * 14.0 - uTime * 2.1) * 0.006;
      
      // Calculate flipped UV for reflection, stretching it slightly vertically
      vec2 reflectedUv = vec2(
        uv.x + wave,
        waterLine + (waterLine - uv.y) * 1.4
      );

      // Boundary clamp
      reflectedUv = clamp(reflectedUv, vec2(0.001), vec2(0.999));

      // Sample textures
      vec4 col1 = texture2D(uTexture1, reflectedUv);
      vec4 col2 = texture2D(uTexture2, reflectedUv);
      vec4 baseColor = mix(col1, col2, uProgress);

      // Water reflection fades as it goes downwards (approaching y = 0.0)
      float fade = smoothstep(0.0, waterLine, uv.y);

      // Add a luxurious darker water-wash tint (near black/dark gold overlay)
      vec4 waterTint = vec4(0.02, 0.02, 0.015, 1.0);
      gl_FragColor = mix(waterTint, baseColor, fade * 0.45) * uAlpha;
    } else {
      // 2. MAIN LETTER REGION
      // Calculate mouse displacement (interaction ripple)
      float dist = distance(uv, uMouse);
      if (dist < 0.20) {
        float rippleStrength = (1.0 - dist / 0.20) * uMouseStrength * 0.015;
        float rippleAngle = sin(dist * 40.0 - uTime * 4.0);
        uv += normalize(uv - uMouse) * rippleAngle * rippleStrength;
      }

      // Transition Warp (liquid distortion)
      // Transition is maximum at progress = 0.5
      float distortionScale = sin(uProgress * 3.14159265);
      float warpX = sin(uv.y * 10.0 + uTime) * 0.04 * distortionScale;
      float warpY = cos(uv.x * 10.0 + uTime) * 0.04 * distortionScale;

      vec2 uv1 = uv + vec2(warpX, warpY) * (1.0 - uProgress);
      vec2 uv2 = uv - vec2(warpY, warpX) * uProgress;

      // Keep within bounds
      uv1 = clamp(uv1, vec2(0.001), vec2(0.999));
      uv2 = clamp(uv2, vec2(0.001), vec2(0.999));

      vec4 col1 = texture2D(uTexture1, uv1);
      vec4 col2 = texture2D(uTexture2, uv2);

      gl_FragColor = mix(col1, col2, uProgress) * uAlpha;
    }
  }
`;

// Helper to generate a soft round glow texture for particles without loading external files
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(163, 255, 18, 1)'); // Immersive Garden's #a3ff12 firefly color
    gradient.addColorStop(0.3, 'rgba(163, 255, 18, 0.6)');
    gradient.addColorStop(1, 'rgba(163, 255, 18, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export default function WebGLCanvas({ activePage }: WebGLCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef<string>(activePage);
  
  // Track mouse coordinates for shader & parallax
  const mouse = useRef({ x: 0, y: 0 });
  const targetMouse = useRef({ x: 0, y: 0 });
  const letterHoverStrength = useRef(0);

  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // --- 1. SETUP THREE.JS SCENE ---
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    
    // Orthographic Camera to keep everything flat and UI-like
    const aspect = width / height;
    const camera = new THREE.OrthographicCamera(-aspect * 2, aspect * 2, 2, -2, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    currentMount.appendChild(renderer.domElement);

    // --- 2. LOAD TEXTURES ---
    const textureLoader = new THREE.TextureLoader();

    const textures: Record<string, THREE.Texture> = {
      'home': textureLoader.load(reliefBg.src),
      'the-studio': textureLoader.load(letterIFloral.src),
      'our-approach': textureLoader.load(letterAFloral.src),
      'services': textureLoader.load(letterSFloral.src),
      'awards': textureLoader.load(letterWFloral.src),
      'clients': textureLoader.load(letterCFloral.src),
    };

    // Configure textures
    Object.values(textures).forEach((tex) => {
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
    });

    // --- 3. BACKGROUND BAS-RELIEF PLANE ---
    const bgGeometry = new THREE.PlaneGeometry(5, 5);
    const bgMaterial = new THREE.MeshBasicMaterial({
      map: textures['home'],
      transparent: true,
      opacity: activePage === 'home' ? 0.35 : 0.05,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -1;
    scene.add(bgMesh);

    // --- 4. CENTRAL LETTER PLANE & LIQUID SHADER ---
    const initialTexture = activePage === 'home' ? textures['the-studio'] : textures[activePage];
    const letterGeometry = new THREE.PlaneGeometry(2.4, 3.2); // 3:4 aspect ratio matching the assets
    
    const letterUniforms = {
      uTexture1: { value: initialTexture },
      uTexture2: { value: initialTexture },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseStrength: { value: 0 },
      uAlpha: { value: activePage === 'home' ? 0 : 1 },
    };

    const letterMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: letterUniforms,
      transparent: true,
      depthWrite: false,
    });

    const letterMesh = new THREE.Mesh(letterGeometry, letterMaterial);
    scene.add(letterMesh);

    // --- 5. FLOATING FIREFLIES (WebGL Particles) ---
    const particleCount = 45;
    const particlesGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const particleSpeeds = new Float32Array(particleCount);
    const particleOffsets = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random coordinates inside camera viewport
      positions[i * 3] = (Math.random() - 0.5) * aspect * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2; // Z depth variation

      particleSpeeds[i] = 0.005 + Math.random() * 0.008;
      particleOffsets[i] = Math.random() * 100;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0xa3ff12,
      size: 0.1,
      map: createParticleTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    // --- 6. EVENT HANDLERS ---
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h);
      
      const newAspect = w / h;
      camera.left = -newAspect * 2;
      camera.right = newAspect * 2;
      camera.top = 2;
      camera.bottom = -2;
      camera.updateProjectionMatrix();

      // Make central letter smaller on mobile viewports
      if (w < 768) {
        letterMesh.scale.setScalar(0.72);
      } else {
        letterMesh.scale.setScalar(1.0);
      }
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Normalized coordinates from -1 to 1 for camera parallax
      targetMouse.current.x = (e.clientX / w) * 2 - 1;
      targetMouse.current.y = -(e.clientY / h) * 2 + 1;

      // Local normalized coordinates from 0 to 1 for central plane shader ripples
      const rect = renderer.domElement.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      const relativeY = 1.0 - (e.clientY - rect.top) / rect.height; // invert Y for GLSL coordinate system

      // Map relative coordinates to UV space (accounting for letter mesh layout)
      const meshScale = w < 768 ? 0.72 : 1.0;
      letterUniforms.uMouse.value.set(
        (relativeX - 0.5) / (0.6 * meshScale) + 0.5,
        (relativeY - 0.5) / (0.8 * meshScale) + 0.5
      );

      // Increase ripple strength on move, let it decay in animation loop
      letterHoverStrength.current = 1.0;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- 7. ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      letterUniforms.uTime.value = elapsedTime;

      // Decay mouse hover strength smoothly
      letterHoverStrength.current += (0.0 - letterHoverStrength.current) * 0.08;
      letterUniforms.uMouseStrength.value = letterHoverStrength.current;

      // Interpolate camera parallax based on mouse
      mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.05;
      mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.05;

      // Background Plane parallax
      bgMesh.position.x = mouse.current.x * 0.15;
      bgMesh.position.y = mouse.current.y * 0.15;

      // Letter Mesh parallax (subtle opposite direction for 3D depth separation)
      letterMesh.position.x = -mouse.current.x * 0.04;
      letterMesh.position.y = -mouse.current.y * 0.04;

      // Animate firefly particles
      const positionsAttr = particlesGeometry.attributes.position as THREE.BufferAttribute;
      const array = positionsAttr.array as Float32Array;
      const currentAspect = window.innerWidth / window.innerHeight;
      
      for (let i = 0; i < particleCount; i++) {
        // Rise vertically
        array[i * 3 + 1] += particleSpeeds[i];
        
        // Add horizontal drift (sine wave offset)
        const offset = particleOffsets[i];
        array[i * 3] += Math.sin(elapsedTime * 0.5 + offset) * 0.002;

        // Reset if float offscreen top
        if (array[i * 3 + 1] > 2.5) {
          array[i * 3 + 1] = -2.5;
          array[i * 3] = (Math.random() - 0.5) * currentAspect * 4;
        }
      }
      positionsAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    
    // Initial resize trigger to calibrate aspect ratio & positioning
    handleResize();
    animate();

    // --- 8. DEFINE TRANSITIONS ---
    let currentActivePage = activePage;
    const textureLoaderMap: Record<string, THREE.Texture> = textures;

    const transitionTo = (nextPage: string) => {
      const prevWasHome = currentActivePage === 'home';
      const nextIsHome = nextPage === 'home';

      // Capture active textures
      const nextTexture = textureLoaderMap[nextPage === 'home' ? 'the-studio' : nextPage];
      
      if (prevWasHome && !nextIsHome) {
        // 1. HOME TO SUBPAGE
        letterUniforms.uTexture1.value = nextTexture;
        letterUniforms.uTexture2.value = nextTexture;
        letterUniforms.uProgress.value = 0;
        
        // Fade in central letter plane, dim background
        gsap.to(letterUniforms.uAlpha, { value: 1.0, duration: 1.0, ease: 'power2.out' });
        gsap.to(bgMaterial, { opacity: 0.04, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && nextIsHome) {
        // 2. SUBPAGE TO HOME
        // Fade out central letter plane, brighten background
        gsap.to(letterUniforms.uAlpha, { value: 0.0, duration: 0.8, ease: 'power2.out' });
        gsap.to(bgMaterial, { opacity: 0.35, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && !nextIsHome && currentActivePage !== nextPage) {
        // 3. SUBPAGE TO SUBPAGE (Liquid Morph)
        const currentTexture = textureLoaderMap[currentActivePage];
        
        letterUniforms.uTexture1.value = currentTexture;
        letterUniforms.uTexture2.value = nextTexture;
        letterUniforms.uProgress.value = 0;

        // Animate shader progress uniform to transition liquid distortion
        gsap.to(letterUniforms.uProgress, {
          value: 1.0,
          duration: 1.3,
          ease: 'power3.inOut',
          onComplete: () => {
            letterUniforms.uTexture1.value = nextTexture;
            letterUniforms.uProgress.value = 0;
          }
        });
      }

      currentActivePage = nextPage;
    };

    // React to prop changes using a custom event listener approach or direct reference
    const intervalId = setInterval(() => {
      if (activePageRef.current !== currentActivePage) {
        transitionTo(activePageRef.current);
      }
    }, 100);

    // --- 9. CLEANUP ---
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }

      // Dispose resources
      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      letterGeometry.dispose();
      letterMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();

      Object.values(textures).forEach((tex) => tex.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-black"
    />
  );
}
