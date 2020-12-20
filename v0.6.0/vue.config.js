// vue.config.js
const path = require('path')

module.exports = {
  css: {
    loaderOptions: {
      // pass options to sass-loader
      // @/ is an alias to src/
      sass: {
        sassOptions: {
          indentedSyntax: true,
          includePaths: [path.resolve(__dirname, 'node_modules')]
        }
      },
      scss: {
        sassOptions: {
          includePaths: [path.resolve(__dirname, 'node_modules')]
        }
      }
    }
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.(react)\.?(jsx|tsx)(\?.*)?$/,
          exclude: /(node_modules|bower_components)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-react'],
              plugins: ['transform-react-jsx']
            }
          }
        },
      ]
    }
  }
}
