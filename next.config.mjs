/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 独立构建产物：便于 Docker / 传统云服务器自托管（Node 直接跑）
  output: "standalone",
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
