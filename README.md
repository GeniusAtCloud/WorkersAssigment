# Cloudflare Worker for Static Assets and Dynamic Content

This Cloudflare Worker script serves static assets from Cloudflare KV storage and provides additional functionalities such as handling secure routes, fetching user information, and serving country flags.

## Features

- **Serve Static Assets:** Uses Cloudflare KV storage to serve static assets.
- **Secure Routes:** Handles routes that start with `/secure` to fetch user information or country flags.
- **Security Headers:** Adds security headers to responses.
- **Error Handling:** Includes robust error handling and serves custom 404 pages when needed.

## Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/WorkersAssigment.git
   cd WorkersAssigment

2. **Install Dependencies**
   
   ```bash
   npm install

4. **Deploy the Worker**
   Configure your wrangler.toml file and deploy the worker:

   ```bash
   wrangler publish

**Import Dependencies**
The script imports functions from the @cloudflare/kv-asset-handler package to manage serving static assets from Cloudflare KV storage.

```javascript
import { getAssetFromKV, mapRequestToAsset } from "@cloudflare/kv-asset-handler";

**Event Listener for Fetch Events**
An event listener is set up to listen for fetch events. When a fetch event occurs, it calls the handleEvent function.

```javascript
addEventListener("fetch", (event) => {
  event.respondWith(handleEvent(event));
});

**Handling Events**
The handleEvent function processes incoming requests, serves static assets, handles secure routes, and sets security headers.

```javascript
const DEBUG = false;

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

**Fetch User Information**
This function fetches user information from the request headers and returns an HTML response displaying the user's email, authentication time, and country flag.

```javascript
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

**Fetch Country Flag**
This function attempts to fetch a country's flag image based on the provided country code and returns the image. If the flag is not found or an error occurs, appropriate error messages are returned.

```javascript
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

**Security Headers**
The worker adds the following security headers to the responses:

X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: unsafe-url
Feature-Policy: none

**Error Handling**
If an error occurs while serving a request, the worker attempts to serve a custom 404 page. If that also fails, it returns a 500 response with the error message.

**License**
This project is licensed under the MIT License.
