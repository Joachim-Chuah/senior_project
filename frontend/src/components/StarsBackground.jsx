import * as React from 'react';
import { motion, useMotionValue, useSpring } from 'motion/react';

function generateStars(count, starColor) {
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 4000) - 2000;
    const y = Math.floor(Math.random() * 4000) - 2000;
    shadows.push(`${x}px ${y}px ${starColor}`);
  }
  return shadows.join(', ');
}

function StarLayer({ count = 1000, size = 1, transition, starColor = '#fff' }) {
  const [boxShadow, setBoxShadow] = React.useState('');

  React.useEffect(() => {
    setBoxShadow(generateStars(count, starColor));
  }, [count, starColor]);

  return (
    <motion.div
      animate={{ y: [0, -2000] }}
      transition={transition}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2000px' }}
    >
      <div style={{ position: 'absolute', width: `${size}px`, height: `${size}px`, borderRadius: '50%', boxShadow }} />
      <div style={{ position: 'absolute', top: '2000px', width: `${size}px`, height: `${size}px`, borderRadius: '50%', boxShadow }} />
    </motion.div>
  );
}

export function StarsBackground({
  children,
  className = '',
  factor = 0.05,
  speed = 50,
  springTransition = { stiffness: 50, damping: 20 },
  starColor = '#fff',
  ...props
}) {
  const offsetX = useMotionValue(1);
  const offsetY = useMotionValue(1);
  const springX = useSpring(offsetX, springTransition);
  const springY = useSpring(offsetY, springTransition);

  const handleMouseMove = React.useCallback((e) => {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    offsetX.set(-(e.clientX - centerX) * factor);
    offsetY.set(-(e.clientY - centerY) * factor);
  }, [offsetX, offsetY, factor]);

  return (
    <div
      className={`relative size-full overflow-hidden ${className}`}
      style={{ background: 'radial-gradient(ellipse at bottom, #1a1a2e 0%, #000 100%)' }}
      onMouseMove={handleMouseMove}
      {...props}
    >
      <motion.div style={{ x: springX, y: springY }}>
        <StarLayer count={1000} size={1} transition={{ repeat: Infinity, duration: speed, ease: 'linear' }} starColor={starColor} />
        <StarLayer count={400}  size={2} transition={{ repeat: Infinity, duration: speed * 2, ease: 'linear' }} starColor={starColor} />
        <StarLayer count={200}  size={3} transition={{ repeat: Infinity, duration: speed * 3, ease: 'linear' }} starColor={starColor} />
      </motion.div>
      {children}
    </div>
  );
}
