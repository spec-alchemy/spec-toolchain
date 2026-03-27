export {
  SEMANTIC_VALIDATION_VERSION,
  ANALYSIS_DIAGNOSTIC_CODES as SEMANTIC_DIAGNOSTIC_CODES,
  analyzeBusinessSpecSemantics,
  collectBusinessSpecSemanticDiagnostics,
  validateBusinessSpecSemantics,
  type AnalysisDiagnostic as SemanticDiagnostic,
  type AnalysisDiagnosticCode as SemanticDiagnosticCode,
  type SemanticValidationResult
} from "./business-spec-analysis.js";
