// service state configuration and state

import * as Hlpr from './helper'

// return empty service configuration
export const emptyConfig = () => {
  return {
    RootDir: '',
    RowPageMaxSize: 100,
    LoginUrl: '',
    LogoutUrl: '',
    ModelCatalogState: {
      ModelDir: ''
    },
    RunCatalogState: {
      ModelLogDir: '',
      IsModelLogEnabled: false,
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
    !c.hasOwnProperty('ModelCatalogState') || !c.hasOwnProperty('RunCatalogState')) {
    return false
  }
  if (!c.ModelCatalogState.hasOwnProperty('ModelDir')) return false
  if (!c.RunCatalogState.hasOwnProperty('ModelLogDir') || !c.RunCatalogState.hasOwnProperty('DefaultMpiTemplate') || !c.RunCatalogState.hasOwnProperty('MpiTemplates')) return false

  return Hlpr.hasLength(c.RunCatalogState.MpiTemplates)
}
