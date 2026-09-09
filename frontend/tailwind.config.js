/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'primary-rust': '#C1440E',
        'navy-deep': '#1B2A4A',
        'background-cream': '#FDFBF7',
        'surface-white': '#FFFFFF',
        'status-green': '#2E7D4F',
        'status-amber': '#D98324',
        'status-gold': '#C9971F',
        'accent-pink': '#FFD1DC', // Approximate soft rose/pink
        'accent-blue': '#ADD8E6', // Approximate soft light blue
        'text-muted': '#808080', // Mid-gray
      }
    },
  },
  plugins: [],
}
