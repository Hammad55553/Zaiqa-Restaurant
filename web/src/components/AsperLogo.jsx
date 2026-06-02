import React, { useEffect, useState } from 'react';

const AsperLogo = ({ onComplete }) => {
  const [fade, setFade] = useState(false);
  const [visible, setVisible] = useState(false);

  const playIntroSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // 1. Futuristic Whoosh Sweep (Triangle Wave + Lowpass Filter Sweep)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 1.6);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 1.2);

      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2.0);

      // 2. Crystal Clear Tech Chime (starts at 0.8s, matching bracket arrival)
      const chimeOsc = ctx.createOscillator();
      const chimeGain = ctx.createGain();
      const chimeFilter = ctx.createBiquadFilter();

      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(880, ctx.currentTime + 0.8); // A5 note
      chimeOsc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 1.6); // A6 sweep

      chimeFilter.type = 'bandpass';
      chimeFilter.frequency.setValueAtTime(1500, ctx.currentTime + 0.8);

      chimeGain.gain.setValueAtTime(0.001, ctx.currentTime + 0.8);
      chimeGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.9);
      chimeGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);

      chimeOsc.connect(chimeFilter);
      chimeFilter.connect(chimeGain);
      chimeGain.connect(ctx.destination);

      chimeOsc.start(ctx.currentTime + 0.8);
      chimeOsc.stop(ctx.currentTime + 2.5);

    } catch (err) {
      console.warn("Web Audio Context not permitted or blocked by browser policies:", err);
    }
  };

  useEffect(() => {
    // Trigger entrance animation slightly after mount
    const introTimer = setTimeout(() => {
      setVisible(true);
      playIntroSound(); // Play futuristic startup audio chime!
    }, 100);

    // Trigger exit animation after slower animations complete
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 3800);

    // Notify completion
    const completeTimer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 4400);

    return () => {
      clearTimeout(introTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 flex flex-col items-center justify-center bg-[#07080a] text-white z-50 transition-opacity duration-500 select-none ${
        fade ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* CSS Custom Keyframes & Styles */}
      <style>{`
        @keyframes drawOuterRing {
          0% { stroke-dashoffset: 628; transform: rotate(-90deg); }
          50% { stroke-dashoffset: 0; transform: rotate(90deg); }
          100% { stroke-dashoffset: 0; transform: rotate(270deg); }
        }
        @keyframes bracketLeft {
          0% { transform: translateX(5px); opacity: 0; }
          40% { transform: translateX(-4px); opacity: 1; }
          80% { transform: translateX(0px); opacity: 1; }
          100% { transform: translateX(0px); opacity: 1; }
        }
        @keyframes bracketRight {
          0% { transform: translateX(-5px); opacity: 0; }
          40% { transform: translateX(4px); opacity: 1; }
          80% { transform: translateX(0px); opacity: 1; }
          100% { transform: translateX(0px); opacity: 1; }
        }
        @keyframes slashDraw {
          0% { stroke-dashoffset: 120; opacity: 0; }
          30% { stroke-dashoffset: 120; opacity: 0; }
          70% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(249, 115, 22, 0.4)) drop-shadow(0 0 25px rgba(249, 115, 22, 0.2)); }
          50% { filter: drop-shadow(0 0 20px rgba(249, 115, 22, 0.7)) drop-shadow(0 0 40px rgba(249, 115, 22, 0.4)); }
        }
        @keyframes techGridMove {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .anim-ring {
          stroke-dasharray: 628;
          stroke-dashoffset: 628;
          animation: drawOuterRing 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          transform-origin: center;
        }
        .anim-bracket-left {
          animation: bracketLeft 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .anim-bracket-right {
          animation: bracketRight 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        .anim-slash {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: slashDraw 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .glow-effect {
          animation: glowPulse 3.5s infinite ease-in-out;
        }
        .grid-bg {
          background-size: 40px 40px;
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          animation: techGridMove 20s linear infinite;
        }
        .glow-radial {
          background: radial-gradient(circle at center, rgba(249, 115, 22, 0.08) 0%, transparent 60%);
        }
        .shimmer-name {
          background: linear-gradient(90deg, #ffffff 0%, #ff8833 25%, #ffcc66 50%, #ff8833 75%, #ffffff 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmerText 4s linear infinite;
        }
      `}</style>

      {/* Tech Grid Background */}
      <div className="absolute inset-0 grid-bg opacity-40 z-0"></div>
      
      {/* Centered Glowing Radial Backlight */}
      <div className="absolute w-[600px] h-[600px] glow-radial rounded-full pointer-events-none z-0"></div>

      {/* Main Animated Wrapper */}
      <div 
        className={`flex flex-col items-center justify-center z-10 transition-all duration-[800ms] cubic-bezier(0.16, 1, 0.3, 1) transform ${
          fade ? 'scale-110 opacity-0 blur-[6px]' : visible ? 'scale-100 opacity-100' : 'scale-90 opacity-0 blur-[10px]'
        }`}
      >
        {/* Animated Coding SVG Logo */}
        <div className="relative w-36 h-36 flex items-center justify-center mb-8 glow-effect">
          <svg className="w-full h-full" viewBox="0 0 220 220">
            {/* Outer Circular Ring representing Software Packaging/Loading */}
            <circle
              cx="110"
              cy="110"
              r="95"
              fill="none"
              stroke="url(#orangeGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              className="anim-ring"
            />
            
            {/* Coding Icon Brackets: < and > */}
            {/* Left Bracket */}
            <path
              d="M 85,85 L 60,110 L 85,135"
              fill="none"
              stroke="#ff8833"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="anim-bracket-left"
            />
            {/* Slash */}
            <path
              d="M 98,155 L 122,65"
              fill="none"
              stroke="#ffffff"
              strokeWidth="10"
              strokeLinecap="round"
              className="anim-slash"
            />
            {/* Right Bracket */}
            <path
              d="M 135,85 L 160,110 L 135,135"
              fill="none"
              stroke="#ff8833"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="anim-bracket-right"
            />

            {/* Gradient definition */}
            <defs>
              <linearGradient id="orangeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4500" />
                <stop offset="50%" stopColor="#ff8833" />
                <stop offset="100%" stopColor="#ffcc66" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Company Name with Typing/Shimmer effect */}
        <h1 className="text-3xl font-black tracking-[0.25em] font-sans text-center mb-2 select-none uppercase">
          <span className="shimmer-name">Asper InfoTech</span>
        </h1>

        {/* Dynamic Glowing Line */}
        <div 
          className={`h-[1px] bg-gradient-to-r from-transparent via-orange-500 to-transparent w-48 mb-3 transition-all duration-1000 delay-300 ${
            visible ? 'scale-x-100 opacity-80' : 'scale-x-0 opacity-0'
          }`}
        ></div>

        {/* Developer Subtitle Tagline */}
        <p className="text-[10px] font-extrabold tracking-[0.4em] text-zinc-500 uppercase flex items-center gap-1.5">
          <span>&lt;</span>
          <span className="text-zinc-400">Innovation in Code</span>
          <span>/&gt;</span>
        </p>
      </div>

      {/* Bottom Subtle Watermark/Loading hint */}
      <div 
        className={`absolute bottom-8 text-[9px] font-bold text-zinc-600 tracking-[0.2em] transition-all duration-1000 delay-500 uppercase ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        Powered by Asper Engine
      </div>
    </div>
  );
};

export default AsperLogo;
