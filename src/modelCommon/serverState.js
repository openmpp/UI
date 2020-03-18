// service state configuration and state

import * as Hlpr from './helper'

// return empty service configuration
export const emptyConfig = () => {
  return {
    RootDir: '',
    RowPageMaxSize: 100,
    LoginUrl: '',
    LogoutUrl: '',
    ModelCatalog: {
      ModelDir: '',
      ModelLogDir: '',
      IsLogDirEnabled: false
    },
    RunCatalog: {
      LastTimeStamp: '',
      DefaultMpiTemplate: 'mpi.ModelRun.template.txt',
      MpiTemplates: []
    }
  }
}

// return true if this is service config (it can be empty)
export const isConfig = (c) => {
  if (!c) return false
  if (!c.hasOwnProperty('RootDir') || !c.hasOwnProperty('RowPageMaxSize') ||
    !c.hasOwnProperty('LoginUrl') || !c.hasOwnProperty('LogoutUrl') ||
    !c.hasOwnProperty('ModelCatalog') || !c.hasOwnProperty('RunCatalog')) {
    return false
  }
  if (!c.ModelCatalog.hasOwnProperty('ModelDir') || !c.ModelCatalog.hasOwnProperty('ModelLogDir') || !c.ModelCatalog.hasOwnProperty('IsLogDirEnabled')) return false
  if (!c.RunCatalog.hasOwnProperty('DefaultMpiTemplate') || !c.RunCatalog.hasOwnProperty('MpiTemplates')) return false

  return Hlpr.hasLength(c.RunCatalog.MpiTemplates)
}
