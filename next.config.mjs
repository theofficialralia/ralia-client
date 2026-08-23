/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:6100';

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Proxy the API through the Next origin so the browser talks same-origin
    // (no CORS) in dev. In prod, point API_ORIGIN at the deployed API, or drop
    // these rewrites and set NEXT_PUBLIC_API_BASE to the API URL directly.
    return [
      { source: '/v1/:path*', destination: `${API_ORIGIN}/v1/:path*` },
      { source: '/r/:path*', destination: `${API_ORIGIN}/r/:path*` },
    ];
  },
};

export default nextConfig;
