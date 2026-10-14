type NetlifyEdgeContext = {
  next: () => Promise<Response>;
};

export default async function echoGuideRateLimit(_request: Request, context: NetlifyEdgeContext) {
  return context.next();
}

// Netlify applies this using its trusted client IP and the site domain before
// the Next.js App Router endpoint is invoked. No forwarding header is read here.
export const config = {
  path: ['/api/echo-guide', '/api/echo-guide/*'],
  method: 'POST',
  rateLimit: {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
};
