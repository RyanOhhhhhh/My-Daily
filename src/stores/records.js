import { reactive, computed } from 'vue'

// 记录数据
const recordsMap = reactive({
  '2026-5': [
    { id: 1, day: 11, title: '搭建项目框架', location: '家里' },
    { id: 2, day: 12, title: '完成时间线模块重构', location: '咖啡厅' },
  ],
  '2026-4': [
    { id: 3, day: 28, title: '项目规划与需求分析', location: '办公室' },
  ],
  '2025-12': [
    { id: 4, day: 25, title: '圣诞节小记', location: '家里' },
    { id: 5, day: 10, title: '年末总结', location: '公司' },
  ],
})

// 折叠状态
const openYears = reactive({})
const openMonths = reactive({})

let nextId = 6

export function useRecords() {
  function addRecord({ title, content, location }) {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const d = now.getDate()
    const key = `${y}-${m}`

    if (!recordsMap[key]) {
      recordsMap[key] = []
    }

    const record = {
      id: nextId++,
      day: d,
      title,
      content: content || '',
      location: location || '',
    }

    recordsMap[key].push(record)
    recordsMap[key].sort((a, b) => b.day - a.day)

    return record
  }

  function getRecordById(id) {
    for (const list of Object.values(recordsMap)) {
      const found = list.find(r => r.id === Number(id))
      if (found) return found
    }
    return null
  }

  function updateRecord(id, { title, content, location }) {
    for (const list of Object.values(recordsMap)) {
      const r = list.find(item => item.id === Number(id))
      if (r) {
        if (title !== undefined) r.title = title
        if (content !== undefined) r.content = content
        if (location !== undefined) r.location = location
        return true
      }
    }
    return false
  }

  // 按年→月→日 树形结构（用于时间线）
  const yearTree = computed(() => {
    const yearMap = {}
    for (const [key, records] of Object.entries(recordsMap)) {
      const [y, m] = key.split('-').map(Number)
      if (!records || records.length === 0) continue
      if (!yearMap[y]) {
        yearMap[y] = { year: y, months: {} }
      }
      yearMap[y].months[m] = [...records].sort((a, b) => b.day - a.day)
    }

    return Object.values(yearMap)
      .sort((a, b) => b.year - a.year)
      .map(y => ({
        ...y,
        open: openYears[y.year] !== false,
        months: Object.entries(y.months)
          .sort(([a], [b]) => Number(b) - Number(a))
          .map(([m, records]) => ({
            m: Number(m),
            open: openMonths[`${y.year}-${m}`] !== false,
            records,
          })),
      }))
  })

  function toggleYear(year) {
    openYears[year] = openYears[year] === false ? true : false
  }

  function toggleMonth(year, month) {
    const key = `${year}-${month}`
    openMonths[key] = openMonths[key] === false ? true : false
  }

  return { recordsMap, addRecord, getRecordById, updateRecord, yearTree, toggleYear, toggleMonth }
}
