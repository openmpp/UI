// db structures common functions: entity and entities list

import * as Mdl from './model'

// number of model entities
export const entityCount = (md) => {
  if (!Mdl.isModel(md)) return 0
  return md?.EntityTxt?.length || 0
}

// is model has entity text list and each element is Entity
export const isEntityTextList = (md) => {
  if (!Mdl.isModel(md)) return false
  if (!Array.isArray(md?.EntityTxt) || (md?.EntityTxt?.length || 0) === 0) return false
  for (const et of md.EntityTxt) {
    if (!isEntity(et.Entity)) return false
  }
  return true
}

// return true if this is non empty Entity
export const isEntity = (e) => {
  if (!e) return false
  if (!e.hasOwnProperty('EntityId') || !e.hasOwnProperty('Name') || !e.hasOwnProperty('Digest')) return false

  return e.EntityId >= 0 && (e?.Name || '') !== '' && (e?.Digest || '') !== ''
}

// if this is not empty EntityTxt: entity id, entity name, entity digest and not empty array of EntityAttrTxt
export const isNotEmptyEntityText = (et) => {
  if (!et) return false
  if (!et?.Entity || !et?.EntityAttrTxt) return false
  return isEntity(et.Entity) && Array.isArray(et.EntityAttrTxt) && et.EntityAttrTxt.length > 0
}

// return empty EntityTxt
export const emptyEntityText = () => {
  return {
    Entity: {
      EntityId: 0,
      Name: '',
      Digest: ''
    },
    EntityAttrTxt: [],
    DescrNote: {
      LangCode: '',
      Descr: '',
      Note: ''
    }
  }
}

// return true if this is non empty entity Attr
export const isEntityAttr = (ea) => {
  if (!ea) return false
  if (!ea.hasOwnProperty('EntityId') || !ea.hasOwnProperty('AttrId') ||
    !ea.hasOwnProperty('Name') || !ea.hasOwnProperty('TypeId') || !ea.hasOwnProperty('IsInternal')) return false

  return ea.EntityId >= 0 && ea.AttrId >= 0 && (ea?.Name || '') !== '' && ea.TypeId >= 0
}

// return true if this is non empty entity EntityAttrTxt
export const isNotEmptyEntityAttr = (eat) => {
  if (!eat) return false
  if (!eat?.Attr) return false
  return isEntityAttr(eat.Attr)
}

// return empty EntityAttrTxt
export const emptyEntityAttrTxt = () => {
  return {
    Attr: {
      EntityId: 0,
      AttrId: 0,
      Name: '',
      TypeId: 0,
      IsInternal: false
    },
    DescrNote: {
      LangCode: '',
      Descr: '',
      Note: ''
    }
  }
}

// find EntityTxt by entity id
export const entityTextById = (md, nId) => {
  if (!Mdl.isModel(md) || nId < 0) { // model empty or entity id invalid: return empty result
    return emptyEntityText()
  }
  for (let k = 0; k < md.EntityTxt.length; k++) {
    if (!isEntity(md.EntityTxt[k].Entity)) continue
    if (md.EntityTxt[k].Entity.EntityId === nId) return md.EntityTxt[k]
  }
  return emptyEntityText() // not found
}

// find EntityTxt by name
export const entityTextByName = (md, name) => {
  if (!Mdl.isModel(md) || (name || '') === '') { // model empty or name empty: return empty result
    return emptyEntityText()
  }
  for (let k = 0; k < md.EntityTxt.length; k++) {
    if (!isEntity(md.EntityTxt[k].Entity)) continue
    if (md.EntityTxt[k].Entity.Name === name) return md.EntityTxt[k]
  }
  return emptyEntityText() // not found
}

// number of entity attributes: length of EntityAttrTxt
export const entityAttrCount = (et) => {
  return isNotEmptyEntityText(et) ? et.EntityAttrTxt.length : 0
}

// find entity attribute EntityAttrTxt by entity name and attribute name
export const entityAttrTextByName = (md, entName, attrName) => {
  if (!Mdl.isModel(md) || (entName || '') === '' || (attrName || '') === '') { // empty model or entity name or attribute: return empty result
    return emptyEntityAttrTxt()
  }
  for (const et of md.EntityTxt) {
    if (!isNotEmptyEntityText(et)) continue
    if (et.Entity.Name !== entName) continue

    for (const eat of et.EntityAttrTxt) {
      if (eat?.Attr?.Name === attrName) return eat
    }
  }
  return emptyEntityAttrTxt() // not found
}
