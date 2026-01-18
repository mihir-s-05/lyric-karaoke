import { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', ...defaultTheme.fontFamily.sans],
                display: ['Orbitron', 'sans-serif'],
                mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
            },
            colors: {
                neon: {
                    blue: '#00f3ff',
                    purple: '#bc13fe',
                    pink: '#ff0055',
                    green: '#0aff0a',
                },
                deep: {
                    bg: '#050511',
                    surface: '#0a0a1f',
                    card: 'rgba(15, 15, 35, 0.7)',
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'feedback': 'feedback 1s ease-out forwards',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
                },
                glow: {
                    'from': { boxShadow: '0 0 10px #00f3ff, 0 0 20px #00f3ff' },
                    'to': { boxShadow: '0 0 20px #bc13fe, 0 0 30px #bc13fe' },
                },
                slideUp: {
                    'from': { opacity: '0', transform: 'translateY(20px)' },
                    'to': { opacity: '1', transform: 'translateY(0)' },
                },
                feedback: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '15%': { opacity: '1', transform: 'translateY(0)' },
                    '70%': { opacity: '1', transform: 'translateY(0)' },
                    '100%': { opacity: '0', transform: 'translateY(-8px)' },
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'cyber-grid': 'linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px)',
            }
        },
    },
    plugins: [],
} satisfies Config;
