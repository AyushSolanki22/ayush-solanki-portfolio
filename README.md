# Ayush Solanki — Portfolio

A responsive, dark portfolio for **AyushSolanki22**, built with Vite and Three.js. The design includes a cinematic entrance, a pointer-reactive 3D orb on desktop, project showcases, skill groups, scroll reveals, and a mobile navigation menu.

## Run locally

1. Install Node.js 20.19+ or 22.12+.
2. In this project folder, run `npm install`.
3. Start the development server with `npm run dev` and open the local URL it prints.
4. Create a production build with `npm run build`; preview it with `npm run preview`.

## Customize

- Update the portfolio copy and project descriptions in `index.html`.
- Change colors, layout, and responsive behavior in `src/style.css`.
- Adjust the 3D object and interactions in `src/main.js`.
- Replace the GitHub contact link if you later add a preferred contact destination.

Project links, email, location details, and specific outcomes were not supplied, so the portfolio avoids implying unverified details. The only external profile link points to `github.com/AyushSolanki22`.

## Motion and fallback behavior

- The intro and animated 3D orb are skipped when the visitor prefers reduced motion.
- Smaller screens use the CSS-rendered orb instead of WebGL.
- If WebGL is unavailable, the CSS orb remains visible.
- Scroll reveals also appear immediately when `IntersectionObserver` is unavailable.

Fonts load from Google Fonts; system sans-serif and monospace fallbacks are included.
