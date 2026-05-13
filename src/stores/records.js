import { reactive, computed } from 'vue'

// 记录数据
const recordsMap = reactive({
  '2026-5': [
    { id: 1, day: 11, title: '搭建项目框架', location: '北京 · 中关村创业大街', lat: 39.9828, lng: 116.3104 },
    { id: 2, day: 12, title: '完成时间线模块重构', location: '北京 · 五道口 · 清华科技园', lat: 39.9905, lng: 116.3373 },
  ],
  '2026-4': [
    { id: 3, day: 28, title: '项目规划与需求分析', location: '北京 · 望京SOHO', lat: 39.9960, lng: 116.4818 },
  ],
  '2025-12': [
    { id: 4, day: 25, title: '圣诞节小记', location: '北京 · 三里屯太古里', lat: 39.9330, lng: 116.4551 },
    { id: 5, day: 10, title: '年末总结', location: '北京 · 国贸CBD', lat: 39.9087, lng: 116.4605 },
  ],
})

// 折叠状态
const openYears = reactive({})
const openMonths = reactive({})

let nextId = 6

export function useRecords() {
  function addRecord({ title, content, location, date, lat, lng }) {
    const now = date ? new Date(date) : new Date()
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
      lat: lat || null,
      lng: lng || null,
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

  function updateRecord(id, { title, content, location, lat, lng }) {
    for (const list of Object.values(recordsMap)) {
      const r = list.find(item => item.id === Number(id))
      if (r) {
        if (title !== undefined) r.title = title
        if (content !== undefined) r.content = content
        if (location !== undefined) r.location = location
        if (lat !== undefined) r.lat = lat
        if (lng !== undefined) r.lng = lng
        return true
      }
    }
    return false
  }

  // 有坐标的记录（用于地图）
  const mapRecords = computed(() => {
    const results = []
    for (const [key, records] of Object.entries(recordsMap)) {
      const [y, m] = key.split('-').map(Number)
      for (const r of records) {
        if (r.lat && r.lng) {
          results.push({
            ...r,
            date: `${y}-${String(m).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`,
          })
        }
      }
    }
    return results.sort((a, b) => b.id - a.id)
  })

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

  return { recordsMap, addRecord, getRecordById, updateRecord, mapRecords, yearTree, toggleYear, toggleMonth }
}
