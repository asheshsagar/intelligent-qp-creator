// src/components/NetworkGridBackground.tsx

import React, { useEffect, useRef } from 'react';

const NetworkGridBackground = ({ children, className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: any[] = [];
    let connections: any[] = [];
    
    // Resize handler to make canvas full screen and high resolution
    const handleResize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      
      // Set canvas to cover the entire document height, not just viewport
      canvas.width = window.innerWidth * pixelRatio;
      canvas.height = Math.max(
        document.documentElement.scrollHeight, 
        document.body.scrollHeight, 
        window.innerHeight
      ) * pixelRatio;
      
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${Math.max(
        document.documentElement.scrollHeight, 
        document.body.scrollHeight, 
        window.innerHeight
      )}px`;
      
      ctx.scale(pixelRatio, pixelRatio);
      
      // Regenerate particles
      initParticles();
    };

    // Initialize particles
    const initParticles = () => {
      particles = [];
      connections = [];
      
      // Create particles
      const particleCount = Math.min(Math.max(Math.floor(window.innerWidth * 0.05), 20), 100);
      
      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * Math.max(
          document.documentElement.scrollHeight, 
          document.body.scrollHeight, 
          window.innerHeight
        );
        const size = Math.random() * 3 + 1;
        const speedX = (Math.random() - 0.5) * 0.5;
        const speedY = (Math.random() - 0.5) * 0.5;
        const brightness = Math.random() * 0.5 + 0.3;
        
        particles.push({ x, y, size, speedX, speedY, brightness });
      }
      
      // Create some fixed, larger node particles
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * Math.max(
          document.documentElement.scrollHeight, 
          document.body.scrollHeight, 
          window.innerHeight
        );
        const size = Math.random() * 8 + 4;
        const speedX = (Math.random() - 0.5) * 0.2;
        const speedY = (Math.random() - 0.5) * 0.2;
        const brightness = Math.random() * 0.3 + 0.7;
        
        particles.push({ x, y, size, speedX, speedY, brightness, isNode: true });
      }
      
      // Create connections between particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          if (Math.random() > 0.97 || (particles[i].isNode && particles[j].isNode)) {
            connections.push([i, j]);
          }
        }
      }
      
      // Create grid lines across the entire document height
      const gridSize = 30;
      const gridOffsetX = window.innerWidth % gridSize / 2;
      const gridOffsetY = Math.max(
        document.documentElement.scrollHeight, 
        document.body.scrollHeight, 
        window.innerHeight
      ) % gridSize / 2;
      
      for (let x = gridOffsetX; x < window.innerWidth; x += gridSize) {
        const brightness = Math.random() * 0.2 + 0.05;
        connections.push({ type: 'gridX', x, brightness });
      }
      
      for (let y = gridOffsetY; y < Math.max(
        document.documentElement.scrollHeight, 
        document.body.scrollHeight, 
        window.innerHeight
      ); y += gridSize) {
        const brightness = Math.random() * 0.2 + 0.05;
        connections.push({ type: 'gridY', y, brightness });
      }
    };

    // Animation function
    const animate = () => {
      // Clear the entire canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw the background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#000922');
      gradient.addColorStop(1, '#000215');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid lines
      connections.forEach(connection => {
        if (connection.type === 'gridX') {
          ctx.beginPath();
          ctx.moveTo(connection.x, 0);
          ctx.lineTo(connection.x, canvas.height);
          ctx.strokeStyle = `rgba(0, 149, 255, ${connection.brightness})`;
          ctx.lineWidth = 0.3;
          ctx.stroke();
        } else if (connection.type === 'gridY') {
          ctx.beginPath();
          ctx.moveTo(0, connection.y);
          ctx.lineTo(canvas.width, connection.y);
          ctx.strokeStyle = `rgba(0, 149, 255, ${connection.brightness})`;
          ctx.lineWidth = 0.3;
          ctx.stroke();
        }
      });
      
      // Update and draw particles
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        
        // Wrap around screen edges
        const maxHeight = Math.max(
          document.documentElement.scrollHeight, 
          document.body.scrollHeight, 
          window.innerHeight
        );
        
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = maxHeight;
        if (particle.y > maxHeight) particle.y = 0;
        
        // Draw particle
        ctx.beginPath();
        const glow = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        
        if (particle.isNode) {
          glow.addColorStop(0, `rgba(0, 255, 255, ${particle.brightness})`);
          glow.addColorStop(0.5, `rgba(0, 180, 255, ${particle.brightness * 0.5})`);
          glow.addColorStop(1, 'rgba(0, 0, 100, 0)');
          ctx.shadowBlur = 15;
          ctx.shadowColor = 'rgba(0, 200, 255, 0.5)';
        } else {
          glow.addColorStop(0, `rgba(0, 200, 255, ${particle.brightness})`);
          glow.addColorStop(1, 'rgba(0, 50, 100, 0)');
        }
        
        ctx.fillStyle = glow;
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      
      // Draw connections between particles
      connections.forEach(connection => {
        if (Array.isArray(connection)) {
          const [i, j] = connection;
          const p1 = particles[i];
          const p2 = particles[j];
          
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only draw connections if particles are close enough
          if (distance < 200) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            const brightness = Math.min(
              (p1.brightness + p2.brightness) / 2,
              1.0 - distance / 200
            );
            
            if (p1.isNode && p2.isNode) {
              ctx.strokeStyle = `rgba(0, 225, 255, ${brightness * 0.8})`;
              ctx.lineWidth = 1.2;
            } else {
              ctx.strokeStyle = `rgba(0, 180, 255, ${brightness * 0.3})`;
              ctx.lineWidth = 0.6;
            }
            
            ctx.stroke();
          }
        }
      });
      
      animationFrameId = window.requestAnimationFrame(animate);
    };

    // Set up event listeners and start animation
    window.addEventListener('resize', handleResize);
    handleResize();
    animate();

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={`relative min-h-screen w-full ${className}`}>
      <canvas 
        ref={canvasRef} 
        className="fixed top-0 left-0 w-full h-full" 
        style={{ 
          zIndex: -1, 
          pointerEvents: 'none' 
        }}
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

export default NetworkGridBackground;