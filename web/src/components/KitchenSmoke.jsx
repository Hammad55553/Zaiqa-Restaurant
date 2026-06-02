import React, { useEffect, useState } from 'react';

const KitchenSmoke = ({ duration = 6000 }) => {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setActive(false);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!active) return null;

  // 6 randomized steam/smoke cloud particles - much slower (5.0s to 5.8s) for premium realistic flow
  const particles = [
    { id: 1, left: '5%', delay: '0s', scale: 1.1, dur: '5.2s', fill: '#ffffff' },
    { id: 2, left: '22%', delay: '0.4s', scale: 1.4, dur: '5.0s', fill: '#fcf8f2' },
    { id: 3, left: '42%', delay: '0.2s', scale: 1.6, dur: '5.6s', fill: '#ffffff' },
    { id: 4, left: '58%', delay: '0.6s', scale: 1.3, dur: '5.3s', fill: '#faf6f0' },
    { id: 5, left: '76%', delay: '0.1s', scale: 1.5, dur: '5.8s', fill: '#ffffff' },
    { id: 6, left: '92%', delay: '0.8s', scale: 1.2, dur: '5.4s', fill: '#f7f4ee' },
  ];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden select-none">
      <style>{`
        @keyframes riseAndDissolve {
          0% {
            transform: translateY(105vh) scale(0.5) rotate(0deg);
            opacity: 0;
            filter: blur(15px);
          }
          15% {
            opacity: 0.38;
            filter: blur(25px);
          }
          45% {
            opacity: 0.28;
            filter: blur(45px);
          }
          100% {
            transform: translateY(-50vh) scale(3.2) rotate(45deg);
            opacity: 0;
            filter: blur(75px);
          }
        }
        
        .smoke-particle {
          position: absolute;
          bottom: -220px;
          pointer-events: none;
          transform-origin: center bottom;
        }
      `}</style>

      {/* Renders each fluffy culinary steam vector path */}
      {particles.map(p => (
        <svg
          key={p.id}
          className="smoke-particle"
          style={{
            left: p.left,
            animation: `riseAndDissolve ${p.dur} cubic-bezier(0.1, 0.8, 0.3, 1) ${p.delay} forwards`,
            width: `${180 * p.scale}px`,
            height: `${150 * p.scale}px`,
          }}
          viewBox="0 0 200 150"
        >
          {/* A soft, puffy cloud shape */}
          <path
            d="M 30,110 A 35,35 0 0,1 80,60 A 45,45 0 0,1 160,70 A 35,35 0 0,1 190,110 A 25,25 0 0,1 180,140 L 40,140 A 25,25 0 0,1 30,110 Z"
            fill={p.fill}
          />
        </svg>
      ))}

      {/* Warm Ambient Dissolving Overlay representing high temperature kitchen humidity */}
      <div 
        className="absolute inset-0 transition-opacity duration-[5600ms] pointer-events-none bg-gradient-to-t from-white/12 via-white/5 to-transparent z-[101]"
        style={{
          animation: 'riseAndDissolve 6.0s ease-out forwards',
        }}
      />
    </div>
  );
};

export default KitchenSmoke;
