"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { createProceduralCamera } from "./ProceduralCamera";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Chapter content refs
  const ch0Ref = useRef<HTMLDivElement>(null);
  const ch1Ref = useRef<HTMLDivElement>(null);
  const ch2Ref = useRef<HTMLDivElement>(null);
  const ch3Ref = useRef<HTMLDivElement>(null);
  const ch4Ref = useRef<HTMLDivElement>(null);
  const ch5Ref = useRef<HTMLDivElement>(null);

  // Floating frames (Post-production chapter)
  const frameRawRef = useRef<HTMLDivElement>(null);
  const frameGradedRef = useRef<HTMLDivElement>(null);

  // Loader state
  const [loading, setLoading] = useState(true);

  // Mouse interaction variables
  const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current || !canvasRef.current) return;

    // --- 1. Three.js Scene Setup ---
    const scene = new THREE.Scene();

    // Cinematic Perspective Camera
    const camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 9);

    // Renderer Configured for Photorealism (PBR, Tone Mapping, Color Management)
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true, // Transparent canvas background to blend seamlessly with HTML background
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // --- 2. Dynamic Environment Map (EnvMap) Setup ---
    // Create a virtual studio scene for rendering reflections
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x050505);

    const panelMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

    // Left studio softbox panel
    const panelLeftGeo = new THREE.PlaneGeometry(3, 8);
    const panelLeft = new THREE.Mesh(panelLeftGeo, panelMat);
    panelLeft.position.set(-6, 2, 2);
    panelLeft.rotation.y = Math.PI / 3;
    envScene.add(panelLeft);

    // Right studio softbox panel
    const panelRightGeo = new THREE.PlaneGeometry(3, 8);
    const panelRight = new THREE.Mesh(panelRightGeo, panelMat);
    panelRight.position.set(6, 2, 2);
    panelRight.rotation.y = -Math.PI / 3;
    envScene.add(panelRight);

    // Top softbox panel
    const panelTopGeo = new THREE.PlaneGeometry(6, 3);
    const panelTop = new THREE.Mesh(panelTopGeo, panelMat);
    panelTop.position.set(0, 6, 0);
    panelTop.rotation.x = Math.PI / 2;
    envScene.add(panelTop);

    // Cube camera setup for dynamic reflection rendering
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 15, cubeRenderTarget);
    envScene.add(cubeCamera);

    // Render environment map once
    cubeCamera.update(renderer, envScene);
    scene.environment = cubeRenderTarget.texture;

    // --- 3. Studio Lights (Atmospheric Studio Setup) ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const keySpotLight = new THREE.SpotLight(0xffffff, 4.0, 15, Math.PI / 4, 0.4, 1);
    keySpotLight.position.set(4, 5, 5);
    keySpotLight.castShadow = true;
    keySpotLight.shadow.mapSize.width = 1024;
    keySpotLight.shadow.mapSize.height = 1024;
    keySpotLight.shadow.camera.near = 0.5;
    keySpotLight.shadow.camera.far = 15;
    keySpotLight.shadow.bias = -0.0005;
    keySpotLight.shadow.radius = 4;
    scene.add(keySpotLight);

    const rimSpotLight = new THREE.SpotLight(0xaaccff, 2.5, 12, Math.PI / 5, 0.3, 1);
    rimSpotLight.position.set(-4, 3, -4);
    scene.add(rimSpotLight);

    const fillLight = new THREE.DirectionalLight(0xfff3e0, 0.8);
    fillLight.position.set(-5, -2, 3);
    scene.add(fillLight);

    const lensLight = new THREE.PointLight(0x0088ff, 0.0, 6);
    lensLight.position.set(0, 0, 1.8);
    scene.add(lensLight);

    const backdropLight = new THREE.SpotLight(0xfff9f2, 5.0, 15, Math.PI / 3, 0.5, 1);
    backdropLight.position.set(0, 0, 4);
    scene.add(backdropLight);

    // --- 4. Cyclorama Backdrop & Shadow Catcher ---
    const cycGeo = new THREE.PlaneGeometry(30, 20);
    const cycMat = new THREE.MeshStandardMaterial({
      color: 0xFAF9F6,
      roughness: 0.95,
      metalness: 0.0,
    });
    const cycMesh = new THREE.Mesh(cycGeo, cycMat);
    cycMesh.position.set(0, 0, -4.5);
    cycMesh.receiveShadow = true;
    scene.add(cycMesh);
    backdropLight.target = cycMesh;

    const floorGeo = new THREE.PlaneGeometry(30, 20);
    const floorMesh = new THREE.Mesh(floorGeo, cycMat);
    floorMesh.position.set(0, -2.5, 0);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // --- 5. High-Realism Camera Object ---
    const cameraGroup = createProceduralCamera();
    
    // Initial composition offset to the right
    cameraGroup.position.set(1.4, -0.1, 0);
    cameraGroup.rotation.set(0.1, -Math.PI / 7, 0);
    cameraGroup.scale.set(0.95, 0.95, 0.95);
    
    scene.add(cameraGroup);

    // Named parts for exploded-view animations
    const parts = cameraGroup.userData.explodedParts;

    // Turn off loader
    setLoading(false);

    // --- 6. Mouse Parallax (Cinematic Inertia) ---
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.targetX = (e.clientX / window.innerWidth) - 0.5;
      mouse.current.targetY = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // --- 7. Master GSAP ScrollTrigger Exploded Timeline ---
    const timeline = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2, // Smooth scroll tracking with inertia
      },
    });

    // Precision engineering assembly curve (Power3.easeOut for magnetic precision feel)
    const assemblyEase = "power3.out";

    timeline
      // --- PHASE 1 & 2: Assembled Scroll-Driven Rotation (0% to 30% scroll) ---
      .to(cameraGroup.rotation, { y: -Math.PI / 5, x: 0.12, duration: 2 }, 0)
      .to(cameraGroup.position, { x: 1.1, y: -0.2, z: 0.5, duration: 2 }, 0)
      .to(ch0Ref.current, { opacity: 0, y: -60, duration: 1 }, 0)
      .to(ch1Ref.current, { opacity: 1, y: 0, duration: 1 }, 1.2)

      // --- PHASE 3: Physical Disassembly / Explosion Axis-Aligned (30% to 50% scroll) ---
      // Move camera to center and face directly front-facing
      .to(cameraGroup.position, { x: 0, y: -0.15, z: 1.2, duration: 2 }, 2.5)
      .to(cameraGroup.rotation, { x: 0, y: 0, z: 0, duration: 2 }, 2.5)
      
      // Explode physical component sub-groups along original axes with detailed offsets
      .to(parts.glassGroup.position, { z: 2.4, duration: 2 }, 2.5)       // Front elements move far forward
      .to(parts.barrelGroup.position, { z: 1.5, duration: 2 }, 2.5)      // Lens barrels move forward
      .to(parts.apertureGroup.position, { z: 0.9, duration: 2 }, 2.5)    // Internal aperture separates forward
      .to(parts.mountGroup.position, { z: 0.45, duration: 2 }, 2.5)      // Chrome mount ring separates forward
      .to(parts.viewfinderGroup.position, { y: 0.75, duration: 2 }, 2.5)  // Viewfinder pulls upward
      .to(parts.controlsGroup.position, { y: 0.5, duration: 2 }, 2.5)    // Dials/buttons pull upward
      .to(parts.gripGroup.position, { x: 0.35, duration: 2 }, 2.5)       // Grip expands outward to the right
      // bodyGroup remains anchored at 0,0,0

      .to(ch1Ref.current, { opacity: 0, y: -40, duration: 1 }, 2.5)
      .to(ch2Ref.current, { opacity: 1, y: 0, duration: 1 }, 3.5)

      // --- PHASE 4: Full Exploded hold & backdrop dark transition (50% to 60% scroll) ---
      // Hold exploded positions, rotate parent group slightly to reveal visual spacing depth
      .to(cameraGroup.rotation, { y: 0.12, x: 0.06, duration: 1.5 }, 4.5)
      
      // Blend Cyclorama backdrop to deep charcoal slate
      .to(cycMat.color, { r: 0.03, g: 0.05, b: 0.09, duration: 1.5 }, 4.5)
      .to(backdropLight.color, { r: 0.05, g: 0.1, b: 0.18, duration: 1.5 }, 4.5)
      .to(backdropLight, { intensity: 3.0, duration: 1.5 }, 4.5)
      .to(keySpotLight.color, { r: 0.8, g: 0.9, b: 1.0, duration: 1.5 }, 4.5)
      .to(keySpotLight, { intensity: 2.0, duration: 1.5 }, 4.5)
      .to(fillLight, { intensity: 0.1, duration: 1.5 }, 4.5)
      .to(rimSpotLight, { intensity: 4.0, duration: 1.5 }, 4.5)
      
      .to(ch2Ref.current, { opacity: 0, y: -40, duration: 1 }, 4.5)
      .to(ch3Ref.current, { opacity: 1, y: 0, duration: 1 }, 5.0)

      // --- PHASE 5: Precision Reassembly (60% to 90% scroll) ---
      // Camera faces front-aligned again
      .to(cameraGroup.rotation, { x: 0, y: 0, z: 0, duration: 2 }, 6.0)
      
      // Reassemble parts back to exact coordinates with magnetic precision deceleration
      .to(parts.glassGroup.position, { z: 0, ease: assemblyEase, duration: 2.5 }, 6.0)
      .to(parts.barrelGroup.position, { z: 0, ease: assemblyEase, duration: 2.3 }, 6.2)
      .to(parts.apertureGroup.position, { z: 0, ease: assemblyEase, duration: 2.1 }, 6.4)
      .to(parts.mountGroup.position, { z: 0, ease: assemblyEase, duration: 1.9 }, 6.6)
      .to(parts.viewfinderGroup.position, { y: 0, ease: assemblyEase, duration: 2.1 }, 6.4)
      .to(parts.controlsGroup.position, { y: 0, ease: assemblyEase, duration: 2.0 }, 6.5)
      .to(parts.gripGroup.position, { x: 0, ease: assemblyEase, duration: 1.8 }, 6.7)
      
      .to(ch3Ref.current, { opacity: 0, y: -40, duration: 1 }, 6.0)
      .to(ch4Ref.current, { opacity: 1, y: 0, duration: 1 }, 7.2)
      
      // Post-production raw/graded visual comparison cards
      .to(frameRawRef.current, { opacity: 0.9, scale: 1, x: -300, y: -90, duration: 1.5 }, 6.8)
      .to(frameGradedRef.current, { opacity: 1, scale: 1.05, x: -130, y: 130, duration: 2.0 }, 7.2)

      // --- PHASE 6: Lock & Release (90% to 100% scroll) ---
      // Fully assembled camera scales down and moves up
      .to(cameraGroup.position, { x: 0, y: 1.4, z: -2.0, duration: 2.5 }, 8.8)
      .to(cameraGroup.rotation, { y: Math.PI * 2, x: 0, z: 0, duration: 2.5 }, 8.8)
      .to(cameraGroup.scale, { x: 0.45, y: 0.45, z: 0.45, duration: 2.5 }, 8.8)
      
      // Reset studio backdrop colors
      .to(cycMat.color, { r: 0.98, g: 0.97, b: 0.96, duration: 1.5 }, 8.8)
      .to(backdropLight.color, { r: 1.0, g: 0.97, b: 0.95, duration: 1.5 }, 8.8)
      .to(backdropLight, { intensity: 5.0, duration: 1.5 }, 8.8)
      .to(keySpotLight.color, { r: 1.0, g: 1.0, b: 1.0, duration: 1.5 }, 8.8)
      .to(keySpotLight, { intensity: 4.0, duration: 1.5 }, 8.8)
      .to(fillLight, { intensity: 0.8, duration: 1.5 }, 8.8)
      .to(rimSpotLight, { intensity: 2.5, duration: 1.5 }, 8.8)
      
      .to(frameRawRef.current, { opacity: 0, scale: 0.5, duration: 1 }, 8.8)
      .to(frameGradedRef.current, { opacity: 0, scale: 0.5, duration: 1 }, 8.8)
      .to(ch4Ref.current, { opacity: 0, y: -40, duration: 1 }, 8.8)
      .to(ch5Ref.current, { opacity: 1, y: 0, duration: 1.5 }, 9.5);

    // --- 8. Render & Animation Loop ---
    let animationFrameId: number;

    const animate = () => {
      // Smooth interpolation for mouse movement (inertia)
      mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.04;
      mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.04;

      // Small responsive pointer tilt
      camera.position.x = mouse.current.x * 0.4;
      camera.position.y = -mouse.current.y * 0.4;
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- Clean Up ---
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      timeline.kill();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[450vh] bg-[#FAF9F6]"
    >
      {/* Pinned Viewport Container */}
      <div
        ref={stickyRef}
        className="sticky top-0 w-full h-screen overflow-hidden flex items-center justify-center"
      >
        {/* Three.js Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        />

        {/* Loader Screen */}
        {loading && (
          <div className="absolute inset-0 z-50 flex flex-col justify-center items-center bg-[#FAF9F6] text-slate-900">
            <h3 className="font-semibold text-lg uppercase tracking-wider mb-2">
              Creative • Market
            </h3>
            <div className="w-16 h-0.5 bg-slate-200 overflow-hidden relative">
              <div className="absolute top-0 left-0 h-full w-1/2 bg-primary rounded animate-pulse"></div>
            </div>
          </div>
        )}

        {/* HTML Text Overlays */}

        {/* Chapter 0: Initial Hero Load */}
        <div
          ref={ch0Ref}
          className="absolute left-[6%] lg:left-[10%] max-w-lg px-6 text-left space-y-6 z-20 transition-all duration-300 pointer-events-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            <span className="text-[10px] font-black uppercase tracking-widest">
              THE PREMIUM CREATIVE NETWORK
            </span>
          </div>
          <h1 className="text-5xl lg:text-[76px] font-black tracking-tight text-slate-950 leading-[0.92] max-w-xl">
            Find the right creative <br />
            for every story.
          </h1>
          <p className="text-sm lg:text-base text-slate-500 font-normal max-w-md leading-relaxed">
            Discover photographers, videographers, and editors for projects worth remembering.
          </p>
          <div className="flex gap-4 pt-2">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-[10px] uppercase tracking-wider px-8 py-3.5 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Explore Talent</span>
              <span>&rarr;</span>
            </Link>
          </div>
          <div className="pt-8 animate-bounce">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
              Scroll to explore
            </span>
            <span className="text-slate-400">&darr;</span>
          </div>
        </div>

        {/* Chapter 1: Photography */}
        <div
          ref={ch1Ref}
          className="absolute left-[8%] lg:left-[12%] max-w-md px-6 text-left space-y-4 z-20 opacity-0 translate-y-8 transition-all duration-300 pointer-events-none"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
            01 — DISCIPLINE
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 leading-tight">
            PHOTOGRAPHY
          </h2>
          <h3 className="text-lg font-bold text-slate-800 leading-snug">
            Capture more than a moment.
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Discover and book vetted photographers for portraits, events, fashion, brands, and cinematic stories.
          </p>
          <div className="pt-2 pointer-events-auto">
            <Link
              href="/freelancers?profession=PHOTOGRAPHER"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors"
            >
              <span>Explore Photographers</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Chapter 2: Exploded details */}
        <div
          ref={ch2Ref}
          className="absolute left-[8%] lg:left-[12%] max-w-md px-6 text-left space-y-4 z-20 opacity-0 translate-y-8 transition-all duration-300 pointer-events-none"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
            02 — STRUCTURE
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-950 leading-tight">
            PRECISION DETAILS
          </h2>
          <h3 className="text-lg font-bold text-slate-800 leading-snug">
            Every story starts with the details.
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Suspended alignment showing complete Sony mirrorless chassis architecture. Precision behind every frame.
          </p>
        </div>

        {/* Chapter 3: Videography */}
        <div
          ref={ch3Ref}
          className="absolute right-[8%] lg:right-[12%] max-w-md px-6 text-left space-y-4 z-20 opacity-0 translate-y-8 transition-all duration-300 pointer-events-none"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
            03 — DISCIPLINE
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            VIDEOGRAPHY
          </h2>
          <h3 className="text-lg font-bold text-slate-200 leading-snug">
            Bring every story to life.
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            From high-end commercial campaigns to wedding documentaries, find filmmakers who know how to move an audience.
          </p>
          <div className="pt-2 pointer-events-auto">
            <Link
              href="/freelancers?profession=VIDEOGRAPHER"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors"
            >
              <span>Explore Videographers</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Chapter 4: Post-Production */}
        <div
          ref={ch4Ref}
          className="absolute right-[8%] lg:right-[12%] max-w-md px-6 text-left space-y-4 z-20 opacity-0 translate-y-8 transition-all duration-300 pointer-events-none"
        >
          <span className="text-[9px] font-black uppercase tracking-widest text-primary block">
            04 — DISCIPLINE
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-white leading-tight">
            POST-PRODUCTION
          </h2>
          <h3 className="text-lg font-bold text-slate-200 leading-snug">
            Where every frame finds its final form.
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Connect with specialized video editors, colorists, and motion designers who turn raw footage into finished masterpieces.
          </p>
          <div className="pt-2 pointer-events-auto">
            <Link
              href="/freelancers?profession=VIDEO_EDITOR"
              className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary hover:text-primary-hover transition-colors"
            >
              <span>Explore Editors</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Post-Production Visual Frames */}
        <div
          ref={frameRawRef}
          className="absolute z-20 w-52 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 opacity-0 scale-75 pointer-events-none transition-all duration-300"
        >
          <img
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&q=80"
            alt="Unedited flat log input"
            className="w-full h-full object-cover grayscale brightness-75 contrast-75"
          />
          <div className="absolute top-2 left-2 bg-slate-950/75 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded text-white tracking-widest">
            RAW LOG INPUT
          </div>
        </div>
        <div
          ref={frameGradedRef}
          className="absolute z-25 w-56 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border border-white/20 opacity-0 scale-75 pointer-events-none transition-all duration-300"
        >
          <img
            src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=400&q=80"
            alt="Color graded output"
            className="w-full h-full object-cover saturate-125 contrast-110 brightness-95"
          />
          <div className="absolute top-2 left-2 bg-primary/95 text-[8px] font-extrabold uppercase px-2 py-0.5 rounded text-white tracking-widest">
            FINAL GRADED OUTPUT
          </div>
        </div>

        {/* Chapter 5: One Marketplace Reveal */}
        <div
          ref={ch5Ref}
          className="absolute max-w-4xl px-6 text-center space-y-8 z-20 opacity-0 translate-y-8 transition-all duration-300 pointer-events-none"
        >
          <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
            ONE MARKETPLACE
          </span>
          <h2 className="text-5xl md:text-7xl font-black tracking-tight text-slate-950 leading-[0.95] max-w-3xl mx-auto">
            Every creative discipline. <br />
            One place to find it.
          </h2>
          <p className="text-sm md:text-base text-slate-500 font-normal max-w-xl mx-auto leading-relaxed">
            Hire verified creators and launch your creative projects securely on the platform.
          </p>
          <div className="flex justify-center gap-4 pt-4 pointer-events-auto">
            <Link
              href="/freelancers"
              className="bg-primary hover:bg-primary-hover text-white font-extrabold text-[10px] uppercase tracking-wider px-8 py-4 rounded-xl transition shadow-lg shadow-primary/25 inline-flex items-center gap-2"
            >
              <span>Get Started</span>
              <span>&rarr;</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
