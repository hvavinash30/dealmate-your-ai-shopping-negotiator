import type { Transition, Variants } from "motion/react";

export const easeOut: Transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };
export const quick: Transition = { duration: 0.25, ease: [0.16, 1, 0.3, 1] };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const messageIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: quick },
};
