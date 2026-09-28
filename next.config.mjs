/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure lucide-react is transpiled for Next.js App Router
  transpilePackages: ['lucide-react'],
};
export default nextConfig;
