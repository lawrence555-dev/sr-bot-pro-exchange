/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'app-bg': '#0B101B',
                'card-bg': '#161C2C',
                'text-main': '#FFFFFF',
                'text-dim': '#94A3B8',
                'accent-green': '#10B981',
                'accent-blue': '#3B82F6',
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', 'Noto Sans TC', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
