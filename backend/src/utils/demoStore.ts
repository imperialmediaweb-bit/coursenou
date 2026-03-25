// In-memory store for demo courses (no database needed)
const demoCourses = new Map<string, any>();

export function storeDemoCourse(course: any): void {
  demoCourses.set(course._id, course);
  // Keep max 20 demo courses in memory
  if (demoCourses.size > 20) {
    const firstKey = demoCourses.keys().next().value;
    if (firstKey) demoCourses.delete(firstKey);
  }
}

export function getDemoCourse(id: string): any | null {
  return demoCourses.get(id) || null;
}

export function getAllDemoCourses(userId: string): any[] {
  return Array.from(demoCourses.values()).filter((c) => c.userId === userId);
}

export function deleteDemoCourse(id: string): boolean {
  return demoCourses.delete(id);
}
