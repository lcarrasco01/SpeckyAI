import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root (parent of apps/web) for Turbopack workspace resolution */
const turbopackRoot = path.resolve(__dirname, "..", "..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@speckyai/ui", "@speckyai/shared", "@speckyai/api-client"],
  turbopack: {
    root: turbopackRoot,
  },
};

export default nextConfig;
