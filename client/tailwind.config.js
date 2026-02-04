/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'okta-blue': '#0066CC',
        'okta-purple': '#6B5CE7',
        'okta-warning': '#FF9900',
        'okta-red': '#E54D4D',
        'okta-teal': '#00B8A9',
        'okta-success': '#00A870',
        'okta-dark-gray': '#1D1D21',
        'okta-medium-gray': '#6E6E78',
        'okta-light-gray': '#F5F5F5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
