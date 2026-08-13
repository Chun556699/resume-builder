/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // pdfjs-dist 在浏览器端引用 Node 的 canvas/fs，打包时标记为空
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      fs: false,
      path: false,
    };
    return config;
  },
};

export default nextConfig;
