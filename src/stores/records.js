import { reactive, computed } from 'vue'
import { api } from '../api'

// 从 Markdown 正文中提取第一张图片 URL
function getFirstImage(content) {
  if (!content) return null
  const m = content.match(/!\[.*?\]\(([^\s)]+)(?:\s*=\d+%?)?\)/)
  return m ? m[1] : null
}

// 从记录日期中提取年/月/日
function parseRecordDate(record) {
  const d = record.record_date ? new Date(record.record_date) : new Date(record.created_at)
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  }
}

// 本地缓存（从 API 加载后存入）
const recordsMap = reactive({})
let loaded = false

// 折叠状态
const openYears = reactive({})
const openMonths = reactive({})

// 地图视野缓存
const mapViewState = reactive({
  center: null,
  zoom: null,
})

export function useRecords() {
  // ---- 从后端加载所有记录 ----
  async function fetchRecords() {
    try {
      const data = await api.get('/api/records')
      // 清空再填充
      for (const key of Object.keys(recordsMap)) {
        delete recordsMap[key]
      }
      for (const r of data.records) {
        const { year, month } = parseRecordDate(r)
        const key = `${year}-${month}`
        if (!recordsMap[key]) recordsMap[key] = []
        const existing = recordsMap[key].find(item => item.id === r.id)
        if (!existing) {
          recordsMap[key].push({
            id: r.id,
            day: parseRecordDate(r).day,
            title: r.title,
            content: r.content || '',
            location: r.location || '',
            lat: r.lat,
            lng: r.lng,
            _record_date: r.record_date,
            _created_at: r.created_at,
          })
        }
      }
      // 排序
      for (const key of Object.keys(recordsMap)) {
        recordsMap[key].sort((a, b) => b.day - a.day || b.id - a.id)
      }
      loaded = true
    } catch (e) {
      console.error('[records] 加载失败:', e)
    }
  }

  async function addRecord({ title, content, location, date, lat, lng }) {
    const body = {
      title,
      content: content || '',
      location: location || '',
      lat: lat || null,
      lng: lng || null,
      record_date: date || new Date().toISOString(),
    }
    const r = await api.post('/api/records', body)
    const { year, month, day } = parseRecordDate(r)
    const key = `${year}-${month}`
    if (!recordsMap[key]) recordsMap[key] = []
    recordsMap[key].push({
      id: r.id,
      day,
      title: r.title,
      content: r.content || '',
      location: r.location || '',
      lat: r.lat,
      lng: r.lng,
      _record_date: r.record_date,
      _created_at: r.created_at,
    })
    recordsMap[key].sort((a, b) => b.day - a.day || b.id - a.id)
    return r
  }

  async function getRecordById(id) {
    // 先查本地缓存
    for (const list of Object.values(recordsMap)) {
      const found = list.find(r => r.id === Number(id))
      if (found) return found
    }
    // 本地没有则从后端取
    try {
      const r = await api.get(`/api/records/${id}`)
      const { year, month, day } = parseRecordDate(r)
      const key = `${year}-${month}`
      if (!recordsMap[key]) recordsMap[key] = []
      const record = {
        id: r.id,
        day,
        title: r.title,
        content: r.content || '',
        location: r.location || '',
        lat: r.lat,
        lng: r.lng,
        _record_date: r.record_date,
        _created_at: r.created_at,
      }
      if (!recordsMap[key].find(item => item.id === r.id)) {
        recordsMap[key].push(record)
        recordsMap[key].sort((a, b) => b.day - a.day || b.id - a.id)
      }
      return record
    } catch (e) {
      console.error('[records] 获取记录失败:', e)
      return null
    }
  }

  async function updateRecord(id, { title, content, location, lat, lng }) {
    const body = {}
    if (title !== undefined) body.title = title
    if (content !== undefined) body.content = content
    if (location !== undefined) body.location = location
    if (lat !== undefined) body.lat = lat
    if (lng !== undefined) body.lng = lng

    const r = await api.put(`/api/records/${id}`, body)
    // 更新本地缓存
    for (const list of Object.values(recordsMap)) {
      const found = list.find(item => item.id === Number(id))
      if (found) {
        if (title !== undefined) found.title = r.title
        if (content !== undefined) found.content = r.content
        if (location !== undefined) found.location = r.location
        if (lat !== undefined) found.lat = r.lat
        if (lng !== undefined) found.lng = r.lng
        return true
      }
    }
    return true
  }

  async function deleteRecord(id) {
    await api.del(`/api/records/${id}`)
    for (const key of Object.keys(recordsMap)) {
      const idx = recordsMap[key].findIndex(item => item.id === Number(id))
      if (idx !== -1) {
        recordsMap[key].splice(idx, 1)
        if (recordsMap[key].length === 0) {
          delete recordsMap[key]
        }
        return true
      }
    }
    return true
  }

  // 有坐标且有照片的记录（用于地图）
  const mapRecords = computed(() => {
    const results = []
    for (const [key, records] of Object.entries(recordsMap)) {
      const [y, m] = key.split('-').map(Number)
      for (const r of records) {
        const firstPhoto = getFirstImage(r.content)
        if (r.lat && r.lng && firstPhoto) {
          results.push({
            ...r,
            date: `${y}-${String(m).padStart(2, '0')}-${String(r.day).padStart(2, '0')}`,
            firstPhoto,
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

  return {
    recordsMap,
    addRecord,
    getRecordById,
    updateRecord,
    deleteRecord,
    fetchRecords,
    mapRecords,
    yearTree,
    toggleYear,
    toggleMonth,
    mapViewState,
    loaded,
  }
}
