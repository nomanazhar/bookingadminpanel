"use client";
import dynamic from "next/dynamic";
import React from "react";

const Embla = dynamic(
  // Return a small React wrapper component that uses the embla hook
  async () => {
    const mod = await import('embla-carousel-react');
    const useEmbla = (mod as any).useEmblaCarousel as any;

    const EmblaWrapper: React.FC<any> = ({ children, className, style, ...rest }) => {
      const [viewportRef] = useEmbla();
      return (
        <div className={className} style={style} {...rest} ref={viewportRef}>
          {children}
        </div>
      );
    };

    return EmblaWrapper;
  },
  { ssr: false }
) as any;

export default function DynamicEmbla(props: any) {
  const Comp = Embla;
  return <Comp {...props} />;
}
