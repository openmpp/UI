// db structures common functions: parameters groups and output tables gropus

import * as Mdl from './model'
import * as Hlpr from './helper'

// is model has group text list and each element is Group
export const isGroupTextList = (md) => {
  if (!Mdl.isModel(md)) return false
  if (!md.hasOwnProperty('GroupTxt')) return false
  if (!Hlpr.hasLength(md.GroupTxt)) return false
  for (let k = 0; k < md.GroupTxt.length; k++) {
    if (!isGroupText(md.GroupTxt[k])) return false
  }
  return true
}

// return true if this is non empty Group
export const isGroup = (g) => {
  if (!g) return false
  if (!g.hasOwnProperty('GroupId') || !g.hasOwnProperty('Name') || !g.hasOwnProperty('IsParam') || !g.hasOwnProperty('IsHidden')) return false
  if (!g.hasOwnProperty('GroupPc') || !Hlpr.hasLength(g.GroupPc)) return false
  return (g.Name || '') !== ''
}

// return true if this is non empty Group
export const isGroupText = (gt) => {
  if (!gt) return false
  if (!gt.hasOwnProperty('Group') || !gt.hasOwnProperty('DescrNote')) return false
  return isGroup(gt.Group)
}

// return empty GroupTxt
export const emptyGroupText = () => {
  return {
    Group: {
      GroupId: -1,
      IsParam: false,
      Name: '',
      IsHidden: false,
      GroupPc: []
    },
    DescrNote: {
      LangCode: '',
      Descr: '',
      Note: ''
    }
  }
}

// find GroupTxt by group id
export const groupTextById = (md, nId) => {
  if (!Mdl.isModel(md) || nId < 0) { // model empty or parameter id invalid: return empty result
    return emptyGroupText()
  }
  for (let k = 0; k < md.GroupTxt.length; k++) {
    if (!isGroup(md.GroupTxt[k].Group)) continue
    if (md.GroupTxt[k].Group.GroupId === nId) return md.GroupTxt[k]
  }
  return emptyGroupText() // not found
}

// find GroupTxt by name
export const groupTextByName = (md, name) => {
  if (!Mdl.isModel(md) || (name || '') === '') { // model empty or name empty: return empty result
    return emptyGroupText()
  }
  for (let k = 0; k < md.GroupTxt.length; k++) {
    if (!isGroup(md.GroupTxt[k].Group)) continue
    if (md.GroupTxt[k].Group.Name === name) return md.GroupTxt[k]
  }
  return emptyGroupText() // not found
}
