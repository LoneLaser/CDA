// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import type { CrosswalkMapping } from '../components/pipeline/CrosswalkEditor';
import type { ColumnMeta, ColumnType } from '../types';

/**
 * Applies crosswalk mappings to rename columns and retype data.
 * Called between Bronze and Silver stages.
 */
export function applyCrosswalk(
  rows: Record<string, unknown>[],
  columns: ColumnMeta[],
  mappings: CrosswalkMapping[],
): { rows: Record<string, unknown>[]; columns: ColumnMeta[] } {
  // Build lookup from original name → mapping
  const mappingByOrig = new Map(mappings.map((m) => [m.originalName, m]));

  // Filter to only changed mappings
  const hasChanges = mappings.some(
    (m) => m.originalName !== m.newName || m.originalType !== m.newType,
  );

  if (!hasChanges) return { rows, columns };

  // Apply column renaming & retyping to metadata
  const newColumns: ColumnMeta[] = [];
  for (const col of columns) {
    const mapping = mappingByOrig.get(col.name);
    if (mapping) {
      newColumns.push({ ...col, name: mapping.newName, type: mapping.newType });
      if (mapping.keepOriginal) {
        newColumns.push({ ...col, name: `${mapping.originalName}_original`, type: col.type });
      }
    } else {
      newColumns.push(col);
    }
  }

  // Apply renaming & type coercion to rows
  const newRows = rows.map((row) => {
    const newRow: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      const mapping = mappingByOrig.get(key);
      if (mapping) {
        if (mapping.valueMap && mapping.newType === 'number') {
          const strVal = val !== null && val !== undefined ? String(val) : null;
          newRow[mapping.newName] =
            strVal !== null && Object.prototype.hasOwnProperty.call(mapping.valueMap, strVal)
              ? mapping.valueMap[strVal]
              : null;
        } else {
          newRow[mapping.newName] = coerceValue(val, mapping.newType);
        }
        if (mapping.keepOriginal) {
          newRow[`${mapping.originalName}_original`] = val;
        }
      } else {
        newRow[key] = val;
      }
    }
    return newRow;
  });

  return { rows: newRows, columns: newColumns };
}

function coerceValue(val: unknown, targetType: ColumnType): unknown {
  if (val === null || val === undefined) return val;

  switch (targetType) {
    case 'number': {
      const n = Number(val);
      return isFinite(n) ? n : null;
    }
    case 'boolean': {
      if (typeof val === 'boolean') return val;
      const s = String(val).toLowerCase().trim();
      if (['true', '1', 'yes', 'y'].includes(s)) return true;
      if (['false', '0', 'no', 'n'].includes(s)) return false;
      return null;
    }
    case 'date': {
      if (val instanceof Date) return val.toISOString();
      const d = new Date(String(val));
      return isNaN(d.getTime()) ? String(val) : d.toISOString();
    }
    case 'string':
      return String(val);
    default:
      return val;
  }
}
