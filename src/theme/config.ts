import fs from 'fs';
import path from 'path';

export interface ConfigField {
  type: 'color' | 'text' | 'select' | 'boolean' | 'image';
  label: string;
  default: string | boolean;
  options?: string[];
}

export interface ThemeManifest {
  name: string;
  version: string;
  engine: string;
  description: string;
  author: string;
  config: Record<string, Record<string, ConfigField>>;
}

export function loadManifest(themeDir: string): ThemeManifest {
  const raw = fs.readFileSync(path.join(themeDir, 'theme.json'), 'utf-8');
  return JSON.parse(raw) as ThemeManifest;
}

/** Returns merged config: theme.json defaults overridden by DB-stored values. */
export function resolveConfig(
  manifest: ThemeManifest,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [section, fields] of Object.entries(manifest.config ?? {})) {
    for (const [key, field] of Object.entries(fields)) {
      const flat = `${section}.${key}`;
      result[flat] = flat in overrides ? overrides[flat] : field.default;
    }
  }
  return result;
}

/** Returns resolved config as nested sections: { colors: { primary: '#...' }, layout: { ... } } */
export function resolveConfigNested(
  manifest: ThemeManifest,
  overrides: Record<string, unknown>,
): Record<string, Record<string, unknown>> {
  const result: Record<string, Record<string, unknown>> = {};
  for (const [section, fields] of Object.entries(manifest.config ?? {})) {
    result[section] = {};
    for (const [key, field] of Object.entries(fields)) {
      const flat = `${section}.${key}`;
      result[section][key] = flat in overrides ? overrides[flat] : field.default;
    }
  }
  return result;
}

/** Generates a <style> block injecting CSS custom properties from config. */
export function buildCssVars(resolved: Record<string, unknown>): string {
  const CSS_MAP: Record<string, string> = {
    'colors.primary':          '--color-primary',
    'colors.accent':           '--color-accent',
    'colors.background':       '--color-background',
    'colors.headerBackground': '--color-header',
    'colors.headerText':       '--color-header-text',
    'typography.headingFont':  '--font-heading',
  };

  const vars: string[] = [];
  for (const [key, cssVar] of Object.entries(CSS_MAP)) {
    if (key in resolved) {
      const val = key === 'typography.headingFont'
        ? `'${resolved[key]}', sans-serif`
        : String(resolved[key]);
      vars.push(`  ${cssVar}: ${val};`);
    }
  }

  return vars.length ? `<style>:root {\n${vars.join('\n')}\n}</style>` : '';
}
