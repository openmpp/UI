// current model and list of the models
import * as Mdf from 'src/model-common'

// assign new value to model language-specific strings (model words)
export const wordList = (state, mw) => {
  state.wordList = Mdf.emptyWordList()
  if (!mw) return
  state.wordList.ModelName = (mw.ModelName || '')
  state.wordList.ModelDigest = (mw.ModelDigest || '')
  state.wordList.LangCode = (mw.LangCode || '')
  state.wordList.ModelLangCode = (mw.ModelLangCode || '')
  if (mw.hasOwnProperty('LangWords')) {
    if (mw.LangWords && (mw.LangWords.length || 0) > 0) state.wordList.LangWords = mw.LangWords
  }
  if (mw.hasOwnProperty('ModelWords')) {
    if (mw.ModelWords && (mw.ModelWords.length || 0) > 0) state.wordList.ModelWords = mw.ModelWords
  }
}

// clear model words list if new model digest not same as word list model digest
export const wordListOnNew = (state, modelDigest) => {
  if ((modelDigest || '') !== state.wordList.ModelDigest) state.wordList = Mdf.emptyWordList()
}

// clear list of model languages if model changed or if it is empty
export const langListOnNew = (state, isClear) => {
  if (isClear) state.langList = Mdf.emptyLangList()
}

// assign new value to list of model languages
export const langList = (state, ml) => {
  state.langList = Mdf.isLangList(ml) ? ml : Mdf.emptyLangList()
}

// assign new value to current model
export const theModel = (state, model) => {
  const digest = Mdf.modelDigest(model)
  const storeDigest = Mdf.modelDigest(state.theModel)

  if (Mdf.isModel(model) || Mdf.isEmptyModel(model)) {
    state.theModel = model
    if (digest !== storeDigest) {
      state.groupParameterLeafs = Mdf.groupLeafs(model, true)
      state.groupTableLeafs = Mdf.groupLeafs(model, false)
    }
    state.theModelUpdated++
  }
}

// assign new value to model list, if (ml) is a model list
export const modelList = (state, ml) => {
  if (Mdf.isModelList(ml)) {
    state.modelList = ml
    state.modelListUpdated++
  }
}

