import { Helmet } from 'react-helmet';

export function Head() {
  const siteTitle = 'The Poradas Wedding - Celebrating Austin & Jordyn';
  const siteDescription =
    'Join us in celebrating the wedding of Austin and Jordyn Poradas. View wedding videos, photos, family tree, and share your well-wishes.';
  const siteUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://theporadas.site';
  const ogImage = `${siteUrl}/assets/public/media/photos/engagement/PoradaProposal-4.webp`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Austin & Jordyn Poradas Wedding',
    description: 'Celebrating the wedding of Austin and Jordyn Poradas in sage & blush theme',
    startDate: '2024-10-01T16:00:00-04:00', // Placeholder date
    endDate: '2024-10-01T23:00:00-04:00', // Placeholder date
    location: {
      '@type': 'Place',
      name: 'Wedding Venue', // Placeholder
      address: {
        '@type': 'PostalAddress',
        streetAddress: '123 Wedding Lane', // Placeholder
        addressLocality: 'City',
        addressRegion: 'State',
        postalCode: '12345',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'Person',
      name: 'Austin & Jordyn Poradas',
    },
    image: ogImage,
    url: siteUrl,
  };

  return (
    <Helmet>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />

      {/* Open Graph */}
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="The Poradas Wedding" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
