const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

export default async function handleRequest(req: Request & { nextUrl?: URL }) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);
  const url = new URL(pathname + search, "https://api.openai.com").href;
  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  // Retrieve OpenAI key from environment variable
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    return new Response("OpenAI API key not provided", { status: 401 });
  }
  
  // Set OpenAI key in headers
  headers.set("authorization", openaiApiKey);

  // Log the request parameters
  console.log('Request Parameters:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(headers.entries()),
  });

  const res = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

  const resHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(res.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

  return new Response(res.body, {
    headers: resHeaders,
    status: res.status
  });
}
