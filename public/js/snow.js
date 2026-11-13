export function startSnowfall(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  let width = 0;
  let height = 0;
  let flakes = [];
  let previous = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(150, Math.max(55, Math.round((width * height) / 11000)));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1 + Math.random() * 2.6,
      speed: 18 + Math.random() * 42,
      drift: (Math.random() - 0.5) * 20,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.38 + Math.random() * 0.5,
    }));
  };

  const draw = (now) => {
    const delta = Math.min((now - (previous || now)) / 1000, 0.05);
    previous = now;
    ctx.clearRect(0, 0, width, height);
    for (const flake of flakes) {
      flake.y += flake.speed * delta;
      flake.x += (flake.drift + Math.sin(now / 1400 + flake.phase) * 12) * delta;
      if (flake.y > height + flake.radius) {
        flake.y = -flake.radius;
        flake.x = Math.random() * width;
      }
      if (flake.x < -8) flake.x = width + 8;
      if (flake.x > width + 8) flake.x = -8;
      ctx.globalAlpha = flake.opacity;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  };

  resize();
  window.addEventListener('resize', resize, { passive: true });
  requestAnimationFrame(draw);
}
