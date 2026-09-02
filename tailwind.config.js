/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#14213D',
          light: '#1F2E52',
          dark: '#0C1730',
        },
        paper: {
          DEFAULT: '#F7F3E9',
          dim: '#EDE7D6',
        },
        rule: '#C9C2B0',
        credit: {
          DEFAULT: '#2F6F4E',
          light: '#DCEBE1',
        },
        debit: {
          DEFAULT: '#A63D40',
          light: '#F3E1DE',
        },
        brass: {
          DEFAULT: '#C79A3E',
          light: '#F3E6C4',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
