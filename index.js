import {
  getAssetFromKV,
  mapRequestToAsset,
} from "@cloudflare/kv-asset-handler";

const DEBUG = false;

addEventListener("fetch", (event) => {
  event.respondWith(handleEvent(event));
});

async function handleEvent(event) {
  const url = new URL(event.request.url);
  const pathname = url.pathname;

  if (pathname.startsWith("/secure")) {
    if (pathname === "/secure" || pathname === "/secure/") {
      return fetchUserInfo(event.request);
    } else {
      const country = pathname.split("/secure/")[1];
      return fetchFlag(country);
    }
  }

  let options = {};

  try {
    if (DEBUG) {
      options.cacheControl = {
        bypassCache: true,
      };
    }

    const page = await getAssetFromKV(event, options);

    const response = new Response(page.body, page);
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "unsafe-url");
    response.headers.set("Feature-Policy", "none");

    return response;
    } catch (e) {
    if (!DEBUG) {
      try {
        let notFoundResponse = await getAssetFromKV(event, {
          mapRequestToAsset: (req) =>
            new Request(`${new URL(req.url).origin}/404.html`, req),
        });

        return new Response(notFoundResponse.body, {
          ...notFoundResponse,
          status: 404,
        });
      } catch (e) {}
    }

    return new Response(e.message || e.toString(), { status: 500 });
  }
}

async function fetchUserInfo(request) {
  const email = request.headers.get('cf-access-authenticated-user-email');
  const country = request.cf.country;
  const timestamp = new Date().toISOString();

  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
          }
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .flag {
            margin-top: 20px;
            width: 50px;
            height: 50px;
            }
        </style>
      </head>
      <body>
        <div class="container">
          <div>
            <img src="https://wisecloud.stream/wp-content/uploads/2024/05/cloudflare_icon_146206.png" alt="Logo" width="120" height="120">
          </div>
          <div>
            <p>...And we don't just meet expectations, we exceed them.</p>
            <p><a href="/">Home</a></p>
          </div>
          <div>
            <p>${email} authenticated at ${timestamp} from</p>
            <img src="https://pub-a0f085f9f9a74647b5b726dd329ccbdd.r2.dev/${country.toLowerCase()}.png" alt="Flag" class="flag">
          </div>
        </div>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function fetchFlag(country) {
  const flagUrl = `https://pub-a0f085f9f9a74647b5b726dd329ccbdd.r2.dev/${country.toLowerCase()}.png`;

  try {
    const response = await fetch(flagUrl);
    if (response.status === 200) {
      return new Response(response.body, {
        headers: { 'Content-Type': 'image/png' },
      });
    } else {
      return new Response('Flag not found', { status: 404 });
    }
  } catch (e) {
    return new Response('Error fetching flag', { status: 500 });
  }
}