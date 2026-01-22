declare module 'swagger-ui-react' {
  import { Component } from 'react';

  interface SwaggerUIProps {
    spec?: object;
    url?: string;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayOperationId?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    filter?: boolean | string;
    requestInterceptor?: (req: unknown) => unknown;
    responseInterceptor?: (res: unknown) => unknown;
  }

  export default class SwaggerUI extends Component<SwaggerUIProps> {}
}
