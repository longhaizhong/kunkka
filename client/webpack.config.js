var path = require('path');
var fs = require('fs');
var webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var autoprefixer = require('autoprefixer');

var language = process.env.language;

// Default language
if (!language) {
  language = 'zh-CN';
}

var entry = {};
fs.readdirSync('./applications')
  .filter(function(m) {
    return fs.statSync(path.join('./applications', m)).isDirectory();
  })
  .forEach(function(m) {
    entry[m] = './applications/' + m + '/index.jsx';
  });

module.exports = {
  context: __dirname,

  entry: entry,

  output: {
    path: 'client/dist',
    filename: '[hash:6].' + language + '.[name].min.js',
    publicPath: '/client/dist',
    chunkFilename: '[hash:6].' + language + '.[id].bundle.js'
  },

  module: {
    loaders: [{
      test: /\.js(.*)$/,
      exclude: /node_modules|moment/,
      loader: 'babel',
      query: {
        cacheDirectory: process.env.NODE_ENV !== 'production'
      }
    }, {
      test: /\.json$/,
      loader: 'json-loader'
    }, {
      test: /\.less$/,
      loader: ExtractTextPlugin.extract(
        'css!postcss-loader!less'
      )
    }, {
      test: /\.css$/,
      loader: ExtractTextPlugin.extract(
        'css!postcss-loader'
      )
    }],
    noParse: [
      /moment/g
    ]
  },

  postcss: function() {
    return [autoprefixer];
  },

  plugins: [
    new ExtractTextPlugin('[hash:6].[name].min.css', {
      allChunks: true
    }),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    })
  ],

  resolve: {
    extensions: ['', '.jsx', '.js'],
    root: path.resolve('../'),
    alias: {
      'uskin': 'client/uskin',
      'react': 'node_modules/react',
      'react-dom': 'node_modules/react-dom'
    }
  }
};
