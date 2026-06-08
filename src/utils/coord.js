/**
 * WGS-84 ↔ GCJ-02 坐标转换
 * WGS-84：GPS 原始坐标（应用内存储的格式）
 * GCJ-02：高德/火星坐标系（高德地图瓦片使用）
 */

const pi = 3.1415926535897932384626
const a = 6378245.0 // 长半轴
const ee = 0.00669342162296594323 // 扁率

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * pi) + 40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * pi) + 320.0 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * pi) + 20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * pi) + 40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * pi) + 300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0
  return ret
}

/**
 * WGS-84 → GCJ-02 转换
 * @param {number} lat - WGS-84 纬度
 * @param {number} lng - WGS-84 经度
 * @returns {[number, number]} [gcjLat, gcjLng]
 */
export function wgs84ToGcj02(lat, lng) {
  // 不在中国境内，无需转换
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
    return [lat, lng]
  }

  const dLat = transformLat(lng - 105.0, lat - 35.0)
  const dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * pi
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  const mgLat = lat + (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * pi)
  const mgLng = lng + (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * pi)
  return [mgLat, mgLng]
}

/**
 * GCJ-02 → WGS-84 转换（迭代法，精度 ~0.5 米）
 * @param {number} lat - GCJ-02 纬度
 * @param {number} lng - GCJ-02 经度
 * @returns {[number, number]} [wgsLat, wgsLng]
 */
export function gcj02ToWgs84(lat, lng) {
  // 不在中国境内，无需转换
  if (lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271) {
    return [lat, lng]
  }

  let wgsLat = lat
  let wgsLng = lng
  for (let i = 0; i < 5; i++) {
    const [mgLat, mgLng] = wgs84ToGcj02(wgsLat, wgsLng)
    wgsLat += lat - mgLat
    wgsLng += lng - mgLng
  }
  return [wgsLat, wgsLng]
}
