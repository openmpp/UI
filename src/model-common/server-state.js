// server state and configuration

// return empty service configuration
export const emptyConfig = () => {
  return {
    RootDir: '',
    RowPageMaxSize: 100,
    AllowUserHome: false,
    AllowDownload: false,
    Env: {},
    ModelCatalog: {
      ModelDir: '',
      ModelLogDir: '',
      IsLogDirEnabled: false,
      LastTimeStamp: ''
    },
    RunCatalog: {
      RunTemplates: [],
      DefaultMpiTemplate: 'mpi.ModelRun.template.txt',
      MpiTemplates: []
    }
  }
}

// return true if this is service config (it can be empty)
export const isConfig = (c) => {
  if (!c) return false
  if (!c.hasOwnProperty('RootDir') || !c.hasOwnProperty('RowPageMaxSize') || !c.hasOwnProperty('AllowUserHome') || !c.hasOwnProperty('AllowDownload') ||
    !c.hasOwnProperty('Env') || !c.hasOwnProperty('ModelCatalog') || !c.hasOwnProperty('RunCatalog')) {
    return false
  }
  if (!c.ModelCatalog.hasOwnProperty('ModelDir') || !c.ModelCatalog.hasOwnProperty('ModelLogDir') || !c.ModelCatalog.hasOwnProperty('IsLogDirEnabled')) return false
  if (!c.RunCatalog.hasOwnProperty('RunTemplates') || !c.RunCatalog.hasOwnProperty('DefaultMpiTemplate') || !c.RunCatalog.hasOwnProperty('MpiTemplates')) return false

  return Array.isArray(c.RunCatalog.RunTemplates) && Array.isArray(c.RunCatalog.MpiTemplates)
}

// return value of server environemnt variable by key, if no such variable then return empty '' string
export const configEnvValue = (c, key) => {
  if (!isConfig(c)) return ''
  if (!c.Env.hasOwnProperty(key)) return ''
  return c.Env[key] || ''
}

/* eslint-disable no-multi-spaces */
/*
// DownloadStatusLog contains download status info and content of log file
type DownloadStatusLog struct {
  Status      string   // if not empty then one of: progress ready error
  Kind        string   // if not empty then one of: model run workset
  ModelDigest string   // content of Model Digest:
  RunDigest   string   // content of Run  Digest:
  WorksetName string   // contenet of Scenario Name:
  IsFolder    bool     // if true then download folder exist
  Folder      string   // content of Folder:
  IsZip       bool     // if true then download zip exist
  ZipFileName string   // zip file name
  ZipModTime  int64    // zip modification time in milliseconds since epoch
  ZipSize     int64    // zip file size
  LogFileName string   // log file name
  LogNsTime   int64    // log file modification time in nanseconds since epoch
  Lines       []string // file content
}
*/
// return empty DownloadStatusLog
export const emptyDownloadLog = () => {
  return {
    Status: '',      // if not empty then one of: progress ready error
    Kind: '',        // if not empty then one of: model run workset
    ModelDigest: '',
    RunDigest: '',
    WorksetName: '',
    IsFolder: false, // if true then download folder exist
    Folder: '',      // folder name with unzipped download content
    IsZip: false,    // if true then download zip exist
    ZipFileName: '', // zip file name
    ZipModTime: 0,   // zip modification time in milliseconds since epoch
    ZipSize: 0,      // zip file size
    LogFileName: '', // log file name
    LogNsTime: 0,    // log file modification time in nanseconds since epoch
    Lines: []        // log file lines
  }
}
/* eslint-enable no-multi-spaces */

export const allModelsDownloadLog = 'all-models-download-logs'

// return true if this is download log status info (it can be empty or incomplete)
export const isDownloadLog = (d) => {
  if (!d) return false
  if (!d.hasOwnProperty('Status') || !d.hasOwnProperty('Kind') ||
    !d.hasOwnProperty('ModelDigest') || !d.hasOwnProperty('RunDigest') || !d.hasOwnProperty('WorksetName') ||
    !d.hasOwnProperty('IsFolder') || !d.hasOwnProperty('Folder') ||
    !d.hasOwnProperty('IsZip') || !d.hasOwnProperty('ZipFileName') || !d.hasOwnProperty('ZipModTime') || !d.hasOwnProperty('ZipSize') ||
    !d.hasOwnProperty('LogFileName') || !d.hasOwnProperty('LogNsTime') || !d.hasOwnProperty('Lines')) {
    return false
  }
  return Array.isArray(d.Lines)
}

// return true if each list element isDownloadLog()
export const isDownloadLogList = (dLst) => {
  if (!dLst) return false
  if (!Array.isArray(dLst)) return false
  for (let k = 0; k < dLst.length; k++) {
    if (!isDownloadLog(dLst[k])) return false
  }
  return true
}
