import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import LogoImg from '../assets/Logo.jpg';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [animationState, setAnimationState] = useState('loading'); // 'loading' or 'cinematic'
  const canvasRef = useRef(null);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);

          // Start the 3D cinematic sequence immediately
          setAnimationState('cinematic');

          // Trigger POS Dashboard entrance exactly when the 4.8s wobbly zoom completes
          const completeTimer = setTimeout(() => {
            if (onComplete) onComplete();
          }, 4800);

          return 100;
        }
        return prev + 3; // Smooth loading speed
      });
    }, 60);

    return () => clearInterval(interval);
  }, [onComplete]);

  // Three.js 3D WebGL Coin Rendering Engine
  useEffect(() => {
    if (animationState !== 'cinematic' || !canvasRef.current) return;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup - Aspect ratio set to full-screen viewport
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    // Positioned at Z=8.5 to keep the 1.6-radius coin elegantly sized in the center
    camera.position.set(0, 0, 8.5);

    // 3. Renderer setup - full-screen canvas size
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // 4. Lighting - Premium dynamic reflections
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight1.position.set(5, 5, 4);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xff8833, 1.8);
    dirLight2.position.set(-5, -3, 2);
    scene.add(dirLight2);

    // 5. Geometry & Textured Material for a thick real 3D coin (Radius 1.6 to keep it elegant and medium)
    const geometry = new THREE.CylinderGeometry(1.6, 1.6, 0.32, 64);

    // Load Zaiqa Mahal Logo as texture map
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load(LogoImg);
    texture.colorSpace = THREE.SRGBColorSpace;

    // Metallic gold-orange rim
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      metalness: 0.9,
      roughness: 0.12,
    });

    // Logo mapped top/bottom faces
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.65,
      roughness: 0.22,
    });

    // Apply materials to groups: index 0 (rim), index 1 (top cap), index 2 (bottom cap)
    const materials = [rimMaterial, faceMaterial, faceMaterial];

    // Create Mesh
    const coin = new THREE.Mesh(geometry, materials);
    scene.add(coin);

    // 6. Physics/Math Animation render loop
    let reqId;
    const startTime = Date.now();

    // 90-degree correction offset to rotate the texture perfectly horizontal and right-side up!
    const logoRotationOffset = Math.PI * 0.5;

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000; // in seconds

      if (elapsed < 1.4) {
        // Phase 1: 3D Spiral Flight & Gravity Curve Roll (0.0s to 1.4s)
        const ratio = elapsed / 1.4; // 0 to 1
        const tReverse = 1 - ratio;

        // Position coordinates spiraling into the center (0, 0, 0)
        coin.position.x = 4.8 * tReverse * Math.cos(elapsed * 4.5);
        coin.position.y = 4.2 * tReverse * tReverse; // Parabolic gravity curve drop
        coin.position.z = -5.0 * tReverse * tReverse; // Fly forward from deep screen space

        // 3D rolling rotation flips along X, Y, Z axes
        coin.rotation.x = elapsed * 4.5;
        coin.rotation.y = elapsed * 7.5;
        coin.rotation.z = elapsed * 3.2;
      } else if (elapsed < 2.4) {
        // Phase 2: Euler's Disk Gyroscopic Precession Wobble (1.4s to 2.4s - 1.0s)
        const t = elapsed - 1.4;
        coin.position.set(0, 0, 0); // Lock translation to center

        // Highly accelerated decay (exp -5.5) to ensure it comes to absolute mathematical rest by 2.4s
        const tilt = 0.55 * Math.exp(-t * 5.5);

        // Wobble frequency SPEEDS UP exponentially as it settles (Euler's Disk physics)
        const wobbleFrequency = 14 + t * 18;

        // Swirling gyroscopic precession along X and Z axes (creates beautiful circular wobbly tilt)
        const precessionX = Math.sin(t * wobbleFrequency) * tilt;
        const precessionZ = Math.cos(t * wobbleFrequency) * tilt;

        // Tilted flat settle target is Math.PI / 2 * 0.82 (74 degrees)
        coin.rotation.x = (Math.PI / 2 * 0.82) + precessionX;
        coin.rotation.y = (1440 * Math.PI / 180) + logoRotationOffset + (t * 0.8 * Math.exp(-t * 4.5));
        coin.rotation.z = precessionZ;
      } else if (elapsed < 3.8) {
        // Phase 2.5: COMPLETE STATIC REST (2.4s to 3.8s - 1.4 full seconds!)
        // Coin lies completely flat, straight, and rock-solid still on the surface!
        coin.position.set(0, 0, 0);
        coin.scale.set(1, 1, 1);
        coin.rotation.x = Math.PI / 2 * 0.82;
        coin.rotation.y = (1440 * Math.PI / 180) + logoRotationOffset;
        coin.rotation.z = 0;
      } else if (elapsed < 4.8) {
        // Phase 3: Slow & Majestic Camera Zoom-in through center (3.8s to 4.8s - 1.0s)
        const t = elapsed - 3.8;
        const ratio = t / 1.0; // 0 to 1

        coin.position.x = 0;

        // Smoothly lay completely flat (90 degrees rotateX)
        coin.rotation.x = (Math.PI / 2 * 0.82) + (Math.PI / 2 * 0.18) * ratio;
        coin.rotation.y = (1440 * Math.PI / 180) + logoRotationOffset;
        coin.rotation.z = 0;

        // Slow, majestic zoom-through (scales coin by 28x to bypass camera view)
        const scaleFactor = 1.0 + ratio * 28.0;
        coin.scale.set(scaleFactor, scaleFactor, scaleFactor);

        // Slide forward into camera view
        coin.position.z = ratio * 5.2;
        coin.position.y = -ratio * 1.0;
      }

      renderer.render(scene, camera);
      reqId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup resources to prevent WebGL context leaks
    return () => {
      cancelAnimationFrame(reqId);
      renderer.dispose();
      geometry.dispose();
      rimMaterial.dispose();
      faceMaterial.dispose();
      texture.dispose();
    };
  }, [animationState]);

  return (
    <div
      className={`flex flex-col items-center justify-center h-screen w-full select-none transition-colors duration-1000 relative overflow-hidden ${animationState === 'cinematic' ? 'cinematic-bg' : 'bg-[#f7f8fa]'
        }`}
    >
      {/* Cinematic keyframes for background fading & luxury ambient grids */}
      <style>{`
        @keyframes bgFadeOut {
          0%, 79% {
            background-color: rgba(247, 248, 250, 1);
          }
          100% {
            background-color: rgba(247, 248, 250, 0);
          }
        }
        @keyframes techGridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes shimmerSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .cinematic-bg {
          animation: bgFadeOut 4.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }
        
        .luxury-grid {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(0, 0, 0, 0.015) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.015) 1px, transparent 1px);
          animation: techGridMove 24s linear infinite;
        }
        .glowing-culinary-backlight {
          background: radial-gradient(circle at center, rgba(249, 115, 22, 0.08) 0%, transparent 60%);
        }
      `}</style>

      {/* Tech Grid Background (Fades on cinematic zoom) */}
      <div className={`absolute inset-0 luxury-grid z-0 transition-opacity duration-1000 ${animationState === 'cinematic' ? 'opacity-0' : 'opacity-30'
        }`}></div>

      {/* Warm Ambient Backlight (Fades on cinematic zoom) */}
      <div className={`absolute w-[800px] h-[800px] glowing-culinary-backlight rounded-full pointer-events-none z-0 transition-opacity duration-1000 ${animationState === 'cinematic' ? 'opacity-0' : 'opacity-100'
        }`}></div>

      {/* FULL-SCREEN 3D WebGL Canvas Overlay for Seamless Zoom-through */}
      {animationState === 'cinematic' ? (
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-screen h-screen pointer-events-none z-50 drop-shadow-[0_25px_45px_rgba(0,0,0,0.35)]"
        />
      ) : (
        /* Pulse standard circle in center during loading bar phase */
        <div className="relative mb-12 flex items-center justify-center w-full h-[220px] z-10 animate-pulse">
          {/* Outer Coin Border Wrapper (displays the 3D rim) */}
          <div className="w-48 h-48 rounded-full border-4 border-orange-500 p-1.5 bg-white flex items-center justify-center coin-3d-edge shadow-[0_15px_35px_rgba(249,115,22,0.18)]">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center border border-zinc-800">
              <img
                src={LogoImg}
                alt="Zaiqa Mahal Logo"
                className="w-full h-full object-cover select-none pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Brand Text Wrapper - Slides down and fades out immediately at transition start */}
      <div
        className={`text-center z-10 transition-all duration-[600ms] ease-out transform ${animationState !== 'loading'
          ? 'opacity-0 translate-y-8 scale-95 pointer-events-none blur-[6px]'
          : 'opacity-100 translate-y-0 scale-100'
          }`}
      >
        <h1 className="text-4xl font-extrabold mb-2 tracking-[0.18em] uppercase select-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 font-sans">
            Zaiqa Mahal
          </span>
        </h1>
        <p className="text-zinc-500 font-mono font-black tracking-[0.4em] text-[10px] uppercase select-none mb-10">
          Point of Sale System
        </p>
      </div>

      {/* Glassmorphic Loading Progress Bar Container - Blurs and disappears */}
      <div
        className={`w-72 max-w-sm z-10 transition-all duration-[600ms] ease-out transform ${animationState !== 'loading'
          ? 'opacity-0 scale-90 pointer-events-none blur-[6px]'
          : 'opacity-100 scale-100'
          }`}
      >
        <div className="flex justify-between mb-2 px-1">
          <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em]">Loading Assets</span>
          <span className="text-xs font-black text-amber-500 tracking-wider">{progress}%</span>
        </div>

        {/* Frosted glass progress container - light mode style */}
        <div className="w-full bg-black/5 border border-black/5 p-1 rounded-full shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="w-full bg-zinc-200/80 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(249,115,22,0.35)] relative"
              style={{ width: `${progress}%` }}
            >
              {/* Dynamic Scanning Shimmer */}
              <div
                className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 w-full h-full"
                style={{
                  animation: 'shimmerSweep 1.5s linear infinite',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
