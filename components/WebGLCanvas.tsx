'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

// Import assets
import reliefBg from '@/src/assets/images/garden_relief_bg_1783827131534.jpg';
import floralI from '@/src/assets/images/floral_I.png';
import floralII from '@/src/assets/images/floral_II.png';
import floralIII from '@/src/assets/images/floral_III.png';
import floralIV from '@/src/assets/images/floral_IV.png';
import floralV from '@/src/assets/images/floral_V.png';

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

// Fragment Shader for Liquid Transition & Base Water Reflection
const fragmentShader = `
  uniform sampler2D uTexture1;
  uniform sampler2D uTexture2;
  uniform float uProgress;
  uniform float uTime;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    float waterLine = 0.28;
    bool isReflection = uv.y < waterLine;

    if (isReflection) {
      // WATER REFLECTION REGION
      float wave = sin(uv.x * 28.0 + uTime * 3.0) * 0.009 + cos(uv.x * 14.0 - uTime * 2.1) * 0.006;
      
      vec2 reflectedUv = vec2(
        uv.x + wave,
        waterLine + (waterLine - uv.y) * 1.4
      );

      reflectedUv = clamp(reflectedUv, vec2(0.001), vec2(0.999));

      vec4 col1 = texture2D(uTexture1, reflectedUv);
      vec4 col2 = texture2D(uTexture2, reflectedUv);
      vec4 baseColor = mix(col1, col2, uProgress);

      float fade = smoothstep(0.0, waterLine, uv.y);

      vec4 waterTint = vec4(0.02, 0.02, 0.015, 1.0);
      gl_FragColor = mix(waterTint, baseColor, fade * 0.4) * uAlpha;
    } else {
      // MAIN LETTER REGION - Liquid distortion during transitions
      float distortionScale = sin(uProgress * 3.14159265);
      float warpX = sin(uv.y * 10.0 + uTime) * 0.04 * distortionScale;
      float warpY = cos(uv.x * 10.0 + uTime) * 0.04 * distortionScale;

      vec2 uv1 = uv + vec2(warpX, warpY) * (1.0 - uProgress);
      vec2 uv2 = uv - vec2(warpY, warpX) * uProgress;

      uv1 = clamp(uv1, vec2(0.001), vec2(0.999));
      uv2 = clamp(uv2, vec2(0.001), vec2(0.999));

      vec4 col1 = texture2D(uTexture1, uv1);
      vec4 col2 = texture2D(uTexture2, uv2);

      gl_FragColor = mix(col1, col2, uProgress) * uAlpha;
    }
  }
`;

// Background Fragment Shader (Grayscale cover-fit)
const bgFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uAspect;
  uniform float uTextureAspect;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // Cover calculation
    if (uAspect > uTextureAspect) {
      float s = uTextureAspect / uAspect;
      uv.y = (uv.y - 0.5) * s + 0.5;
    } else {
      float s = uAspect / uTextureAspect;
      uv.x = (uv.x - 0.5) * s + 0.5;
    }

    vec4 color = texture2D(uTexture, uv);
    
    // Grayscale with subtle warm shift for luxury feel
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 mono = vec3(gray * 0.38, gray * 0.36, gray * 0.34);

    gl_FragColor = vec4(mono, uOpacity);
  }
`;

// Firefly particle texture
function createParticleTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, 'rgba(163, 255, 18, 1)');
    gradient.addColorStop(0.3, 'rgba(163, 255, 18, 0.6)');
    gradient.addColorStop(1, 'rgba(163, 255, 18, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
  }
  return new THREE.CanvasTexture(canvas);
}

// Map page slugs to imported floral images
const floralImageMap: Record<string, typeof floralI> = {
  'the-studio': floralI,
  'our-approach': floralII,
  'services': floralIII,
  'awards': floralIV,
  'clients': floralV,
};

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

    // Load floral Roman numeral textures from generated images
    const floralTextures: Record<string, THREE.Texture> = {};
    Object.entries(floralImageMap).forEach(([key, img]) => {
      const tex = textureLoader.load(img.src);
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      floralTextures[key] = tex;
    });

    // --- 3. BACKGROUND BAS-RELIEF COVER PLANE ---
    const bgGeometry = new THREE.PlaneGeometry(5, 5);
    
    const bgUniforms = {
      uTexture: { value: bgTexture },
      uOpacity: { value: activePage === 'home' ? 0.85 : 0.08 },
      uAspect: { value: aspect },
      uTextureAspect: { value: 1920 / 1080 },
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
    const initialTexture = activePage === 'home'
      ? floralTextures['the-studio']
      : floralTextures[activePage];
    
    const letterGeometry = new THREE.PlaneGeometry(2.8, 2.8);
    
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

    // --- 6. RESIZE HANDLER ---
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

      bgUniforms.uAspect.value = newAspect;
      bgMesh.scale.set((newAspect * 4.0) / 5.0, 4.0 / 5.0, 1);

      // Scale letter to show fully on all viewports
      if (w < 768) {
        letterMesh.scale.setScalar(0.75);
      } else {
        letterMesh.scale.setScalar(1.1);
      }
    };
    window.addEventListener('resize', handleResize);
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
        array[i * 3] += Math.sin(elapsedTime * 0.5 + particleOffsets[i]) * 0.002;

        if (array[i * 3 + 1] > 2.5) {
          array[i * 3 + 1] = -2.5;
          array[i * 3] = (Math.random() - 0.5) * currentAspect * 4;
        }
      }
      positionsAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // --- 8. TRANSITIONS ---
    let currentActivePage = activePage;

    const transitionTo = (nextPage: string) => {
      const prevWasHome = currentActivePage === 'home';
      const nextIsHome = nextPage === 'home';

      const nextTexture = nextPage === 'home'
        ? floralTextures['the-studio']
        : floralTextures[nextPage];
      
      if (prevWasHome && !nextIsHome) {
        // HOME → SUBPAGE
        letterUniforms.uTexture1.value = nextTexture;
        letterUniforms.uTexture2.value = nextTexture;
        letterUniforms.uProgress.value = 0;
        
        gsap.to(letterUniforms.uAlpha, { value: 1.0, duration: 1.0, ease: 'power2.out' });
        gsap.to(bgUniforms.uOpacity, { value: 0.08, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && nextIsHome) {
        // SUBPAGE → HOME
        gsap.to(letterUniforms.uAlpha, { value: 0.0, duration: 0.8, ease: 'power2.out' });
        gsap.to(bgUniforms.uOpacity, { value: 0.85, duration: 1.0, ease: 'power2.out' });
      } else if (!prevWasHome && !nextIsHome && currentActivePage !== nextPage) {
        // SUBPAGE → SUBPAGE (Liquid Morph)
        const currentTexture = floralTextures[currentActivePage];
        
        letterUniforms.uTexture1.value = currentTexture;
        letterUniforms.uTexture2.value = nextTexture;
        letterUniforms.uProgress.value = 0;

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

      renderer.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      letterGeometry.dispose();
      letterMaterial.dispose();
      particlesGeometry.dispose();
      particlesMaterial.dispose();

      bgTexture.dispose();
      Object.values(floralTextures).forEach((tex) => tex.dispose());
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
