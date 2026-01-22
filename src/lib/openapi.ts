import yaml from 'js-yaml';

export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, unknown>;
  [key: string]: unknown;
}

export function isOpenAPIExtension(path: string): boolean {
  const ext = path.split('.').pop()?.toLowerCase();
  return ['yaml', 'yml', 'json'].includes(ext || '');
}

export function parseOpenAPIContent(content: string, path: string): OpenAPISpec | null {
  const ext = path.split('.').pop()?.toLowerCase();

  try {
    let parsed: unknown;

    if (ext === 'json') {
      parsed = JSON.parse(content);
    } else {
      parsed = yaml.load(content);
    }

    if (isValidOpenAPISpec(parsed)) {
      return parsed as OpenAPISpec;
    }

    return null;
  } catch {
    return null;
  }
}

function isValidOpenAPISpec(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;

  const spec = obj as Record<string, unknown>;

  const hasOpenAPIKey = typeof spec.openapi === 'string' && spec.openapi.startsWith('3');
  const hasSwaggerKey = typeof spec.swagger === 'string' && spec.swagger.startsWith('2');

  if (!hasOpenAPIKey && !hasSwaggerKey) return false;

  const hasInfo = spec.info && typeof spec.info === 'object';
  const hasPaths = spec.paths && typeof spec.paths === 'object';

  return !!(hasInfo || hasPaths);
}
