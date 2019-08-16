import * as Mdf from '@/modelCommon'

// internal mutations names
const COMMIT = {
  UI_LANG: 'commitUiLang',
  WORD_LIST: 'commitWordList',
  WORD_LIST_ON_NEW: 'commitWordListOnNew',
  MODEL_LIST: 'commitModelList',
  THE_MODEL: 'commitModel',
  THE_RUN_TEXT: 'commitRunText',
  THE_RUN_TEXT_ON_NEW: 'commitRunTextOnNew',
  THE_RUN_TEXT_BY_IDX: 'commitRunTextByIdx',
  RUN_TEXT_LIST: 'commitRunTextList',
  RUN_TEXT_LIST_ON_NEW: 'commitRunTextListOnNew',
  THE_WORKSET_TEXT: 'commitWorksetText',
  THE_WORKSET_TEXT_ON_NEW: 'commitWorksetTextOnNew',
  THE_WORKSET_TEXT_BY_IDX: 'commitWorksetTextByIdx',
  THE_WORKSET_STATUS: 'commitWorksetStatus',
  WORKSET_TEXT_LIST: 'commitWorksetTextList',
  WORKSET_TEXT_LIST_ON_NEW: 'commitWorksetTextListOnNew',
  PARAM_VIEW: 'paramView',
  PARAM_VIEW_DELETE: 'paramViewDelete'
}

