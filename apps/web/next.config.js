/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@xkill/design-system"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
    useWasmBinary: true,
  },
}

module.exports = nextConfig
