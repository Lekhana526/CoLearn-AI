const tailwindConfig = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "error": "#ffb4ab",
                "surface": "#0b1326",
                "inverse-primary": "#005ac2",
                "surface-dim": "#0b1326",
                "outline": "#8c909f",
                "on-tertiary-fixed-variant": "#723600",
                "outline-variant": "#424754",
                "on-secondary-fixed-variant": "#304671",
                "primary-fixed-dim": "#adc6ff",
                "secondary-container": "#304671",
                "on-primary-container": "#00285d",
                "on-secondary": "#182f59",
                "error-container": "#93000a",
                "secondary-fixed-dim": "#b1c6f9",
                "on-primary": "#002e6a",
                "on-surface": "#dae2fd",
                "tertiary": "#ffb786",
                "on-tertiary-fixed": "#311400",
                "on-secondary-container": "#9fb5e7",
                "on-error-container": "#ffdad6",
                "background": "#0b1326",
                "tertiary-fixed-dim": "#ffb786",
                "primary-container": "#4d8eff",
                "on-surface-variant": "#c2c6d6",
                "on-primary-fixed-variant": "#004395",
                "surface-container-lowest": "#060e20",
                "surface-container-low": "#131b2e",
                "surface-container-high": "#222a3d",
                "inverse-surface": "#dae2fd",
                "surface-container": "#171f33",
                "primary": "#adc6ff",
                "surface-tint": "#adc6ff",
                "tertiary-container": "#df7412",
                "inverse-on-surface": "#283044",
                "surface-variant": "#2d3449",
                "secondary": "#b1c6f9",
                "primary-fixed": "#d8e2ff",
                "secondary-fixed": "#d8e2ff",
                "surface-container-highest": "#2d3449",
                "tertiary-fixed": "#ffdcc6",
                "on-error": "#690005",
                "on-tertiary-container": "#461f00",
                "on-tertiary": "#502400",
                "on-secondary-fixed": "#001a42",
                "on-primary-fixed": "#001a42",
                "surface-bright": "#31394d",
                "on-background": "#dae2fd"
            },
            fontFamily: {
                "headline": ["Manrope"],
                "body": ["Manrope"],
                "label": ["Manrope"]
            },
            borderRadius: {"DEFAULT": "0.25rem", "lg": "0.5rem", "xl": "0.75rem", "full": "9999px"},
        },
    },
};

// If using Tailwind via CDN
if (typeof tailwind !== 'undefined') {
    tailwind.config = tailwindConfig;
}

// If using via Node.js/bundler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = tailwindConfig;
}
