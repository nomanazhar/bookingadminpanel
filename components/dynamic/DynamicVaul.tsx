"use client";
import dynamic from "next/dynamic";
import React from "react";

// Load `vaul` only on the client and return a small wrapper component.
// `vaul` may export hooks/utilities rather than a React component, so we
// wrap it to avoid the dynamic loader type mismatch.
const Vaul = dynamic(
  async () => {
    const mod = await import('vaul');

    const VaulWrapper: React.FC<any> = ({ children, ...rest }) => {
      // Keep a reference to the loaded module if callers need it later.
      // We don't attempt to render any specific Vaul component here because
      // the library surface varies; this wrapper lets you mount client-only
      // Vaul logic and still render children.
      const [loaded] = React.useState(mod);
      React.useEffect(() => {
        // no-op: placeholder for any client-only initialization using `loaded`
      }, [loaded]);

      return <div {...rest}>{children}</div>;
    };

    return VaulWrapper;
  },
  { ssr: false }
) as any;

export default function DynamicVaul(props: any) {
  const Comp = Vaul;
  return <Comp {...props} />;
}
