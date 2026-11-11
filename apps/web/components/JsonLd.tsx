import {
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
  SITE_TITLE,
  SITE_URL,
} from '../lib/site';

/** WebApplication + SoftwareApplication JSON-LD for the companion + SDK. */
export default function JsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Amoji',
        alternateName: SITE_TITLE,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: 'EntertainmentApplication',
        operatingSystem: 'Web, iOS, Android',
        browserRequirements: 'Requires JavaScript. Works best in Safari / Chrome.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
          description: 'Free companion with optional Plus plan when payments are configured.',
        },
        image: SITE_OG_IMAGE,
        inLanguage: ['en', 'zh-HK', 'zh-CN', 'ja'],
      },
      {
        '@type': 'SoftwareApplication',
        name: '@amoji/robot-face',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Cross-platform',
        description:
          'Plug-and-use emotion face SDK for humanoid robots — monitor canvas or LED matrix (Unitree-style).',
        url: `${SITE_URL}/robot-demo`,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Static JSON from site constants — no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
