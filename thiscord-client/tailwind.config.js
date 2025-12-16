/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          'bg-primary': '#313338',
          'bg-secondary': '#2b2d31',
          'bg-tertiary': '#1e1f22',
          'bg-modifier-hover': '#35373c',
          'bg-modifier-active': '#404249',
          'channel-default': '#80848e',
          'channel-hover': '#dbdee1',
          'text-normal': '#dbdee1',
          'text-muted': '#949ba4',
          'text-link': '#00a8fc',
          'interactive-normal': '#b5bac1',
          'interactive-hover': '#dbdee1',
          'interactive-active': '#ffffff',
          'blurple': '#5865f2',
          'blurple-hover': '#4752c4',
          'green': '#23a559',
          'red': '#da373c',
          'yellow': '#f0b232',
        }
      }
    },
  },
  plugins: [],
}
