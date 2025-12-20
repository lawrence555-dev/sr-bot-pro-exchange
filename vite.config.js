import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { exec } from 'child_process'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        {
            name: 'run-scraper',
            configureServer(server) {
                server.middlewares.use((req, res, next) => {
                    if (req.url === '/api/scrape') {
                        console.log('UI triggered scrape request received...');
                        exec('node scripts/scraper.js', (error, stdout, stderr) => {
                            if (error) {
                                console.error(`Scrape execution error: ${error}`);
                                res.statusCode = 500;
                                res.end(JSON.stringify({ error: error.message }));
                                return;
                            }
                            console.log('Scrape completed successfully via UI trigger');
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ success: true }));
                        });
                    } else {
                        next();
                    }
                });
            },
        }
    ],
    server: {
        proxy: {
            '/api-bot': {
                target: 'https://rate.bot.com.tw',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api-bot/, ''),
            },
            '/api-sr': {
                target: 'https://www.superrichthailand.com',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api-sr/, ''),
                headers: {
                    'Referer': 'https://www.superrichthailand.com/',
                }
            }
        }
    }
})
