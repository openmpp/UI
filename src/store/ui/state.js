// UI session state
export default function () {
  return {
    uiLang: '',
    runDigestSelected: '',
    worksetNameSelected: '',
    taskNameSelected: '',
    noAccDownload: true,
    noMicrodataDownload: true,
    treeLabelKind: '',
    modelTreeExpandedKeys: [],
    paramViews: {},
    tableViews: {},
    modelView: {}
  }
}
