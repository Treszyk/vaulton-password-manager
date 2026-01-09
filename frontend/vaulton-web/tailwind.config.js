/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        vault: {
          black: '#0a0a0a',
          dark: '#141414',
          grey: {
            DEFAULT: '#262626',
            light: '#404040',
            lighter: '#737373',
          },
          purple: {
            DEFAULT: '#7c3aed',
            glow: '#9333ea',
            dark: '#581c87',
            bright: '#985eff',
          },
        },
      },
      backgroundImage: {
        'glass-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)',
      },
    },
  },
  plugins: [],
};
