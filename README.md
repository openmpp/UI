# OpenM++ UI frontend

This repository is a part of [OpenM++](http://www.openmpp.org/) open source microsimulation platform.
It contains web UI frontend (alpha version).

## Build

```
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report
```

## Run

You need to start `oms` web-service before UI. Folowing directory structure assumed by default:
```
./         -> oms "root" directory, by default it is current directory
    html/        -> web-UI directory with HTML, js, css, images...
    etc/         -> config files directory, contain template(s) to run models on MPI cluster
    log/         -> recommended log files directory
    models/
          bin/  -> default model.exe and model.sqlite directory
          log/  -> default directory for models run log files
```

On Windows you can start `oms` web-service and UI by double clicking on `bin\opmpp-ui.bat`:
```
@echo off

IF "%CD%\" == "%~dp0" (
  cd ..
)
IF "%OM_ROOT%" == "" (
  SET OM_ROOT=%CD%
)
rem cd %OM_ROOT%

START "oms" /MIN bin\oms
START http://localhost:4040
```

Please visit our [wiki](https://ompp.sourceforge.io/wiki/) for more information.

License: MIT.
