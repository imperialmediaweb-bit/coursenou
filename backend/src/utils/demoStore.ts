import fs from 'fs';
import path from 'path';

const STORE_FILE = path.join('/tmp', 'demo-courses.json');

// Load from file on startup
function loadStore(): Map<string, any> {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      return new Map(Object.entries(data));
    }
  } catch {}
  return new Map();
}

function saveStore(store: Map<string, any>): void {
  try {
    const obj = Object.fromEntries(store);
    fs.writeFileSync(STORE_FILE, JSON.stringify(obj), 'utf-8');
  } catch {}
}

const demoCourses = loadStore();

export function storeDemoCourse(course: any): void {
  demoCourses.set(course._id, course);
  if (demoCourses.size > 50) {
    const firstKey = demoCourses.keys().next().value;
    if (firstKey) demoCourses.delete(firstKey);
  }
  saveStore(demoCourses);
}

export function getDemoCourse(id: string): any | null {
  return demoCourses.get(id) || null;
}

export function getAllDemoCourses(userId: string): any[] {
  return Array.from(demoCourses.values()).filter((c) => c.userId === userId);
}

export function deleteDemoCourse(id: string): boolean {
  const result = demoCourses.delete(id);
  saveStore(demoCourses);
  return result;
}
