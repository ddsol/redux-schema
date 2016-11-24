'use strict';

var webpack = require('webpack');

var env = process.env.NODE_ENV;
var config = {
  module: {
    loaders: [
      { test: /\.js$/, loaders: ['babel-loader'] }
    ]
  },
  output: {
    library: 'ReduxSchema',
    libraryTarget: 'umd'
  },
  plugins: [
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(env)
    })
  ]
};

if (env === 'production') {
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        pure_getters: false,
        unsafe: false,
        unsafe_comps: false,
        warnings: false,
        screw_ie8: false
      },
      mangle: {
        screw_ie8: false
      },
      output: {
        screw_ie8: false
      }
    })
  )
}

module.exports = config;