// update run text
export const runText = (state, rt) => {
  if (!Mdf.isRunText(rt)) return
  if (!Mdf.isNotEmptyRunText(rt)) return

  const k = state.runTextList.findIndex((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest)
  if (k >= 0) {
    state.runTextList[k] = Mdf._cloneDeep(rt)
    state.runTextListUpdated++
  } else {
    if (state.theModel.Model.Digest === rt.ModelDigest) {
      state.runTextList.unshift(Mdf._cloneDeep(rt)) // run text stored in reverse chronological order
      state.runTextListUpdated++
    }
  }
}

// update run status and update data-time, also update selected run
export const runTextStatusUpdate = (state, rp) => {
  if (!rp || !Mdf.isLength(state.runTextList)) return
  if (!rp.hasOwnProperty('ModelDigest') || !rp.hasOwnProperty('RunDigest')) return

  const k = state.runTextList.findIndex((r) => r.ModelDigest === rp.ModelDigest && r.RunDigest === rp.RunDigest)
  if (k < 0) return

  if (rp.hasOwnProperty('Status')) {
    if ((rp.Status || '') !== '') {
      state.runTextList[k].Status = rp.Status
      state.runTextListUpdated++
    }
  }
  if (rp.hasOwnProperty('UpdateDateTime')) {
    if ((rp.UpdateDateTime || '') !== '') {
      state.runTextList[k].UpdateDateTime = rp.UpdateDateTime
      state.runTextListUpdated++
    }
  }
}

// delete run text
export const runTextDelete = (state, rt) => {
  if (!Mdf.isRunText(rt)) return
  if (!Mdf.isNotEmptyRunText(rt) || !Mdf.isLength(state.runTextList)) return

  const k = state.runTextList.findIndex((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest)
  if (k >= 0) {
    state.runTextList.splice(k, 1)
    state.runTextListUpdated++
  }
}

// assign new value to run text list: if (rtl) is a run text list the assign reverse it and commit to store
export const runTextList = (state, rtl) => {
  if (!Mdf.isRunTextList(rtl)) return // reject invalid run text list

  rtl.reverse() // sort in reverse chronological order

  // if parameter text or table list was not empty then copy it into new run text list
  for (const rt of rtl) {
    const k = state.runTextList.findIndex((r) => rt.ModelDigest === r.ModelDigest && rt.RunDigest === r.RunDigest)
    if (k >= 0) {
      if (Mdf.lengthOf(rt.Param) <= 0 && Mdf.lengthOf(state.runTextList[k].Param) > 0) rt.Param = Mdf._cloneDeep(state.runTextList[k].Param)
      if (Mdf.lengthOf(rt.Table) <= 0 && Mdf.lengthOf(state.runTextList[k].Table) > 0) rt.Table = Mdf._cloneDeep(state.runTextList[k].Table)
    }
  }
  state.runTextList = rtl
  state.runTextListUpdated++
}

// clear run list if model digest not same as run list model digest
export const runTextListOnNew = (state, modelDigest) => {
  let digest = ''
  if (state.runTextList.length > 0) {
    if (Mdf.isRunText(state.runTextList[0])) digest = state.runTextList[0].ModelDigest || ''
  }
  if ((modelDigest || '') !== digest) {
    state.runTextList = []
    state.runTextListUpdated++
  }
}

// update workset text
export const worksetText = (state, wt) => {
  if (!Mdf.isWorksetText(wt)) return
  if (!Mdf.isNotEmptyWorksetText(wt) || !Mdf.isLength(state.worksetTextList)) return

  const k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
  if (k >= 0) {
    state.worksetTextList[k] = Mdf._cloneDeep(wt)
    state.worksetTextListUpdated++
  } else {
    if (state.theModel.Model.Digest === wt.ModelDigest) {
      state.worksetTextList.push(Mdf._cloneDeep(wt))
      state.worksetTextListUpdated++
    }
  }
}

// delete workset text by model digest and workset name
export const worksetTextDelete = (state, wt) => {
  if (!wt.hasOwnProperty('ModelDigest') || !wt.hasOwnProperty('Name')) return

  const k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
  if (k >= 0) {
    state.worksetTextList.splice(k, 1)
    state.worksetTextListUpdated++
  }
}

// update workset status: set readonly status and update date-time
export const worksetStatus = (state, ws) => {
  if (!Mdf.isWorksetStatus(ws) || !Mdf.isLength(state.worksetTextList)) return

  const k = state.worksetTextList.findIndex((w) => w.ModelDigest === ws.ModelDigest && w.Name === ws.Name)
  if (k >= 0) {
    state.worksetTextList[k].IsReadonly = !!ws.IsReadonly
    state.worksetTextList[k].UpdateDateTime = (ws.UpdateDateTime || '')
    state.worksetTextListUpdated++
  }
}

// assign new value to workset list, if (wtl) is a model run list
export const worksetTextList = (state, wtl) => {
  if (!Mdf.isWorksetTextList(wtl)) return // reject invalid workset text list

  // if parameter text was not empty then copy it into new workset text list
  for (const wt of wtl) {
    const k = state.worksetTextList.findIndex((w) => w.ModelDigest === wt.ModelDigest && w.Name === wt.Name)
    if (k >= 0) {
      if (Mdf.lengthOf(wt.Param) <= 0 && Mdf.lengthOf(state.worksetTextList[k].Param) > 0) wt.Param = Mdf._cloneDeep(state.worksetTextList[k].Param)
    }
  }
  state.worksetTextList = wtl
  state.worksetTextListUpdated++
}

// clear workset list if model digest not same as workset list model digest
export const worksetTextListOnNew = (state, modelDigest) => {
  let digest = ''
  if (state.worksetTextList.length > 0) {
    if (Mdf.isWorksetText(state.worksetTextList[0])) digest = state.worksetTextList[0].ModelDigest || ''
  }
  if ((modelDigest || '') !== digest) {
    state.worksetTextList = []
    state.worksetTextListUpdated++
  }
}
