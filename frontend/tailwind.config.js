/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      // Sin tope, en un monitor ancho las secciones se estiran y el contenido
      // queda flotando. El panel usa este container; el sitio público usa
      // `.container-site` (ver index.css), que además ajusta el padding.
      screens: { '2xl': '1400px' },
    },
    extend: {
      // Los colores se definen como variables CSS (ver src/index.css) al estilo
      // shadcn/ui. Esto permite theming y modo oscuro sin tocar los componentes.
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
        },
        // Acento cálido para lo comercial (ofertas, envíos) y tono profundo de
        // marca para franjas y pie. Ver la explicación en index.css.
        brand: {
          accent: 'hsl(var(--brand-accent))',
          'accent-foreground': 'hsl(var(--brand-accent-foreground))',
          deep: 'hsl(var(--brand-deep))',
          'deep-foreground': 'hsl(var(--brand-deep-foreground))',
        },
      },
      // Sombras suaves y de poco contraste: las de Tailwind por defecto son
      // demasiado duras para tarjetas claras sobre fondo claro.
      boxShadow: {
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        card: '0 2px 4px -2px rgb(16 24 40 / 0.06), 0 4px 12px -2px rgb(16 24 40 / 0.08)',
        elevada: '0 8px 24px -6px rgb(16 24 40 / 0.12), 0 2px 6px -2px rgb(16 24 40 / 0.06)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'zoom-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-in-derecha': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'subir-suave': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.15s ease-out',
        'zoom-in': 'zoom-in 0.15s ease-out',
        'slide-in-right': 'slide-in-right 0.2s ease-out',
        // El panel del carrito entra desde el borde derecho, que es de donde
        // viene: entrar desde la izquierda contradecía su posición.
        'slide-in-derecha': 'slide-in-derecha 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        'subir-suave': 'subir-suave 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
