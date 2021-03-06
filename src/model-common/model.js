// db structures common functions: model and model list

import * as Dnf from './descr-note'

// return true if each list element isModel()
export const isModelList = (ml) => {
  if (!ml) return false
  if (!Array.isArray(ml)) return false
  for (const m of ml) {
    if (!isModel(m)) return false
  }
  return true
}

// return empty Model
export const emptyModel = () => {
  return {
    Model: {
      Name: '',
      Digest: '',
      CreateDateTime: '',
      DefaultLangCode: '',
      Version: ''
    }
  }
}

// if this is a model
const hasModelProperties = (md) => {
  if (!md) return false
  if (!md.hasOwnProperty('Model')) return false
  return md.Model.hasOwnProperty('Name') && md.Model.hasOwnProperty('Digest') &&
    md.Model.hasOwnProperty('CreateDateTime') && md.Model.hasOwnProperty('DefaultLangCode') && md.Model.hasOwnProperty('Version')
}

// if this is not empty model
export const isModel = (md) => {
  if (!hasModelProperties(md)) return false
  return (md.Model.Name || '') !== '' && (md.Model.Digest || '') !== '' && (md.Model.CreateDateTime || '') !== ''
}

// if this is an empty model: model with empty name and digest
export const isEmptyModel = (md) => {
  if (!hasModelProperties(md)) return false
  return (md.Model.Name || '') === '' || (md.Model.Digest || '') === '' || (md.Model.CreateDateTime || '') === ''
}

// name of the model
export const modelName = (md) => {
  if (!md) return ''
  if (!md.hasOwnProperty('Model')) return ''
  return (md.Model.Name || '')
}

// digest of the model
export const modelDigest = (md) => {
  if (!md) return ''
  if (!md.hasOwnProperty('Model')) return ''
  return (md.Model.Digest || '')
}

// make model title
export const modelTitle = (md) => {
  if (!isModel(md)) return ''
  const descr = Dnf.descrOfDescrNote(md)
  return (descr !== '') ? md.Model.Name + ': ' + descr : md.Model.Name
}
