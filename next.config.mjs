/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  htmlLimitedBots:
    /WhatsApp|facebookexternalhit|Facebot|Instagram|Twitterbot|LinkedInBot|TelegramBot|Slackbot|Discordbot|Applebot/i,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/**",
      },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;