// mutations: synchronized updates
const mutations = {
  // assign new value to current UI language
  [COMMIT.UI_LANG] (state, lang) { state.uiLang = (lang || '') },

  // assign new value to model language-specific strings (model words)
  [COMMIT.WORD_LIST] (state, mw) {
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
  },

  // clear model words list if new model digest not same as word list model digest
  [COMMIT.WORD_LIST_ON_NEW] (state, modelDigest) {
    if ((modelDigest || '') !== state.wordList.ModelDigest) state.wordList = Mdf.emptyWordList()
  },

  // assign new value to current model, if (md) is a model
  [COMMIT.THE_MODEL] (state, md) {
    if (Mdf.isModel(md) || Mdf.isEmptyModel(md)) state.theModel = md
  },

  // assign new value to model list, if (ml) is a model list
  [COMMIT.MODEL_LIST] (state, ml) {
    if (Mdf.isModelList(ml)) state.modelList = ml
  },

  // set current run
  [COMMIT.THE_RUN_TEXT] (state, rt) {
    if (!Mdf.isRunText(rt)) {
      state.theRunText = Mdf.emptyRunText()
      return
    }
    // update current model run
    state.theRunText = rt

    // find current model run in the list and update it
    if (!Mdf.isNotEmptyRunText(rt) || !Mdf.isLength(state.runTextList)) return

    for (let k = 0; k < state.runTextList.length; k++) {
      if (state.runTextList[k].ModelDigest === rt.ModelDigest &&
        ((rt.Digest !== '' && state.runTextList[k].Digest === rt.Digest) ||
        (rt.Digest === '' &&
        state.runTextList[k].Digest === rt.Digest &&
        state.runTextList[k].Name === rt.Name &&
        state.runTextList[k].Status === rt.Status &&
        state.runTextList[k].SubCount === rt.SubCount &&
        state.runTextList[k].CreateDateTime === rt.CreateDateTime &&
        state.runTextList[k].UpdateDateTime === rt.UpdateDateTime))) {
        // update run list with current value
        state.runTextList.splice(k, 1, Mdf._cloneDeep(rt))
        break
      }
    }
  },

  // set current run by index in run list or empty if index out of range
  [COMMIT.THE_RUN_TEXT_BY_IDX] (state, idx) {
    // if index out of range then set current run to empty value
    if (idx < 0 || idx >= state.runTextList.length) {
      state.theRunText = Mdf.emptyRunText()
      return
    }
    // if current run same as index run then return
    if (Mdf.isNotEmptyRunText(state.theRunText) &&
      state.theRunText.ModelDigest === state.runTextList[idx].ModelDigest &&
      state.theRunText.Name === state.runTextList[idx].Name &&
      state.theRunText.Digest === state.runTextList[idx].Digest &&
      state.theRunText.Status === state.runTextList[idx].Status &&
      state.theRunText.SubCount === state.runTextList[idx].SubCount &&
      (state.theRunText.CreateDateTime || '') === (state.runTextList[idx].CreateDateTime || '') &&
      (state.theRunText.UpdateDateTime || '') === (state.runTextList[idx].UpdateDateTime || '')) {
      return // same model run
    }
    // update current run to run at the index
    state.theRunText = Mdf._cloneDeep(state.runTextList[idx])
  },

  // clear current run if model digest not the same else set current run to first in run list
  [COMMIT.THE_RUN_TEXT_ON_NEW] (state, modelDigest) {
    if ((modelDigest || '') !== state.theRunText.ModelDigest) {
      state.theRunText = Mdf.emptyRunText()
      return
    }
    if (!Mdf.isLength(state.runTextList)) return // model run list empty

    // if current run same as index run then return
    if (Mdf.isNotEmptyRunText(state.theRunText) &&
      state.theRunText.ModelDigest === state.runTextList[0].ModelDigest &&
      state.theRunText.Name === state.runTextList[0].Name &&
      state.theRunText.Digest === state.runTextList[0].Digest &&
      state.theRunText.Status === state.runTextList[0].Status &&
      state.theRunText.SubCount === state.runTextList[0].SubCount &&
      (state.theRunText.CreateDateTime || '') === (state.runTextList[0].CreateDateTime || '') &&
      (state.theRunText.UpdateDateTime || '') === (state.runTextList[0].UpdateDateTime || '')) {
      return // same model run
    }

    // update current model run to the first in model run list
    state.theRunText = Mdf._cloneDeep(state.runTextList[0])
  },

  // assign new value to run list, if (rl) is a model run text list
  [COMMIT.RUN_TEXT_LIST] (state, rtl) {
    if (Mdf.isRunTextList(rtl)) state.runTextList = rtl
  },

  // clear run list if model digest not same as run list model digest
  [COMMIT.RUN_TEXT_LIST_ON_NEW] (state, modelDigest) {
    let digest = ''
    if (state.runTextList.length > 0) {
      if (Mdf.isRunText(state.runTextList[0])) digest = state.runTextList[0].ModelDigest || ''
    }
    if ((modelDigest || '') !== digest) state.runTextList = []
  },

  // set current workset
  [COMMIT.THE_WORKSET_TEXT] (state, wt) {
    if (!Mdf.isWorksetText(wt)) {
      state.theWorksetText = Mdf.emptyWorksetText()
      return
    }
    // update current workset
    state.theWorksetText = wt

    // find current workset in the list and update it
    if (!Mdf.isNotEmptyWorksetText(wt) || !Mdf.isLength(state.worksetTextList)) return

    for (let k = 0; k < state.worksetTextList.length; k++) {
      if (state.worksetTextList[k].ModelDigest === wt.ModelDigest &&
        state.worksetTextList[k].Name === wt.Name) {
        // update workset list with current value
        state.worksetTextList.splice(k, 1, Mdf._cloneDeep(wt))
        break
      }
    }
  },

  // set current workset by index in workset list or empty if index out of range
  [COMMIT.THE_WORKSET_TEXT_BY_IDX] (state, idx) {
    // if index out of range then set current workset to empty value
    if (idx < 0 || idx >= state.worksetTextList.length) {
      state.theWorksetText = Mdf.emptyWorksetText()
      return
    }
    // if current workset same as index workset then return
    if (Mdf.isNotEmptyWorksetText(state.theWorksetText) &&
      state.theWorksetText.ModelDigest === state.worksetTextList[idx].ModelDigest &&
      state.theWorksetText.Name === state.worksetTextList[idx].Name) {
      return // same workset
    }
    // update current workset to workset at the index
    state.theWorksetText = Mdf._cloneDeep(state.worksetTextList[idx])
  },

  // clear current workset if model digest not the same else set current workset to first in workset list
  [COMMIT.THE_WORKSET_TEXT_ON_NEW] (state, modelDigest) {
    if ((modelDigest || '') !== state.theWorksetText.ModelDigest) {
      state.theWorksetText = Mdf.emptyWorksetText()
      return
    }
    if (!Mdf.isLength(state.worksetTextList)) return // workset list empty

    // if current workset has same model and name then exit
    if (Mdf.isNotEmptyWorksetText(state.theWorksetText) &&
      state.theWorksetText.ModelDigest === modelDigest &&
      state.theWorksetText.Name === state.worksetTextList[0].Name) {
      return // same workset
    }

    // update current workset to the first in workset list
    state.theWorksetText = Mdf._cloneDeep(state.worksetTextList[0])
  },

  // update current workset status: if name the same as current set name then set readonly status and update date-time
  [COMMIT.THE_WORKSET_STATUS] (state, ws) {
    if (!Mdf.isWorksetStatus(ws)) return
    if ((ws.Name || '') === state.theWorksetText.Name) {
      state.theWorksetText.IsReadonly = !!ws.IsReadonly
      state.theWorksetText.UpdateDateTime = (ws.UpdateDateTime || '')
    }
  },

  // assign new value to workset list, if (wtl) is a model run list
  [COMMIT.WORKSET_TEXT_LIST] (state, wtl) {
    if (Mdf.isWorksetTextList(wtl)) state.worksetTextList = wtl
  },

  // clear workset list if model digest not same as workset list model digest
  [COMMIT.WORKSET_TEXT_LIST_ON_NEW] (state, modelDigest) {
    let digest = ''
    if (state.worksetTextList.length > 0) {
      if (Mdf.isWorksetText(state.worksetTextList[0])) digest = state.worksetTextList[0].ModelDigest || ''
    }
    if ((modelDigest || '') !== digest) state.worksetTextList = []
  },

  // insert, replace or update parameter view by route key (key must be non-empty string)
  [COMMIT.PARAM_VIEW] (state, pv) {
    if (!pv || !pv.hasOwnProperty('key')) return
    if (typeof pv.key !== typeof 'string' || pv.key === '') return

    // insert new or replace existing parameter view
    if (pv.hasOwnProperty('view')) {
      if (pv.view !== void 0 && pv.view !== null) {
        state.paramViews[pv.key] = Mdf._cloneDeep(pv.view)
      }
      return
    }
    // else: update existing parameter view
    if (!state.paramViews.hasOwnProperty(pv.key)) return // parameter view not found
    let p = state.paramViews[pv.key]
    if (!p) return // parameter view not found

    if (pv.hasOwnProperty('rows')) {
      if (typeof pv.rows === typeof []) state.paramViews[pv.key].rows = Mdf._cloneDeep(pv.rows)
    }
    if (pv.hasOwnProperty('cols')) {
      if (typeof pv.cols === typeof []) state.paramViews[pv.key].cols = Mdf._cloneDeep(pv.cols)
    }
    if (pv.hasOwnProperty('others')) {
      if (typeof pv.others === typeof []) state.paramViews[pv.key].others = Mdf._cloneDeep(pv.others)
    }
    if (pv.hasOwnProperty('isRowColControls')) {
      if (typeof pv.isRowColControls === typeof true) state.paramViews[pv.key].isRowColControls = pv.isRowColControls
    }
    if (pv.hasOwnProperty('rowColMode')) {
      if (typeof pv.rowColMode === typeof 1) state.paramViews[pv.key].rowColMode = pv.rowColMode
    }
    if (pv.hasOwnProperty('edit')) {
      if (pv.edit !== void 0 && pv.edit !== null) state.paramViews[pv.key].edit = Mdf._cloneDeep(pv.edit)
    }
  },

  // delete parameter view by route key, if exist (key must be a string)
  [COMMIT.PARAM_VIEW_DELETE] (state, key) {
    if (typeof key === typeof 'string' && state.paramViews.hasOwnProperty[key]) delete state.paramViews[key]
  }
}

export { COMMIT, mutations }
