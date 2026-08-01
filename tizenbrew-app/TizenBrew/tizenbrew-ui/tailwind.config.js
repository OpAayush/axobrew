/** @type {import('tailwindcss').Config} */
export default {
  content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
      extend: {
        fontSize: {
          base: ['2.4vh', '2vh'],
        },
        colors: {
          ink: {
            950: '#0E0B14',
            900: '#14101D',
            800: '#1B1526',
            700: '#241C31'
          },
          brew: {
            cyan: '#0DC1E9',
            amber: '#FDCA89',
            plum: '#5C2D51'
          }
        },
        fontFamily: {
          sans: ['Outfit', 'SamsungOne', 'Tizen', 'Segoe UI', 'system-ui', 'sans-serif']
        },
        boxShadow: {
          'brew-glow': '0 0 24px rgba(13, 193, 233, 0.35)'
        }
      },
  },
  plugins: [],
}
