
import { useState, useEffect, useRef } from "react";

export default function CountUp({ end = 0, duration = 1500, className }) {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (end <= 0) { setCount(0); return; }
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
      else setCount(end);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [end, duration]);

  return <span className={className}>{count.toLocaleString("de-DE")}</span>;
}


