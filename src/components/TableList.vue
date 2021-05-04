<template>

  <om-table-tree
    :refresh-tickle="refreshTickle"
    :refresh-tree-tickle="refreshTableTreeTickle"
    :tree-data="tableTreeData"
    :is-all-expand="false"
    :is-any-group="isAnyTableGroup"
    :is-any-hidden="isAnyTableHidden"
    :is-show-hidden="isShowTableHidden"
    :filter-placeholder="$t('Find output table...')"
    :no-results-label="$t('No output tables found')"
    :no-nodes-label="$t('Server offline or no output tables found')"
    @om-table-tree-show-hidden="onToogleHiddenTableTree"
    @om-table-tree-leaf-select="onTableLeafClick"
    @om-table-tree-leaf-note="onShowTableNote"
    @om-table-tree-group-note="onShowGroupNote"
    >
  </om-table-tree>

</template>

<script>
import { mapState, mapGetters } from 'vuex'
import * as Mdf from 'src/model-common'
import OmTableTree from 'components/OmTableTree.vue'

export default {
  name: 'TableList',
  components: { OmTableTree },

  props: {
    refreshTickle: { type: Boolean, default: false }
  },

  data () {
    return {
      refreshTableTreeTickle: false,
      isAnyTableGroup: false,
      isAnyTableHidden: false,
      isShowTableHidden: false,
      runCurrent: Mdf.emptyRunText(), // currently selected run
      tableTreeData: [],
      nextId: 100
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel,
      theModelUpdated: state => state.theModelUpdated,
      runTextListUpdated: state => state.runTextListUpdated
    }),
    ...mapGetters('model', {
      runTextByDigest: 'runTextByDigest'
    }),
    ...mapState('uiState', {
      runDigestSelected: state => state.runDigestSelected
    })
  },

  watch: {
    refreshTickle  () { this.doRefresh() },
    runTextListUpdated () { this.doRefresh() },
    theModelUpdated () { this.doRefresh() }
  },

  methods: {
    // update output tables tree data and refresh tree view
    doRefresh () {
      this.runCurrent = this.runTextByDigest({ ModelDigest: Mdf.modelDigest(this.theModel), RunDigest: this.runDigestSelected })
      this.tableTreeData = this.makeTableTreeData()
      this.refreshTableTreeTickle = !this.refreshTableTreeTickle
    },

    // show or hide hidden output tables and groups
    onToogleHiddenTableTree (isShow) {
      this.isShowTableHidden = isShow
      this.doRefresh()
    },
    // click on output table: open current run output table values tab
    onTableLeafClick (key, name) {
      this.$emit('table-select', key, name)
    },
    // click on show output table notes dialog button
    onShowTableNote (key, name) {
      this.$emit('table-info-show', key, name)
    },
    // click on show group notes dialog button
    onShowGroupNote (key, name) {
      this.$emit('table-group-info-show', key, name)
    },

    // return tree of output tables
    makeTableTreeData () {
      this.isAnyTableGroup = false
      this.isAnyTableHidden = false

      if (!Mdf.tableCount(this.theModel)) return [] // empty list of output tables
      if (!Mdf.isTableTextList(this.theModel)) {
        this.$q.notify({ type: 'negative', message: this.$t('Model output tables list is empty or invalid') })
        return [] // invalid list of output tables
      }

      // map tables which are included in model run (not suppressed)
      // skip hidden tables if show hidden tables disabled
      const tUse = {}
      for (const t of this.theModel.TableTxt) {
        if (!Mdf.isRunTextHasTable(this.runCurrent, t.Table.Name)) continue // skip suppressed table

        this.isAnyTableHidden = this.isAnyTableHidden || t.Table.IsHidden
        if (this.isShowTableHidden || !t.Table.IsHidden) tUse[t.Table.Name] = true // table not hidden and not suppressed
      }

      // make groups map: map group id to group node
      const gLst = this.theModel.GroupTxt
      const gUse = {}

      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group

        const gId = gLst[k].Group.GroupId
        const isNote = Mdf.noteOfDescrNote(gLst[k]) !== ''
        this.isAnyTableHidden = this.isAnyTableHidden || gLst[k].Group.IsHidden

        gUse[gId] = {
          group: gLst[k],
          item: {
            key: 'tgr-' + gId + '-' + this.nextId++,
            label: gLst[k].Group.Name,
            descr: Mdf.descrOfDescrNote(gLst[k]),
            children: [],
            isGroup: true,
            isAbout: isNote,
            isAboutEmpty: !isNote
          }
        }
      }

      // add top level groups as starting point into groups tree
      let gTree = []
      const gProc = []

      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group
        if (!this.isShowTableHidden && gLst[k].Group.IsHidden) continue // skip hidden group

        const gId = gLst[k].Group.GroupId

        if (!gUse[gId]) continue // skip this group: it is empty group

        const isNotTop = gLst.findIndex((gt) => {
          if (gt.Group.IsParam) return false
          if (gt.Group.GroupId === gId) return false
          if (gt.Group.GroupPc.length <= 0) return false
          return gt.Group.GroupPc.findIndex((pc) => pc.ChildGroupId === gId) >= 0
        }) >= 0
        if (isNotTop) continue // not a top level group

        const g = Mdf._cloneDeep(gUse[gId].item)
        gTree.push(g)
        gProc.push({
          gId: gId,
          path: [gId],
          item: g
        })
      }
      this.isAnyTableGroup = gTree.length > 0

      // build groups tree
      while (gProc.length > 0) {
        const gpNow = gProc.pop()
        const gTxt = gUse[gpNow.gId].group

        // make all children of current item
        for (const pc of gTxt.Group.GroupPc) {
          // if this is a child group
          if (pc.ChildGroupId >= 0) {
            const gChildUse = gUse[pc.ChildGroupId]
            if (gChildUse) {
              if (!this.isShowTableHidden && gChildUse.group.Group.IsHidden) continue // skip hidden group

              // check for circular reference
              if (gpNow.path.indexOf(pc.ChildGroupId) >= 0) {
                console.warn('Error: circular refernece to group:', pc.ChildGroupId, 'path:', gpNow.path)
                continue // skip this group
              }

              const g = {
                gId: pc.ChildGroupId,
                path: Mdf._cloneDeep(gpNow.path),
                item: Mdf._cloneDeep(gChildUse.item)
              }
              g.item.key = 'tgr-' + pc.ChildGroupId + '-' + this.nextId++
              g.path.push(g.gId)
              gProc.push(g)
              gpNow.item.children.push(g.item)
            }
          }

          // if this is a child leaf output table
          if (pc.ChildLeafId >= 0) {
            const t = Mdf.tableTextById(this.theModel, pc.ChildLeafId)
            if (!Mdf.isTable(t.Table)) continue
            if (!tUse[t.Table.Name]) continue // skip: table suppressed or hidden

            gpNow.item.children.push({
              key: 'ttl-' + pc.ChildLeafId + '-' + this.nextId++,
              label: t.Table.Name,
              descr: (t.TableDescr || ''),
              children: [],
              isGroup: false,
              isAbout: true,
              isAboutEmpty: false
            })
          }
        }
      }

      // walk the tree and remove empty branches
      // add top level tree nodes as starting point
      const wStack = []
      wStack.push({
        key: 'table-tree-top-level-node',
        index: 0,
        isGroup: true,
        children: []
      })
      for (let k = 0; k < gTree.length; k++) {
        wStack[0].children.push(gTree[k])
      }

      // walk the tree until end of top level and remove empty branches
      while (wStack.length > 0) {
        const level = wStack[wStack.length - 1]

        // end of current level: pop to the parent level
        // if current level is empty group then remove it from the parent
        if (level.index >= level.children.length) {
          wStack.pop()
          if (wStack.length <= 0) break // end of tree top level

          const parent = wStack[wStack.length - 1]
          if (!level.isGroup || level.children.length > 0) {
            parent.index++ // move to the next child in parent list
          } else {
            if (parent.children.length < parent.index) parent.children.splice(parent.index, 1)
          }
          continue
        }

        // for all children of current level do:
        //   if child is not a group then skip it (go to next child)
        //   if child is empty group then remove that child
        //   if child is not empty group then push it to the stack and goto the next level down
        while (level.index < level.children.length) {
          const child = level.children[level.index]
          if (!child.isGroup) {
            level.index++
            continue
          }
          if (child.children.length <= 0) {
            level.children.splice(level.index, 1)
            continue
          }
          // else: child is not empty group, go to the one level down
          wStack.push({
            key: child.key,
            index: 0,
            isGroup: child.isGroup,
            children: child.children
          })
          break // go to the one level down
        }
      }

      // remove empty branches from top level of the tree
      gTree = gTree.filter(g => !g.isGroup || g.children.length > 0)

      // add output tables which are not included in any group (not a leaf nodes)
      const leafUse = {}
      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group

        for (const pc of gLst[k].Group.GroupPc) {
          if (pc.ChildLeafId >= 0) leafUse[pc.ChildLeafId] = true // store leaf output table id
        }
      }

      for (const t of this.theModel.TableTxt) {
        if (!tUse[t.Table.Name]) continue // skip: table suppressed or hidden

        if (!leafUse[t.Table.TableId]) { // if output table is not a leaf of any group
          gTree.push({
            key: 'ttl-' + t.Table.TableId + '-' + this.nextId++,
            label: t.Table.Name,
            descr: (t.TableDescr || ''),
            children: [],
            isGroup: false,
            isAbout: true,
            isAboutEmpty: false
          })
        }
      }

      return gTree
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
