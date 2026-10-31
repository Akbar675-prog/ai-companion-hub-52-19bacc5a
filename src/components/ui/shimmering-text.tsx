"use client";

import { motion } from "motion/react";

export function ShimmeringText({ text, className }: { text: string; className?: string }) {
  return (
    <motion.span
      className={`inline-block bg-[linear-gradient(110deg,#8a8a8a,35%,#111,50%,#8a8a8a,75%,#8a8a8a)] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent dark:bg-[linear-gradient(110deg,#404040,35%,#fff,50%,#404040,75%,#404040)] ${className ?? ""}`}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}
