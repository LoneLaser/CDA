// Copyright (c) 2026 Justin Glaser. All rights reserved.
// Use of this source code is governed by a license that can be
// found in the LICENSE file in the root of this repository.

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParseResult {
  rows: Record<string, unknown>[];
  columns: string[];
  errors: string[];
}

export function parseFile(file: File): Promise<ParseResult> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'json') return parseJSON(file);
  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') return parseCSV(file, ext === 'tsv' ? '\t' : ',');
  if (ext === 'xlsx' || ext === 'xls') return parseExcel(file);
  return Promise.reject(new Error(`Unsupported file type: .${ext}`));
}

function parseCSV(file: File, delimiter: string): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter,
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      complete(results) {
        const columns = results.meta.fields ?? [];
        const errors = results.errors.map(
          (e) => `Row ${e.row ?? '?'}: ${e.message}`
        );
        resolve({
          rows: results.data as Record<string, unknown>[],
          columns,
          errors,
        });
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

async function parseJSON(file: File): Promise<ParseResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file');
  }

  let rows: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    rows = parsed.filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object');
  } else if (typeof parsed === 'object' && parsed !== null) {
    // Try to find the first array property
    const arrayProp = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    if (arrayProp) {
      rows = (arrayProp as unknown[]).filter(
        (r): r is Record<string, unknown> => r !== null && typeof r === 'object'
      );
    } else {
      rows = [parsed as Record<string, unknown>];
    }
  } else {
    throw new Error('JSON must contain an array of objects');
  }

  if (rows.length === 0) throw new Error('No data rows found in JSON');

  // Collect all unique keys
  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) columnSet.add(key);
  }

  return {
    rows,
    columns: Array.from(columnSet),
    errors: [],
  };
}

async function parseExcel(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Excel file contains no sheets');

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) throw new Error('No data rows found in Excel file');

  const columnSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) columnSet.add(key);
  }

  const errors: string[] = [];
  if (workbook.SheetNames.length > 1) {
    errors.push(`Only the first sheet ("${sheetName}") was imported. ${workbook.SheetNames.length - 1} additional sheet(s) were skipped.`);
  }

  return {
    rows,
    columns: Array.from(columnSet),
    errors,
  };
}
