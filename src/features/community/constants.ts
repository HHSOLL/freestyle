import type { CommunityPost } from './types';

export const COMMUNITY_POSTS: CommunityPost[] = [
  { id: 1, user: '@cypher_vibe', image: '/trend-ojos.png', likes: '2.8k', comments: '124', tagKeys: ['community.tags.cyber', 'community.tags.tech'] },
  { id: 2, user: '@atelier.seoul', image: '/trend-notknowing.png', likes: '1.4k', comments: '56', tagKeys: ['community.tags.vintage', 'community.tags.minimal'] },
  { id: 3, user: '@neo_classic', image: '/trend-newalrin.png', likes: '3.2k', comments: '210', tagKeys: ['community.tags.tailoring', 'community.tags.neo'] },
  { id: 4, user: '@gorp_master', image: '/trend-painpleasure.png', likes: '980', comments: '42', tagKeys: ['community.tags.utility', 'community.tags.outdoor'] },
  { id: 5, user: '@visual_intelligence', image: '/trend-deinet.png', likes: '4.5k', comments: '312', tagKeys: ['community.tags.abstract', 'community.tags.ethereal'] },
  { id: 6, user: '@black_label', image: '/black-puffer.jpg', likes: '2.1k', comments: '89', tagKeys: ['community.tags.monochrome', 'community.tags.avant'] },
  { id: 7, user: '@mira_archive', image: '/cody3.jpg', likes: '1.7k', comments: '64', tagKeys: ['community.tags.layering', 'community.tags.urban'] },
  { id: 8, user: '@style_mix_beta', image: '/cody4.jpg', likes: '5.6k', comments: '420', tagKeys: ['community.tags.core', 'community.tags.future'] },
  { id: 9, user: '@darlings_bad', image: '/cody5.jpg', likes: '2.4k', comments: '115', tagKeys: ['community.tags.graphic', 'community.tags.street'] },
];

export const COMMUNITY_FILTER_KEYS = [
  'community.filters.trending',
  'community.filters.following',
  'community.filters.atelier',
  'community.filters.subculture',
];
