"use client";

import dynamic from "next/dynamic";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import type { LucideProps } from "lucide-react";

type IconName = keyof typeof dynamicIconImports;

interface Props extends LucideProps {
  name: IconName;
}


// Create a map of dynamic components outside the render function
const DynamicIcons: Record<IconName, React.ComponentType<LucideProps>> = {} as any;
for (const name in dynamicIconImports) {
  DynamicIcons[name as IconName] = dynamic(dynamicIconImports[name as IconName], {
    ssr: false,
    // loading: () => <div className="h-6 w-6 animate-pulse rounded bg-muted" />,
  });
}

export default function DynamicLucide({ name, ...props }: Props) {
  const Icon = DynamicIcons[name];
  return Icon ? <Icon {...props} /> : null;
}