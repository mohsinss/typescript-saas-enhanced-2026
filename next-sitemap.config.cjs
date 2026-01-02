/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://shipfa.st",
  generateRobotsTxt: true,
  exclude: ["/twitter-image.*", "/opengraph-image.*", "/icon.*"],
};

