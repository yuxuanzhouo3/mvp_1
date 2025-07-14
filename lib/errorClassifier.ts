export interface ErrorClassification {
  isTransient: boolean;
  category: 'network' | 'database' | 'authentication' | 'authorization' | 'validation' | 'rate_limit' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  suggestedAction: string;
}

export function classifyError(error: any): ErrorClassification {
  const classification: ErrorClassification = {
    isTransient: false,
    category: 'unknown',
    severity: 'medium',
    retryable: false,
    suggestedAction: 'Check logs for details'
  };

  // 网络错误
  if (isNetworkError(error)) {
    classification.isTransient = true;
    classification.category = 'network';
    classification.severity = 'medium';
    classification.retryable = true;
    classification.suggestedAction = 'Retry with exponential backoff';
    return classification;
  }

  // 数据库错误
  if (isDatabaseError(error)) {
    classification.isTransient = isTransientDatabaseError(error);
    classification.category = 'database';
    classification.severity = classification.isTransient ? 'medium' : 'high';
    classification.retryable = classification.isTransient;
    classification.suggestedAction = classification.isTransient 
      ? 'Retry after short delay' 
      : 'Check database configuration';
    return classification;
  }

  // 认证错误
  if (isAuthenticationError(error)) {
    classification.isTransient = false;
    classification.category = 'authentication';
    classification.severity = 'high';
    classification.retryable = false;
    classification.suggestedAction = 'Check API keys and authentication';
    return classification;
  }

  // 授权错误
  if (isAuthorizationError(error)) {
    classification.isTransient = false;
    classification.category = 'authorization';
    classification.severity = 'high';
    classification.retryable = false;
    classification.suggestedAction = 'Check user permissions and RLS policies';
    return classification;
  }

  // 验证错误
  if (isValidationError(error)) {
    classification.isTransient = false;
    classification.category = 'validation';
    classification.severity = 'low';
    classification.retryable = false;
    classification.suggestedAction = 'Fix input data format';
    return classification;
  }

  // 速率限制错误
  if (isRateLimitError(error)) {
    classification.isTransient = true;
    classification.category = 'rate_limit';
    classification.severity = 'medium';
    classification.retryable = true;
    classification.suggestedAction = 'Wait and retry with backoff';
    return classification;
  }

  // 服务器错误
  if (isServerError(error)) {
    classification.isTransient = isTransientServerError(error);
    classification.category = 'server';
    classification.severity = classification.isTransient ? 'medium' : 'critical';
    classification.retryable = classification.isTransient;
    classification.suggestedAction = classification.isTransient 
      ? 'Retry after delay' 
      : 'Contact system administrator';
    return classification;
  }

  return classification;
}

export function isTransientError(error: any): boolean {
  return classifyError(error).isTransient;
}

export function isRetryableError(error: any): boolean {
  return classifyError(error).retryable;
}

