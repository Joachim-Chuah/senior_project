/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
                serif: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
                mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
            },
            colors: {
                cream: '#f5f0e8',
            },
            boxShadow: {
                card: '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
            },
        },
    },
    plugins: [],
}
