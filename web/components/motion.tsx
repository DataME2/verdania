"use client";

import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Fade-and-rise once when scrolled into view. Static for reduced-motion users. */
export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to a real value from the database. Never animates a number that wasn't supplied:
 * `value === null` renders an em dash.
 */
export function Counter({ value, format }: { value: number | null; format: "int" | "pct" | "money" }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (value === null || !inView || reduce) return;
    const controls = animate(0, value, { duration: 0.9, ease: "easeOut", onUpdate: setShown });
    return () => controls.stop();
  }, [value, inView, reduce]);

  const text = value === null ? "—" : fmt(reduce ? value : inView ? shown : 0, format);
  return (
    <span ref={ref} className="tabular-nums">
      {/* screen readers get the final value, not the animation */}
      <span aria-hidden="true">{text}</span>
      <span className="sr-only">{value === null ? "not available" : fmt(value, format)}</span>
    </span>
  );
}

function fmt(v: number, format: "int" | "pct" | "money") {
  if (format === "pct") return `${(v * 100).toFixed(1)}%`;
  if (format === "money") return `V$ ${Math.round(v).toLocaleString("en")}`;
  return Math.round(v).toLocaleString("en");
}
