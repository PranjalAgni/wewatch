import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Enable SWC minifier for better performance
  swcMinify: true,
  
  // Ensure client-side rendering for all pages
  // This configuration forces CSR by disabling static optimization
};

export default nextConfig;
