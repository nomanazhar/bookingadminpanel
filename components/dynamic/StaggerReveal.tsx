"use client"
import { motion, Variants } from "framer-motion";
import React from "react";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
}

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.18,
    },
  },
};

export const StaggerReveal: React.FC<StaggerRevealProps> = ({ children, className = "", stagger = 0.18 }) => {
  return (
    <motion.div
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } },
      }}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      className={className}
    >
      {children}
    </motion.div>
  );
};