// 网络错误检测
function isNetworkError(error: any): boolean {
  const networkErrorCodes = [
    'ETIMEDOUT',
    'ECONNRESET', 
    'EPIPE',
    'ENETUNREACH',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'EREAD',
    'ENOTFOUND',
    'EHOSTUNREACH',
    'ENETDOWN'
  ];

  const networkErrorMessages = [
    'timeout',
    'connection',
    'network',
    'unreachable',
    'refused',
    'dns',
    'host'
  ];

  return (
    (error.code && networkErrorCodes.includes(error.code)) ||
    (error.message && networkErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

// 数据库错误检测
function isDatabaseError(error: any): boolean {
  const dbErrorCodes = [
    'PGRST301', 'PGRST302', 'PGRST303', 'PGRST304', 'PGRST305',
    '23505', // unique_violation
    '23503', // foreign_key_violation
    '23502', // not_null_violation
    '42P01', // undefined_table
    '42703', // undefined_column
    '42601', // syntax_error
    '28000', // invalid_authorization_specification
    '28P01', // invalid_password
    '3D000', // invalid_catalog_name
    '3F000', // invalid_schema_name
  ];

  const dbErrorMessages = [
    'database',
    'postgres',
    'supabase',
    'connection',
    'query',
    'sql'
  ];

  return (
    (error.code && dbErrorCodes.includes(error.code)) ||
    (error.message && dbErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

function isTransientDatabaseError(error: any): boolean {
  const transientDbCodes = [
    'PGRST301', // Connection timeout
    'PGRST302', // Connection refused
    'PGRST303', // Network error
    'PGRST304', // Server error
    'PGRST305', // Service unavailable
    '08000', // connection_exception
    '08003', // connection_does_not_exist
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
    '08007', // connection_failure_during_transaction
    '08P01', // protocol_violation
  ];

  return error.code && transientDbCodes.includes(error.code);
}

// 认证错误检测
function isAuthenticationError(error: any): boolean {
  const authErrorCodes = [
    '401',
    'UNAUTHORIZED',
    'INVALID_API_KEY',
    'INVALID_CREDENTIALS'
  ];

  const authErrorMessages = [
    'unauthorized',
    'invalid api key',
    'invalid credentials',
    'authentication failed',
    'token expired',
    'invalid token'
  ];

  return (
    (error.status === 401) ||
    (error.code && authErrorCodes.includes(error.code)) ||
    (error.message && authErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

// 授权错误检测
function isAuthorizationError(error: any): boolean {
  const authzErrorCodes = [
    '403',
    'FORBIDDEN',
    'PERMISSION_DENIED',
    'INSUFFICIENT_PERMISSIONS'
  ];

  const authzErrorMessages = [
    'forbidden',
    'permission denied',
    'insufficient permissions',
    'access denied',
    'policy violation',
    'row level security'
  ];

  return (
    (error.status === 403) ||
    (error.code && authzErrorCodes.includes(error.code)) ||
    (error.message && authzErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

// 验证错误检测
function isValidationError(error: any): boolean {
  const validationErrorCodes = [
    '400',
    'VALIDATION_ERROR',
    'INVALID_INPUT',
    'BAD_REQUEST'
  ];

  const validationErrorMessages = [
    'validation',
    'invalid input',
    'bad request',
    'malformed',
    'required field',
    'type error'
  ];

  return (
    (error.status === 400) ||
    (error.code && validationErrorCodes.includes(error.code)) ||
    (error.message && validationErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

// 速率限制错误检测
function isRateLimitError(error: any): boolean {
  const rateLimitErrorCodes = [
    '429',
    'RATE_LIMIT_EXCEEDED',
    'TOO_MANY_REQUESTS'
  ];

  const rateLimitErrorMessages = [
    'rate limit',
    'too many requests',
    'quota exceeded',
    'throttled'
  ];

  return (
    (error.status === 429) ||
    (error.code && rateLimitErrorCodes.includes(error.code)) ||
    (error.message && rateLimitErrorMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    ))
  );
}

// 服务器错误检测
function isServerError(error: any): boolean {
  return error.status >= 500 || error.statusCode >= 500;
}

function isTransientServerError(error: any): boolean {
  const transientServerCodes = [502, 503, 504];
  return transientServerCodes.includes(error.status) || transientServerCodes.includes(error.statusCode);
}

// 错误严重性评估
export function assessErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  const classification = classifyError(error);
  
  // 认证和授权错误通常是高严重性
  if (classification.category === 'authentication' || classification.category === 'authorization') {
    return 'high';
  }

  // 数据库连接错误在关键路径上是高严重性
  if (classification.category === 'database' && !classification.isTransient) {
    return 'high';
  }

  // 服务器错误可能是临时的
  if (classification.category === 'server' && classification.isTransient) {
    return 'medium';
  }

  // 网络错误通常是临时的
  if (classification.category === 'network') {
    return 'medium';
  }

  // 验证错误通常是低严重性
  if (classification.category === 'validation') {
    return 'low';
  }

  // 速率限制错误是中等严重性
  if (classification.category === 'rate_limit') {
    return 'medium';
  }

  return 'medium';
}

// 获取错误建议操作
export function getErrorSuggestion(error: any): string {
  const classification = classifyError(error);
  return classification.suggestedAction;
}

// 错误日志格式化
export function formatErrorForLogging(error: any): object {
  const classification = classifyError(error);
  
  return {
    message: error.message || 'Unknown error',
    code: error.code || error.status || 'UNKNOWN',
    category: classification.category,
    severity: classification.severity,
    isTransient: classification.isTransient,
    retryable: classification.retryable,
    suggestion: classification.suggestedAction,
    timestamp: new Date().toISOString(),
    stack: error.stack
  };
} 