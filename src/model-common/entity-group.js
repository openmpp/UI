// db structures common functions: entity attribute groups

import * as Mdl from './model'
import * as Ent from './entity'

// is model has entity attribute groups text list and each element is Group
export const isEntityGroupTextList = (md) => {
  if (!Mdl.isModel(md)) return false
  if (!md.hasOwnProperty('EntityGroupTxt')) return false
  if (!Array.isArray(md.EntityGroupTxt)) return false
  for (let k = 0; k < md.EntityGroupTxt.length; k++) {
    if (!isEntityGroupText(md.EntityGroupTxt[k])) return false
  }
  return true
}

// return true if this is non empty Group
export const isEntityGroup = (g) => {
  if (!g) return false
  if (!g.hasOwnProperty('EntityId') || !g.hasOwnProperty('GroupId') || !g.hasOwnProperty('Name') || !g.hasOwnProperty('IsHidden')) return false
  if (!g.hasOwnProperty('GroupPc') || !Array.isArray(g.GroupPc)) return false
  return (g.Name || '') !== ''
}

// return true if this is non empty Group
export const isEntityGroupText = (gt) => {
  if (!gt) return false
  if (!gt.hasOwnProperty('Group') || !gt.hasOwnProperty('DescrNote')) return false
  return isEntityGroup(gt.Group)
}

// return empty EntityGroupTxt
export const emptyEntityGroupText = () => {
  return {
    Group: {
      EntityId: -1,
      GroupId: -1,
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

// find EntityGroupTxt by entity id and group id
export const entityGroupTextById = (md, eId, gId) => {
  if (!Mdl.isModel(md) || !Array.isArray(md.EntityGroupTxt) || eId < 0 || gId < 0) { // model empty or entity id or group id invalid: return empty result
    return emptyEntityGroupText()
  }
  for (let k = 0; k < md.EntityGroupTxt.length; k++) {
    if (!isEntityGroup(md.EntityGroupTxt[k].Group)) continue
    if (md.EntityGroupTxt[k].Group.EntityId === eId && md.EntityGroupTxt[k].Group.GroupId === gId) return md.EntityGroupTxt[k]
  }
  return emptyEntityGroupText() // not found
}

// find EntityGroupTxt by entity id and group name
export const entityGroupTextByIdName = (md, eId, gName) => {
  if (!Mdl.isModel(md) || !Array.isArray(md.EntityGroupTxt) || eId < 0 || (gName || '') === '') { // model empty or entity id or group name empty: return empty result
    return emptyEntityGroupText()
  }
  for (let k = 0; k < md.EntityGroupTxt.length; k++) {
    if (!isEntityGroup(md.EntityGroupTxt[k].Group)) continue
    if (md.EntityGroupTxt[k].Group.EntityId === eId & md.EntityGroupTxt[k].Group.Name === gName) return md.EntityGroupTxt[k]
  }
  return emptyEntityGroupText() // not found
}

// return true if name is an entity group name
export const isEntityGroupName = (md, eId, gName) => {
  if (!Mdl.isModel(md) || !Array.isArray(md.EntityGroupTxt) || eId < 0 || (gName || '') === '') return false // model empty or entity id or group name empty: return empty result

  for (let k = 0; k < md.EntityGroupTxt.length; k++) {
    if (!isEntityGroup(md.EntityGroupTxt[k].Group)) continue
    if (md.EntityGroupTxt[k].Group.EntityId === eId && md.EntityGroupTxt[k].Group.Name === gName) return true
  }
  return false // not found
}

// return entity id map to groups name map to leafs:
//  {
//    eId:      // entity id:  123,
//    { gName:  // group name: IncomeAttributes
//      {
//        groupId: 456,
//        isHidden: true,
//        size: 2,
//        leafs: {aLeafName: true, otherLeafName: true}
//      },
//    nextGroupName: {....} // next group name: GeoAttributes
//  }
export const entityGroupLeafs = (md) => {
  if (!Mdl.isModel(md) || !Array.isArray(md.EntityGroupTxt)) { // model is empty: return empty result
    return {}
  }
  if (!Ent.entityCount(md)) return {} // no entities: return empty result

  // initial list of groups: no groups
  const egm = {}
  const egUse = {}
  const egLst = md.EntityGroupTxt
  let nGrp = 0

  for (let k = 0; k < egLst.length; k++) {
    if (!isEntityGroup(egLst[k].Group)) continue
    const eId = egLst[k].Group.EntityId
    if (eId < 0) continue // invalid (empty) entity id

    if (!egm[eId]) {
      egm[eId] = {} // initial list of the entity groups is empty
      egUse[eId] = {}
    }
    // initial list of leafs: no leafs in the group
    const gId = egLst[k].Group.GroupId
    egm[eId][egLst[k].Group.Name] = {
      groupId: gId,
      isHidden: egLst[k].Group.IsHidden,
      size: 0,
      leafs: {}
    }
    egUse[eId][gId] = {
      idx: k,
      out: [gId],
      in: [],
      leafs: []
    }
    nGrp++

    // add first leafs and child groups
    for (const pc of egLst[k].Group.GroupPc) {
      if (pc.ChildGroupId >= 0) egUse[eId][gId].in.push(pc.ChildGroupId)
      if (pc.AttrId >= 0) egUse[eId][gId].leafs.push(pc.AttrId)
    }
  }
  if (nGrp <= 0) return {} // no groups

  // expand each group by replacing child groups by leafs
  for (const eId in egUse) {
    const e = egUse[eId]
    for (const gId in e) {
      const g = e[gId]

      while (g.in.length > 0) {
        const childId = g.in.pop()
        if (g.out.indexOf(childId) >= 0) continue // skip: group already in child list of that parent

        g.out.push(childId) // done with that group

        const gChild = e[childId]
        if (!gChild) continue // skip: group does not exist

        // add all children leafs and all children groups into current group
        for (const pc of egLst[gChild.idx].Group.GroupPc) {
          if (pc.ChildGroupId >= 0) g.in.push(pc.ChildGroupId)
          if (pc.AttrId >= 0) g.leafs.push(pc.AttrId)
        }
      }
    }
  }

  // for each leaf find leaf name (parameter name or table name) and include into group map
  const eaf = Ent.entityAttrFinder(md)

  for (const eId in egm) {
    const e = egm[eId]
    for (const gName in e) {
      const g = e[gName]
      for (const leafId of egUse[eId][g.groupId].leafs) {
        const af = eaf.byId(eId, leafId)
        if (!af || !af?.ok) continue // attribute not found
        g.leafs[af.a.Attr.Name] = true
        g.size++
      }
    }
  }

  return egm
}
