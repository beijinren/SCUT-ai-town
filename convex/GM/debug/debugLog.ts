import { GMGuardDebugRecord, GMSpatialDebugRecord, GMWillingnessDebugRecord } from './debugTypes';

const guardRecords: GMGuardDebugRecord[] = [];
const spatialRecords: GMSpatialDebugRecord[] = [];
const willingnessRecords: GMWillingnessDebugRecord[] = [];

export function recordGuardDebug(record: GMGuardDebugRecord) {
  // 当前先保留内存版实现，后续可以平滑替换成数据库写入，
  // 调用方不需要因此改动接口。
  guardRecords.push(record);
  console.debug('[GM][guard]', record);
  return record;
}

export function recordSpatialDebug(record: GMSpatialDebugRecord) {
  spatialRecords.push(record);
  console.debug('[GM][spatial]', record);
  return record;
}

export function recordWillingnessDebug(record: GMWillingnessDebugRecord) {
  willingnessRecords.push(record);
  console.debug('[GM][willingness]', record);
  return record;
}

export function getGuardDebugRecords() {
  return [...guardRecords];
}

export function getLeakageDebugRecords() {
  return guardRecords.filter(
    (record) => record.decision === 'possible_leakage' || record.decision === 'clear_leakage',
  );
}

export function getSpatialDebugRecords() {
  return [...spatialRecords];
}

export function getWillingnessDebugRecords() {
  return [...willingnessRecords];
}

export function clearDebugRecords() {
  // 调试缓存必须和业务 memory 隔离，因此可以安全清空。
  guardRecords.length = 0;
  spatialRecords.length = 0;
  willingnessRecords.length = 0;
}
