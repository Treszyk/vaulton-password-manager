const withOpacity = (variableName) => {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `color-mix(in srgb, var(${variableName}), transparent calc(100% - ${opacityValue} * 100%))`;
    }
    return `var(${variableName})`;
  };
};

module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        vault: {
          black: withOpacity('--v-black'),
          dark: withOpacity('--v-dark'),
          grey: {
            DEFAULT: withOpacity('--v-grey'),
            light: withOpacity('--v-grey-light'),
            lighter: withOpacity('--v-grey-lighter'),
          },
          purple: {
            DEFAULT: withOpacity('--v-purple'),
            bright: withOpacity('--v-purple-bright'),
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
