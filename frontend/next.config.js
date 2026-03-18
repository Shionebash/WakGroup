/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    turbopack: {
        root: path.join(__dirname),
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'cdn.discordapp.com',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '4000',
            },
            {
                protocol: 'https',
                hostname: '*.onrender.com',
            }
        ],
        unoptimized: process.env.NODE_ENV === 'development',
    },
};

module.exports = nextConfig;
