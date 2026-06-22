/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.storyblok.com' },
    ],
  },
  async redirects() {
    return [
      // The About page moved from /services to /about.
      { source: '/services', destination: '/about', permanent: true },
      // The EFM case study lives at the clean slug; redirect the older URL.
      { source: '/work/embassy-of-the-free-mind-case-study', destination: '/work/embassy-of-the-free-mind', permanent: true },
    ];
  },
};

export default nextConfig;
