/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    'themes/**/*.hbs',
    'admin/**/*.hbs',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        heading: 'var(--font-heading, Inter), sans-serif',
      },
    },
  },
  plugins: [],
};
