'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Import our background relief asset
import reliefBg from '@/src/assets/images/garden_relief_bg_1783827131534.jpg';

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

// Custom Fragment Shader for Liquid Transition & Base Water Reflection (No mouse interactions)
const fragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform float uProgress;
  uniform float uTime;
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

// Custom Fragment Shader for Background Bas-Relief (Grayscale cover mapping)
const bgFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uAspect;
  uniform float uTextureAspect;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Cover calculation: adjust UV coordinates to maintain aspect ratio
    if (uAspect > uTextureAspect) {
      float s = uTextureAspect / uAspect;
      uv.y = (uv.y - 0.5) * s + 0.5;
    } else {
      float s = uAspect / uTextureAspect;
      uv.x = (uv.x - 0.5) * s + 0.5;
    }

    vec4 color = texture2D(uTexture, uv);
    
    // Grayscale conversion
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // High-end dark monochrome with subtle warm shift
    // Keep it very dark so it reads as premium/luxury
    vec3 mono = vec3(gray * 0.38, gray * 0.36, gray * 0.34);

    gl_FragColor = vec4(mono, uOpacity);
  }
`;

// Helper to generate a soft round glow texture for particles
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
  return new THREE.CanvasTexture(canvas);
}

// Dynamic Texture Generator for Roman Numerals (Crisp vector rendering + beautiful glow)
function createRomanNumeralTexture(numeral: string) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    
    // Setup elegant typography
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Setup glow effect (soft drop shadow)
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 45;
    
    // Fill with glowing color
    ctx.fillStyle = '#ffffff';
    
    // Draw numeral in the center using Cormorant Garamond / Serif
    ctx.font = '300 240px var(--font-serif), Cormorant Garamond, Times New Roman, serif';
    ctx.fillText(numeral, 256, 230); // shift slightly up to offset water reflection line
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

export default function WebGLCanvas({ activePage }: WebGLCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activePageRef = useRef<string>(activePage);

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
    const bgTexture = textureLoader.load(reliefBg.src);
    bgTexture.minFilter = THREE.LinearFilter;
    bgTexture.generateMipmaps = false;

    // Create Roman numeral textures dynamically
    const numeralTextures: Record<string, THREE.Texture> = {
      'the-studio': createRomanNumeralTexture('I'),
      'our-approach': createRomanNumeralTexture('II'),
      'services': createRomanNumeralTexture('III'),
      'awards': createRomanNumeralTexture('IV'),
      'clients': createRomanNumeralTexture('V'),
    };

    // Redraw textures when google fonts are loaded to ensure Cormorant Garamond is applied
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(() => {
        // Redraw textures with loaded font
        const pages = ['the-studio', 'our-approach', 'services', 'awards', 'clients'];
        const numerals = ['I', 'II', 'III', 'IV', 'V'];
        
        pages.forEach((p, idx) => {
          const oldTex = numeralTextures[p];
          numeralTextures[p] = createRomanNumeralTexture(numerals[idx]);
          
          // If the old texture is currently loaded in uniforms, update it immediately
          if (letterUniforms.uTexture1.value === oldTex) {
            letterUniforms.uTexture1.value = numeralTextures[p];
          }
          if (letterUniforms.uTexture2.value === oldTex) {
            letterUniforms.uTexture2.value = numeralTextures[p];
          }
          
          oldTex.dispose();
        });
      });
    }

    // --- 3. BACKGROUND BAS-RELIEF COVER PLANE ---
    // Start with 5x5 plane, scaled dynamically in handleResize
    const bgGeometry = new THREE.PlaneGeometry(5, 5);
    
    const bgUniforms = {
      uTexture: { value: bgTexture },
      uOpacity: { value: activePage === 'home' ? 0.85 : 0.08 },
      uAspect: { value: aspect },
      uTextureAspect: { value: 1920 / 1080 }, // Aspect ratio of reliefBg image
    };

    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: bgFragmentShader,
      uniforms: bgUniforms,
      transparent: true,
      depthWrite: false,
    });

    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgMesh.position.z = -1;
    scene.add(bgMesh);

    // --- 4. CENTRAL LETTER PLANE & LIQUID SHADER ---
    const initialTexture = activePage === 'home' ? numeralTextures['the-studio'] : numeralTextures[activePage];
    const letterGeometry = new THREE.PlaneGeometry(2.4, 2.4); // Square plane so Roman numerals don't get warped
    
    const letterUniforms = {
      uTexture1: { value: initialTexture },
      uTexture2: { value: initialTexture },
      uProgress: { value: 0 },
      uTime: { value: 0 },
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
      positions[i * 3] = (Math.random() - 0.5) * aspect * 4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;

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

    // --- 6. RESIZE EVENT HANDLER (Full Canvas / Cover) ---
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

      // Pass new aspect ratios to background shader for perfect cover fitting
      bgUniforms.uAspect.value = newAspect;

      // Scale background mesh to fill frustum exactly
      bgMesh.scale.set((newAspect * 4.0) / 5.0, 4.0 / 5.0, 1);

      // Scale central letter geometry to show completely on all viewports without cropping
      if (w < 768) {
        letterMesh.scale.setScalar(0.70); // slightly smaller on mobile to guarantee fits
      } else {
        letterMesh.scale.setScalar(1.05); // full size on desktop
      }
    };
    window.addEventListener('resize', handleResize);

    // Initial resize trigger to calibrate aspect ratio & positioning
    handleResize();

    // --- 7. ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();
      letterUniforms.uTime.value = elapsedTime;

      // Animate firefly particles
      const positionsAttr = particlesGeometry.attributes.position as THREE.BufferAttribute;
      const array = positionsAttr.array as Float32Array;
      const currentAspect = window.innerWidth / window.innerHeight;
      
      for (let i = 0; i < particleCount; i++) {
        array[i * 3 + 1] += particleSpeeds[i];
        
        const offset = particleOffsets[i];
        array[i * 3] += Math.sin(elapsedTime * 0.5 + offset) * 0.002;

        if (array[i * 3 + 1] > 2.5) {
          array[i * 3 + 1] = -2.5;
          array[i * 3] = (Math.random() - 0.5) * currentAspect * 4;
        }
      }
      positionsAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // --- 8. DEFINE TRANSITIONS ---
    let currentActivePage = activePage;

    const transitionTo = (nextPage: string) => {
      const prevWasHome = currentActivePage === 'home';
      const nextIsHome = nextPage === 'home';

      // Capture active textures
      const nextTexture = nextPage === 'home' ? numeralTextures['the-studio'] : numeralTextures[nextPage];
      
      if (prevWasHome && !nextIsHome) {
        // 1. HOME TO SUBPAGE
        letterUniforms.uTexture1.value = nextTexture;
        letterUniforms.uTexture2.value = nextTexture;
        letterUniforms.uProgress.value = 0;
        
        // Fade in central letter plane, dim background
        gsap.to(letterUniforms.uAlpha, { value: 1.0, duration: 1.0, ease: 'power2.out' });
        gsap.to(bgUniforms.uOpacity, { value: 0.08, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && nextIsHome) {
        // 2. SUBPAGE TO HOME
        // Fade out central letter plane, brighten background
        gsap.to(letterUniforms.uAlpha, { value: 0.0, duration: 0.8, ease: 'power2.out' });
        gsap.to(bgUniforms.uOpacity, { value: 0.85, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && !nextIsHome && currentActivePage !== nextPage) {
        // 3. SUBPAGE TO SUBPAGE (Liquid Morph)
        const currentTexture = numeralTextures[currentActivePage];
        
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

      bgTexture.dispose();
      Object.values(numeralTextures).forEach((tex) => tex.dispose());
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
