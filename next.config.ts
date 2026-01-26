import type { NextConfig } from "next";

const enableAnalyzer = process.env.ANALYZE === 'true';

let withBundleAnalyzer: (cfg: NextConfig) => NextConfig = (c) => c;
if (enableAnalyzer) {
  try {
    // require only when ANALYZE is enabled so builds don't fail if the package isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bundleAnalyzer = require('@next/bundle-analyzer')({ enabled: true });
    withBundleAnalyzer = bundleAnalyzer;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('@next/bundle-analyzer not installed — skipping analyzer.');
  }
}


const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // experimental: {
  //   optimizePackageImports: [
  //     'lucide-react',
  //     '@radix-ui/react-icons',
  //   ],
  // },
};

export default withBundleAnalyzer(nextConfig);
