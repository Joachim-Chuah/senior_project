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
                sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
                mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
            },
            colors: {
                cream: {
                    DEFAULT: '#FAF0CA',
                    dark:    '#F2E4A8',
                },
                navy: {
                    DEFAULT: '#0D3B66',
                    light:   '#1A5491',
                    dark:    '#082848',
                },
            },
            boxShadow: {
                card:       '0 1px 3px 0 rgb(0 0 0 / 0.06)',
                'card-lg':  '0 8px 32px 0 rgb(0 0 0 / 0.12)',
            },
            keyframes: {
                fadeSlideIn: {
                    '0%':   { opacity: '0', transform: 'translateY(12px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                shimmer: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
            },
            animation: {
                'fade-slide-in': 'fadeSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in':       'fadeIn 0.2s ease forwards',
                shimmer:         'shimmer 1.8s infinite linear',
            },
        },
    },
    plugins: [],
}
