import type { StorybookConfig } from '@storybook/react-webpack5'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@storybook/addon-webpack5-compiler-swc',
    // '@storybook/addon-onboarding',
    // '@storybook/addon-links',
    '@storybook/addon-measure',
    '@storybook/addon-viewport',
    '@storybook/addon-controls',
    '@storybook/addon-backgrounds',
    '@storybook/addon-essentials',
    '@storybook/addon-actions',
    '@storybook/addon-outline',
    '@storybook/addon-toolbars',
    // '@chromatic-com/storybook',
    // '@storybook/addon-interactions',
    '@storybook/addon-styling-webpack',
    '@storybook/addon-themes',
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          {
            test: /\.css$/,
            sideEffects: true,
            use: [
              require.resolve('style-loader'),
              {
                loader: require.resolve('css-loader'),
                options: {
                  importLoaders: 1,
                },
              },
              {
                loader: require.resolve('postcss-loader'),
                options: {
                  implementation: require.resolve('postcss'),
                },
              },
            ],
          },
        ],
      },
    },
  ],
  framework: {
    name: '@storybook/react-webpack5',
    options: {
      builder: {
        useSWC: true,
      },
    },
  },
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config, options) => {
    // @ts-ignore
    config.resolve.plugins = [new TsconfigPathsPlugin()]
    // config.module?.rules?.push({
    //   test: /\.mdx$/,
    //   use: [
    //     {
    //       loader: 'babel-loader',
    //       options: {
    //         presets: ['@babel/preset-react'],
    //       },
    //     },
    //     '@storybook/mdx2-csf/loader',
    //   ],
    // })
    return config
  },
}
export default config
