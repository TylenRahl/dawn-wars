// THE PLAYER'S SAVED MAPS, in this browser (made in map-editor.html). What a map is lives in
// rules/customMaps.js; this is the one place that touches localStorage, so every access is in a try/catch (a private
// window or a full disk throws). Used by src/main.js (loadCustomMaps) and the map editor (src/mapEditor/mapEditor.js).
import { validateRecord, featuresOf } from '../rules/customMaps.js'
import { setCustomMaps } from '../rules/maps.js'

export const CUSTOM_MAPS_KEY = 'dw.customMaps'

export function listCustomRecords () {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(CUSTOM_MAPS_KEY) ?? '[]')
    return (Array.isArray(raw) ? raw : []).map(one => validateRecord(one).record).filter(Boolean)
  } catch { return [] }
}
function writeAll (records) {
  try { globalThis.localStorage.setItem(CUSTOM_MAPS_KEY, JSON.stringify(records)); return true } catch { return false }
}
// read what is saved and give it to maps.js (MAPS), so the setup screen and a battle find it
export function loadCustomMaps () {
  const records = listCustomRecords()
  setCustomMaps(records, featuresOf)
  return records
}
export function saveCustomRecord (record) {
  const { record: clean } = validateRecord(record)
  if (!clean) return false
  const rest = listCustomRecords()
  const at = rest.findIndex(one => one.id === clean.id)
  if (at >= 0) rest[at] = clean; else rest.push(clean)
  const ok = writeAll(rest)
  loadCustomMaps()
  return ok
}
export function deleteCustomRecord (id) {
  const ok = writeAll(listCustomRecords().filter(one => one.id !== id))
  loadCustomMaps()
  return ok
}
