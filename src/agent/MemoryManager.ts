import { MemoryEntry } from "../types/agent";
import { v4 as uuidv4 } from "uuid";

export class MemoryManager {
  private shortTerm: Map<string, any> = new Map();
  private longTerm: MemoryEntry[] = [];

  set(key: string, value: any, importance: number = 1) {
    this.shortTerm.set(key, value);
    this.longTerm.push({
      id: uuidv4(),
      key,
      value,
      timestamp: Date.now(),
      importance
    });
    
    // Sort by importance and timestamp, keep top 100
    this.longTerm.sort((a, b) => b.importance - a.importance || b.timestamp - a.timestamp);
    if (this.longTerm.length > 100) {
      this.longTerm = this.longTerm.slice(0, 100);
    }
  }

  get(key: string) {
    return this.shortTerm.get(key);
  }

  search(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.longTerm.filter(entry => 
      entry.key.toLowerCase().includes(lowerQuery) || 
      JSON.stringify(entry.value).toLowerCase().includes(lowerQuery)
    );
  }

  getAllContext(): Record<string, any> {
    return Object.fromEntries(this.shortTerm);
  }

  getMemorySize(): number {
    return this.longTerm.length;
  }

  clear() {
    this.shortTerm.clear();
    this.longTerm = [];
  }
}
