export {
  VNEXT_SEMANTIC_VALIDATION_VERSION,
  VNEXT_ANALYSIS_DIAGNOSTIC_CODES as VNEXT_SEMANTIC_DIAGNOSTIC_CODES,
  analyzeVnextBusinessSpecSemantics,
  collectVnextBusinessSpecSemanticDiagnostics,
  validateVnextBusinessSpecSemantics,
  type VnextAnalysisDiagnostic as VnextSemanticDiagnostic,
  type VnextAnalysisDiagnosticCode as VnextSemanticDiagnosticCode,
  type VnextSemanticValidationResult
} from "./vnext-analysis.js";
