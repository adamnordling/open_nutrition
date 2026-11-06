// vite.config.ts
import { defineConfig, type Plugin } from 'vite';
import { minify } from 'html-minifier-terser';
import type { IncomingMessage, ServerResponse } from 'node:http';

function groceryProxyPlugin(): Plugin {
    const handleProxy = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
        const rawUrl = req.url?.startsWith('/') ? `http://127.0.0.1${req.url}` : `http://127.0.0.1/${req.url ?? ''}`;
        const urlParams = new URL(rawUrl);
        const targetUrl = urlParams.searchParams.get('url');

        if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing ?url parameter' }));
            return;
        }

        try {
            const response = await fetch(targetUrl, {
                method: 'GET',
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept':
                        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                    'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-User': '?1',
                    'Upgrade-Insecure-Requests': '1'
                }
            });

            const bodyText = await response.text();

            if (!response.ok) {
                res.statusCode = response.status;
                res.setHeader('Content-Type', 'application/json');
                res.end(
                    JSON.stringify({
                        error: `Store responded with status ${response.status}`,
                        status: response.status,
                        isBlocked: response.status === 403 || response.status === 429
                    })
                );
                return;
            }

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.statusCode = 200;
            res.end(bodyText);
        } catch (err: unknown) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            const message = err instanceof Error ? err.message : String(err);
            res.end(JSON.stringify({ error: 'Failed to reach store', details: message }));
        }
    };

    return {
        name: 'grocery-cors-proxy',
        configureServer(server) {
            server.middlewares.use('/api/proxy-scrape', (req, res) => {
                void handleProxy(req, res);
            });
        },
        configurePreviewServer(server) {
            server.middlewares.use('/api/proxy-scrape', (req, res) => {
                void handleProxy(req, res);
            });
        }
    };
}

function inlineAndMinifyHtml(): Plugin {
    return {
        name: 'inline-and-minify-html',
        apply: 'build',
        enforce: 'post',
        async transformIndexHtml(html, ctx) {
            if (!ctx.bundle) return html;
            let inlinedHtml = html;

            for (const [fileName, asset] of Object.entries(ctx.bundle)) {
                if (fileName.endsWith('.css') && asset.type === 'asset') {
                    const cssContent = typeof asset.source === 'string' ? asset.source : asset.source.toString();

                    inlinedHtml = inlinedHtml.replace(
                        new RegExp(`<link[^>]*href="[^"]*${fileName}"[^>]*>`, 'i'),
                        `<style>${cssContent}</style>`
                    );

                    delete ctx.bundle[fileName];
                }
            }

            return await minify(inlinedHtml, {
                collapseWhitespace: true,
                removeComments: true,
                removeRedundantAttributes: true,
                useShortDoctype: true,
                minifyCSS: true
            });
        }
    };
}

export default defineConfig({
    base: './',
    root: './',
    publicDir: 'public',
    plugins: [groceryProxyPlugin(), inlineAndMinifyHtml()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        target: 'es2022',
        cssCodeSplit: false
    }
});