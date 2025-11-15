// app.js - small UI animation and niceties for landing page
document.addEventListener('DOMContentLoaded', () => {
  const anim = document.querySelector('.neon-animation');
  if (!anim) return;
  let hue = 180;
  setInterval(() => {
    hue = (hue + 3) % 360;
    // subtle dynamic shadow
    anim.style.boxShadow = `0 8px 60px rgba(${Math.floor(120 + 60*Math.abs(Math.sin(hue/40)))},${Math.floor(170 + 60*Math.abs(Math.cos(hue/40)))},255,0.04) inset`;
  }, 140);
});
