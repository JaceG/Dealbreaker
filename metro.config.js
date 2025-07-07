const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add browser condition for proper module resolution
config.resolver.unstable_conditionNames = ['browser', 'require', 'react-native'];

// Add crypto polyfill
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  crypto: require.resolve('react-native-crypto-js'),
};

module.exports = config;