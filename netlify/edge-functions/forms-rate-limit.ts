type NetlifyEdgeContext = {
  next: () => Promise<Response>;
};

export default async function formsRateLimit(_request: Request, context: NetlifyEdgeContext) {
  return context.next();
}

// Netlify enforces this before invoking the function, using its trusted client
// IP and the site's domain. The function itself only passes allowed requests on.
export const config = {
  path: "/api/forms",
  method: "POST",
  rateLimit: {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
