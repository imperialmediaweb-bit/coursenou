import confetti from 'canvas-confetti';

export function fireConfetti() {
  // Fire from both sides
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors: ['#6C47FF', '#8B6FFF', '#F0F0FF', '#FFD700'],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors: ['#6C47FF', '#8B6FFF', '#F0F0FF', '#FFD700'],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function fireCelebration() {
  // Big centered explosion
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.5 },
    colors: ['#6C47FF', '#8B6FFF', '#F0F0FF', '#FFD700', '#FF6B6B', '#4ECDC4'],
  });
}
