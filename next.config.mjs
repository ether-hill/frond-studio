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
      // The thin EFM project was retired for the editorial case study.
      { source: '/work/embassy-of-the-free-mind', destination: '/work/embassy-of-the-free-mind-case-study', permanent: true },
    ];
  },
};

export default nextConfig;
