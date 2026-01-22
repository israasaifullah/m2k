import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import type { OpenAPISpec } from '../lib/openapi';

interface SwaggerPreviewProps {
  spec: OpenAPISpec;
  fileName: string;
}

export function SwaggerPreview({ spec, fileName }: SwaggerPreviewProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-2 pt-1 pb-[2.5px] border-b border-[var(--geist-accents-2)] bg-[var(--geist-accents-1)]">
        <span className="text-xs text-[var(--geist-accents-4)] truncate">{fileName}</span>
        <span className="text-xs text-[var(--monokai-cyan)]">OpenAPI</span>
      </div>
      <div className="flex-1 min-h-0 overflow-auto bg-white">
        <SwaggerUI
          spec={spec}
          docExpansion="list"
          defaultModelsExpandDepth={-1}
          defaultModelExpandDepth={1}
        />
      </div>
    </div>
  );
}
