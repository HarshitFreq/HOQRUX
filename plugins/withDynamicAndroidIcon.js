const { withAndroidColorsNight, AndroidConfig } = require('@expo/config-plugins');
const { assignColorValue } = AndroidConfig.Colors;

module.exports = function withDynamicAndroidIcon(config) {
  return withAndroidColorsNight(config, (config) => {
    config.modResults = assignColorValue(config.modResults, {
      name: 'iconBackground',
      value: '#050507',
    });
    return config;
  });
};
