/** @type {import('next').NextConfig} */

// Supabase Storage serves public files from
// https://<project-ref>.supabase.co/storage/v1/object/public/... — derive
// the hostname from the same env var the Supabase clients already use, so
// there's nothing new to configure. Falls back to a wildcard pattern if the
// env var isn't available at build time for some reason.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHostname = supabaseUrl.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      ...(supabaseHostname
        ? [{ protocol: "https", hostname: supabaseHostname }]
        : []),
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
