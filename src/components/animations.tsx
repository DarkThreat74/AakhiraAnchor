"use client";

import { motion, useInView } from "motion/react";
import { useRef, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Fade-in wrapper — animates children in on scroll.
 * Re-triggers every time element enters viewport (continuous).
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  y = 20,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger container — children with StaggerItem fade in sequentially.
 * Re-triggers every time element enters viewport.
 */
export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger item — use inside StaggerGroup.
 */
export function StaggerItem({
  children,
  className,
  y = 24,
  duration = 0.4,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  duration?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: EASE },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Scale-in — for focal elements like Arabic quotes.
 * Re-triggers on scroll.
 */
export function ScaleIn({
  children,
  delay = 0,
  duration = 0.5,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.97 }}
      transition={{ duration, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Ambient fade — for Arabic background text that's already very faint.
 * Does NOT start at opacity 0 (which would make faint text invisible).
 * Instead, starts at the element's natural opacity and adds a subtle
 * blur-to-sharp + slight scale effect.
 */
export function AmbientFade({
  children,
  delay = 0,
  duration = 0.8,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-40px" });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ filter: "blur(8px)", scale: 1.02 }}
      animate={
        inView
          ? { filter: "blur(0px)", scale: 1 }
          : { filter: "blur(8px)", scale: 1.02 }
      }
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
