import { dump as yamlDump, load as yamlLoad } from "js-yaml";

function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys);
  }
  const sortedKeys = Object.keys(obj).sort();
  const result: any = {};
  for (const key of sortedKeys) {
    result[key] = sortObjectKeys(obj[key]);
  }
  return result;
}

export function normalizeDiffText(text: string, format: "yaml" | "json"): string {
  if (!text.trim()) return text;
  try {
    let parsed: any;
    if (format === "yaml") {
      parsed = yamlLoad(text);
    } else {
      parsed = JSON.parse(text);
    }
    
    if (typeof parsed !== "object" || parsed === null) {
      return text;
    }
    
    const sorted = sortObjectKeys(parsed);
    
    if (format === "yaml") {
      return yamlDump(sorted, { lineWidth: 100, noRefs: true });
    } else {
      return JSON.stringify(sorted, null, 2);
    }
  } catch (err) {
    // If it fails to parse, just return original text
    return text;
  }
}
