import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore
  allowedDevOrigins: ['**.*', '192.168.1.2'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NEXT_PUBLIC_API_BASE_URL 
          ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/:path*`
          : 'http://localhost:3001/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ];
  },
};

export default nextConfig;
