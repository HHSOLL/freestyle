export const primaryNavItems = [
  { id: "closet", href: "/app/closet", label: { ko: "Closet", en: "Closet" } },
  { id: "canvas", href: "/app/canvas", label: { ko: "Canvas", en: "Canvas" } },
  { id: "community", href: "/app/community", label: { ko: "Community", en: "Community" } },
  { id: "profile", href: "/app/profile", label: { ko: "Profile", en: "Profile" } },
];

export const legacyRedirects = [
  { source: "/studio", destination: "/app/closet", permanent: false },
  { source: "/profile", destination: "/app/profile", permanent: false },
  { source: "/trends", destination: "/app/community", permanent: false },
  { source: "/examples", destination: "/app/community", permanent: false },
  { source: "/how-it-works", destination: "/app/community", permanent: false },
  { source: "/app/closet/import", destination: "/app/community", permanent: false },
  { source: "/app/looks", destination: "/app/canvas", permanent: false },
  { source: "/app/looks/new", destination: "/app/canvas", permanent: false },
  { source: "/app/looks/:id", destination: "/app/canvas", permanent: false },
  { source: "/app/journal", destination: "/app/profile", permanent: false },
  { source: "/app/journal/:entryId", destination: "/app/profile", permanent: false },
  { source: "/app/decide", destination: "/app/closet", permanent: false },
  { source: "/app/decide/item/:id", destination: "/app/closet", permanent: false },
  { source: "/app/fitting", destination: "/app/closet", permanent: false },
  { source: "/app/discover", destination: "/app/community", permanent: false },
  { source: "/app/discover/inspiration/:id", destination: "/app/community", permanent: false },
  { source: "/app/closet/item/:id", destination: "/app/closet", permanent: false },
];
