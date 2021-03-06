// db structures common functions: model and model list

import * as Dnf from './descrNote'
import * as Hlpr from './helper'

// if this is a model
export const isModel = (md) => {
  if (!hasModelNameDigest(md)) return false
  return (md.Model.Name || '') !== '' && (md.Model.Digest || '') !== ''
}

// if this is an empty model: model with empty name and digest
export const isEmptyModel = (md) => {
  if (!hasModelNameDigest(md)) return false
  return (md.Model.Name || '') === '' || (md.Model.Digest || '') === ''
}

// if this is a Model with Name and Digest properties
const hasModelNameDigest = (md) => {
  if (!md) return false
  if (!md.hasOwnProperty('Model')) return false
  return md.Model.hasOwnProperty('Name') && md.Model.hasOwnProperty('Digest')
}

// return empty Model
export const emptyModel = () => {
  return {
    Model: {
      Name: '',
      Digest: ''
    }
  }
}

// return true if each list element isModel()
export const isModelList = (ml) => {
  if (!ml) return false
  if (!Hlpr.hasLength(ml)) return false
  for (const m of ml) {
    if (!isModel(m)) return false
  }
  return true
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
