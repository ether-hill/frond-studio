/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'a.storyblok.com' },
    ],
  },
  async redirects() {
    // The About page moved from /services to /about.
    return [{ source: '/services', destination: '/about', permanent: true }];
  },
};

export default nextConfig;
