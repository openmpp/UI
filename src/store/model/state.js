// current model and list of the models
import * as Mdf from 'src/model-common'

export default function () {
  return {
    modelList: [],
    modelListUpdated: 0,
    theModel: Mdf.emptyModel(),
    theModelUpdated: 0,
    groupParameterLeafs: {},
    groupTableLeafs: {},
    runTextList: [],
    runTextListUpdated: 0,
    worksetTextList: [],
    worksetTextListUpdated: 0,
    wordList: Mdf.emptyWordList(),
    langList: Mdf.emptyLangList()
  }
}
