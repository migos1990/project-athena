/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Okta Official Brand Colors
        'okta-blue': '#3f59e4',        // Primary brand blue (Royal Blue)
        'okta-navy': '#00297A',        // Navy blue
        'okta-purple': '#6B5CE7',      // Purple accent
        'okta-teal': '#00B8A9',        // Teal (brand color)
        'okta-beige': '#cda371',       // Laser/Beige accent (brand)
        'okta-warning': '#FF9900',     // Warning orange
        'okta-red': '#E54D4D',         // Error/alert red
        'okta-success': '#00A870',     // Success green
        'okta-dark': '#191919',        // Cod Gray - primary dark (brand)
        'okta-dark-gray': '#1D1D21',   // Dark gray
        'okta-medium-gray': '#6E6E78', // Medium gray
        'okta-light-gray': '#F5F5F5',  // Light gray background
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
