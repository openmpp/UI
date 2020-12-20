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
import { mapState } from 'vuex'
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
      tableTreeData: [],
      nextId: 100
    }
  },

  computed: {
    ...mapState('model', {
      theModel: state => state.theModel,
      theModelUpdated: state => state.theModelUpdated
    })
  },

  watch: {
    refreshTickle  () { this.doRefresh() },
    theModelUpdated () { this.doRefresh() }
  },

  methods: {
    // update output tables tree data and refresh tree view
    doRefresh () {
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

      // make groups map: map group id to group node
      const gLst = this.theModel.GroupTxt
      const gm = {}

      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group

        const gId = gLst[k].Group.GroupId
        const isNote = Mdf.noteOfDescrNote(gLst[k]) !== ''
        this.isAnyTableHidden = this.isAnyTableHidden || gLst[k].Group.IsHidden

        gm[gId] = {
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
      const td = []
      const sd = []

      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group
        if (!this.isShowTableHidden && gLst[k].Group.IsHidden) continue // skip hidden group

        const gId = gLst[k].Group.GroupId

        const isNotTop = gLst.findIndex((gt) => {
          if (gt.Group.IsParam) return false
          if (gt.Group.GroupId === gId) return false
          if (gt.Group.GroupPc.length <= 0) return false
          return gt.Group.GroupPc.findIndex((pc) => pc.ChildGroupId === gId) >= 0
        }) >= 0
        if (isNotTop) continue // not a top level group

        const g = Mdf._cloneDeep(gm[gId].item)
        td.push(g)
        sd.push({
          gId: gId,
          path: [gId],
          item: g
        })
      }
      this.isAnyTableGroup = td.length > 0

      // build groups tree
      while (sd.length > 0) {
        const csd = sd.pop()
        const cg = gm[csd.gId]

        // make all children of current item
        for (const pc of cg.group.Group.GroupPc) {
          // if this is a child group
          if (pc.ChildGroupId >= 0) {
            const g = gm[pc.ChildGroupId]
            if (g) {
              if (!this.isShowTableHidden && g.group.Group.IsHidden) continue // skip hidden group

              // check for circular reference
              if (csd.path.indexOf(pc.ChildGroupId) >= 0) {
                console.warn('Error: circular refernece to group:', pc.ChildGroupId, 'path:', csd.path)
                continue // skip this group
              }

              const gn = {
                gId: pc.ChildGroupId,
                path: Mdf._cloneDeep(csd.path),
                item: Mdf._cloneDeep(g.item)
              }
              gn.item.key = 'tgr-' + pc.ChildGroupId + '-' + this.nextId++
              gn.path.push(gn.gId)
              sd.push(gn)
              csd.item.children.push(gn.item)
            }
          }

          // if this is a child leaf output table
          if (pc.ChildLeafId >= 0) {
            const t = Mdf.tableTextById(this.theModel, pc.ChildLeafId)
            if (Mdf.isTable(t.Table)) {
              if (!this.isShowTableHidden && t.Table.IsHidden) continue // skip hidden output table

              csd.item.children.push({
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
      }

      // add output tables which are not included in any group
      const ulm = {}
      for (let k = 0; k < gLst.length; k++) {
        if (gLst[k].Group.IsParam) continue // skip parameters group

        for (const pc of gLst[k].Group.GroupPc) {
          if (pc.ChildLeafId >= 0) ulm[pc.ChildLeafId] = true // store leaf output table id
        }
      }

      for (const t of this.theModel.TableTxt) {
        this.isAnyTableHidden = this.isAnyTableHidden || t.Table.IsHidden
        if (!this.isShowTableHidden && t.Table.IsHidden) continue // skip hidden output table

        if (!ulm[t.Table.TableId]) { // if output table is not a leaf
          td.push({
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

      return td
    }
  },

  mounted () {
    this.doRefresh()
  }
}
</script>
