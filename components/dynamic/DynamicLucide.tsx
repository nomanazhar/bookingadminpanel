"use client";
import dynamic from "next/dynamic";
import React from "react";

type Props = { name: string } & React.ComponentProps<'svg'> & { className?: string };

export default function DynamicLucide({ name, ...props }: Props) {
  const Icon = dynamic(
    // load the specific named export from lucide-react
    () => import('lucide-react').then((mod: any) => mod[name]),
    { ssr: false }
  ) as any;

  return <Icon {...props} />;
}
