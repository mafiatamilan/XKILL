export const colors = {
  brand: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
} as const

export const tokens = {
  colors,
  spacing: {
    page: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8",
    section: "py-8 sm:py-12",
  },
  animation: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
  },
} as const
