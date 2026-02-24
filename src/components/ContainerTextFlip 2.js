"use client";
import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function ContainerTextFlip({
  words = ["Faster", "Smarter", "Better"],
  interval = 3000,
  className
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words.length, interval]);

  return (
    <div className={cn("inline-flex justify-center items-center ml-2", className)}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] font-bold inline-block"
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
