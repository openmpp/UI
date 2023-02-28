# OpenM++ user interface (ompp-ui)

This repository is a part of [OpenM++](http://www.openmpp.org/) open source microsimulation platform.
It contains openM++ user interface.

## Project setup
```
git clone https://github.com/openmpp/UI.git ompp-ui
cd ompp-ui
npm install
```

### Start the app in development mode (hot-code reloading, error reporting, etc.)
Linux or MacOS:
```
export NODE_OPTIONS=--openssl-legacy-provider
npm run dev
```
Windows:
```
set NODE_OPTIONS=--openssl-legacy-provider
npm run dev
```

### Build the app for production
Linux or MacOS:
```
export NODE_OPTIONS=--openssl-legacy-provider
npm run build
```
Windows:
```
set NODE_OPTIONS=--openssl-legacy-provider
npm run build
```

### Lint the files
```
npm run lint
```

### Customize the configuration
See [Configuring quasar.conf.js](https://v1.quasar.dev/quasar-cli/quasar-conf-js).

**License:** MIT.

Please visit our [wiki](https://github.com/openmpp/openmpp.github.io/wiki) for more information or e-mail to: _openmpp dot org at gmail dot com_.
