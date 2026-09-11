import { ClassRoom, Student, StudentScore, DisciplineRecord, GradeWeights, TeacherProfile } from '../types';

export interface SyncedAppData {
  teacher: TeacherProfile;
  classes: ClassRoom[];
  currentClassId?: string;
  semester?: 'HK1' | 'HK2';
  students: Student[];
  scores: StudentScore[];
  disciplines: DisciplineRecord[];
  weights: GradeWeights;
  lastUpdated?: number;
}

export interface SyncResponse {
  success: boolean;
  exists?: boolean;
  data?: SyncedAppData | null;
  lastUpdated?: number | null;
  updatedAt?: string | number | null;
  deviceId?: string | null;
  error?: string;
}

export function getDeviceId(): string {
  let id = localStorage.getItem('mathgrade_device_id');
  if (!id) {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const platform = isMobile ? 'Mobile' : 'Desktop';
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    id = `${platform}-${rand}`;
    localStorage.setItem('mathgrade_device_id', id);
  }
  return id;
}

export async function fetchServerData(): Promise<SyncResponse> {
  try {
    const res = await fetch('/api/sync', {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      throw new Error(`Máy chủ phản hồi lỗi: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.warn('Không thể kết nối đến máy chủ để đồng bộ:', err);
    return { success: false, error: err.message };
  }
}

export async function pushServerData(data: SyncedAppData): Promise<{ success: boolean; lastUpdated?: number; updatedAt?: string | number; error?: string }> {
  try {
    const deviceId = getDeviceId();
    const lastUpdated = data.lastUpdated || Date.now();
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data,
        lastUpdated,
        deviceId,
      }),
    });
    if (!res.ok) {
      throw new Error(`Máy chủ từ chối lưu: ${res.status}`);
    }
    const json = await res.json();
    return {
      ...json,
      updatedAt: json.lastUpdated || lastUpdated,
    };
  } catch (err: any) {
    console.error('Lỗi khi đẩy dữ liệu đồng bộ lên máy chủ:', err);
    return { success: false, error: err.message };
  }
}

export async function resetServerData(): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch('/api/sync/reset', {
      method: 'POST',
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function restoreDefaultServerData(): Promise<SyncResponse> {
  try {
    const res = await fetch('/api/sync/restore-default', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`Máy chủ báo lỗi khi khôi phục: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

