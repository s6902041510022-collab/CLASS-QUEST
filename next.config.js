/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ใช้โฟลเดอร์แยกได้ เช่น NEXT_DIST_DIR=.next-check
  // (สำคัญ: ถ้า build ทับ .next ของ dev server ที่กำลังรันอยู่ หน้าเว็บจะพัง 500)
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    domains: ['localhost'],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizePackageImports: ['@/components'],
  },
};

module.exports = nextConfig;
