const path = require("path");

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  webpackFinal: async (config) => {
    // Find and remove any existing scss rules from Storybook
    config.module.rules = config.module.rules.filter((rule) => {
      if (rule.test && rule.test.toString().includes("scss")) {
        return false;
      }
      return true;
    });

    // Add our SCSS support with proper load paths
    config.module.rules.push({
      test: /\.scss$/,
      use: [
        "style-loader",
        "css-loader",
        {
          loader: "sass-loader",
          options: {
            api: "modern",
            sassOptions: {
              loadPaths: [path.resolve(__dirname, "../src/ui/react/styles")],
            },
          },
        },
      ],
    });

    // Add path aliases to match main webpack config
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "../src"),
      "@Algorithms": path.resolve(__dirname, "../src/algorithms"),
      "@Collaboration": path.resolve(__dirname, "../src/collaboration"),
      "@Config": path.resolve(__dirname, "../src/config"),
      "@Core": path.resolve(__dirname, "../src/core"),
      "@Debug": path.resolve(__dirname, "../src/debug"),
      "@Init": path.resolve(__dirname, "../src/init"),
      "@Services": path.resolve(__dirname, "../src/services"),
      "@Tests": path.resolve(__dirname, "../src/__tests__"),
      "@UI": path.resolve(__dirname, "../src/ui"),
      "@Utils": path.resolve(__dirname, "../src/utils"),
      "@VR": path.resolve(__dirname, "../src/vr"),
      "@VTK": path.resolve(__dirname, "../src/core/instances/types/vtk"),
    };

    // Add module resolution paths
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      path.resolve(__dirname, "../src"),
    ];

    return config;
  },
};

module.exports = config;
