import type { Transition, Variants } from "framer-motion";

export const ease = [0.22, 1, 0.36, 1] as const;
export const spring: Transition = { type: "spring", stiffness: 380, damping: 32 };

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease } },
};

export const stagger: Variants = {
  initial: {},
  enter: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 14 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.4, ease } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  enter: { opacity: 1, scale: 1, transition: { duration: 0.3, ease } },
};
