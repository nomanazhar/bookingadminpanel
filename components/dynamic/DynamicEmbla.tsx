"use client";
import dynamic from "next/dynamic";
import React from "react";

type EmblaWrapperProps = React.PropsWithChildren<{
  className?: string;
  style?: React.CSSProperties;
  [key: string]: unknown;
}>;

const Embla = dynamic<EmblaWrapperProps>(
  async () => {
    const useEmblaCarousel = (await import('embla-carousel-react')).default;

    const EmblaWrapper: React.FC<EmblaWrapperProps> = ({ children, className, style, ...rest }) => {
      const [viewportRef] = useEmblaCarousel();
      return (
        <div className={className} style={style} {...rest} ref={viewportRef}>
          {children}
        </div>
      );
    };

    return EmblaWrapper;
  },
  { ssr: false }
);

export default function DynamicEmbla(props: EmblaWrapperProps) {
  const Comp = Embla;
  return <Comp {...props} />;
}
