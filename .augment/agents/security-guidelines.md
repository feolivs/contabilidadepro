---
type: "agent_requested"
description: "Example description"
---

# ContabilidadePRO - Security Guidelines

## Overview
This document establishes comprehensive security guidelines for the ContabilidadePRO platform, ensuring the protection of sensitive financial data, compliance with Brazilian regulations (LGPD), and maintaining the highest security standards for accounting operations.

## Security Architecture

### Defense in Depth Strategy
```
┌─────────────────────────────────────────────────────────────┐
│                     Security Layers                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Edge Security (CDN, WAF, DDoS Protection)              │
│ 2. Application Security (Input Validation, CSRF, XSS)      │
│ 3. Authentication & Authorization (JWT, MFA, RBAC)         │
│ 4. API Security (Rate Limiting, Encryption, Monitoring)    │
│ 5. Database Security (RLS, Encryption at Rest, Audit)      │
│ 6. Infrastructure Security (Network, VPC, Monitoring)      │
│ 7. Data Security (Classification, Encryption, Backup)      │
└─────────────────────────────────────────────────────────────┘
```

## Data Classification & Protection

### Data Classification Matrix
```typescript
interface DataClassification {
  // CONFIDENCIAL - Highest protection level
  confidencial: {
    examples: ['senhas', 'chaves_api', 'tokens_acesso', 'dados_bancarios'];
    encryption: 'AES-256 + field-level encryption';
    access: 'system_only';
    retention: 'immediate_deletion_after_use';
    logging: 'access_only_no_content';
  };
  
  // RESTRITO - High protection level  
  restrito: {
    examples: ['cpf', 'cnpj', 'receitas', 'lucros', 'calculos_impostos'];
    encryption: 'AES-256 + database encryption';
    access: 'owner_and_authorized_users';
    retention: '7_years_tax_compliance';
    logging: 'full_audit_trail';
  };
  
  // INTERNO - Medium protection level
  interno: {
    examples: ['nomes_empresas', 'enderecos', 'telefones', 'emails'];
    encryption: 'database_encryption';
    access: 'authenticated_users';
    retention: 'business_need_basis';
    logging: 'access_and_modifications';
  };
  
  // PÚBLICO - Low protection level
  publico: {
    examples: ['documentacao', 'precos', 'termos_servico'];
    encryption: 'transport_only';
    access: 'public';
    retention: 'indefinite';
    logging: 'statistical_only';
  };
}
```

### Encryption Standards

#### Data at Rest
```typescript
interface EncryptionAtRest {
  database: {
    algorithm: 'AES-256-GCM';
    keyManagement: 'Supabase Vault + AWS KMS';
    keyRotation: 'automatic_90_days';
    backup: 'encrypted_with_separate_keys';
  };
  
  fileStorage: {
    algorithm: 'AES-256';
    keyManagement: 'Supabase Storage encryption';
    accessControl: 'signed_urls_with_expiration';
    scanning: 'malware_detection_enabled';
  };
  
  fieldLevel: {
    sensitiveFields: ['cpf', 'cnpj', 'dados_bancarios', 'senhas'];
    algorithm: 'AES-256-GCM';
    implementation: 'application_layer_encryption';
    keyDerivation: 'PBKDF2_100000_iterations';
  };
}
```

#### Data in Transit
```typescript
interface EncryptionInTransit {
  webTraffic: {
    protocol: 'TLS 1.3';
    cipherSuites: ['TLS_AES_256_GCM_SHA384', 'TLS_CHACHA20_POLY1305_SHA256'];
    hsts: 'max-age=31536000; includeSubDomains; preload';
    certificateValidation: 'OSCP_stapling_enabled';
  };
  
  apiCommunication: {
    internalAPIs: 'mTLS_with_certificate_pinning';
    externalAPIs: 'TLS_1.3_minimum';
    payloadEncryption: 'end_to_end_for_sensitive_data';
    integrityChecks: 'HMAC_SHA256_signatures';
  };
  
  databaseConnections: {
    protocol: 'TLS_1.3';
    authentication: 'certificate_based';
    connectionPooling: 'encrypted_connections_only';
    monitoring: 'connection_anomaly_detection';
  };
}
```

## Authentication & Authorization

### Multi-Factor Authentication (MFA)
```typescript
interface MFAConfiguration {
  required: {
    adminUsers: true;
    accountants: true;
    clientAccess: false; // Optional but recommended
  };
  
  methods: {
    totp: {
      provider: 'Google Authenticator, Authy';
      backupCodes: 'generated_and_encrypted';
      qrCodeGeneration: 'server_side_only';
    };
    
    sms: {
      provider: 'Twilio_with_Brazilian_numbers';
      rateLimiting: 'max_3_attempts_per_hour';
      verification: 'time_limited_codes';
    };
    
    email: {
      fallback: true;
      linkExpiration: '15_minutes';
      singleUse: true;
    };
  };
  
  enforcement: {
    gracePeriod: '30_days_after_implementation';
    bypassEmergency: 'admin_approval_required';
    deviceRemembering: 'max_30_days';
  };
}
```

### Role-Based Access Control (RBAC)
```typescript
interface RoleDefinitions {
  superAdmin: {
    permissions: ['*'];
    restrictions: ['cannot_access_client_data_directly'];
    mfaRequired: true;
    sessionTimeout: '2_hours';
  };
  
  admin: {
    permissions: ['user_management', 'system_configuration', 'audit_access'];
    restrictions: ['no_direct_financial_data_access'];
    mfaRequired: true;
    sessionTimeout: '4_hours';
  };
  
  accountant: {
    permissions: ['client_management', 'document_processing', 'tax_calculations', 'report_generation'];
    restrictions: ['own_clients_only', 'no_system_configuration'];
    mfaRequired: true;
    sessionTimeout: '8_hours';
  };
  
  clientReadOnly: {
    permissions: ['view_own_data', 'download_reports'];
    restrictions: ['no_modifications', 'specific_company_only'];
    mfaRequired: false;
    sessionTimeout: '1_hour';
  };
}
```

### Session Management
```typescript
interface SessionSecurity {
  jwtConfiguration: {
    algorithm: 'RS256';
    keyRotation: 'every_24_hours';
    issuer: 'contabilidadepro.com';
    audience: 'contabilidadepro_app';
    expiration: 'role_based_timeout';
    refreshToken: {
      rotation: true;
      familyTracking: true;
      reuseDetection: 'invalidate_all_tokens';
    };
  };
  
  sessionMonitoring: {
    concurrentSessions: 'max_3_per_user';
    anomalyDetection: 'ip_change_location_velocity';
    deviceFingerprinting: 'browser_canvas_webgl_audio';
    suspiciousActivity: 'automatic_logout_and_alert';
  };
  
  securityHeaders: {
    contentSecurityPolicy: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
    xFrameOptions: 'DENY';
    xContentTypeOptions: 'nosniff';
    referrerPolicy: 'strict-origin-when-cross-origin';
    permissionsPolicy: 'camera=(), microphone=(), geolocation=()';
  };
}
```

## Input Validation & Sanitization

### Validation Framework
```typescript
interface InputValidation {
  financialData: {
    valores: {
      type: 'decimal';
      precision: 15;
      scale: 2;
      min: 0;
      max: 999999999999.99;
      sanitization: 'remove_non_numeric_except_decimal';
    };
    
    cnpj: {
      pattern: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
      validation: 'checksum_algorithm';
      sanitization: 'format_standardization';
    };
    
    cpf: {
      pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
      validation: 'checksum_algorithm';
      sanitization: 'format_standardization';
      masking: 'display_only_last_4_digits';
    };
  };
  
  textInputs: {
    maxLength: 1000;
    allowedCharacters: 'alphanumeric_plus_brazilian_chars';
    sanitization: 'html_entity_encoding';
    blacklist: ['script', 'iframe', 'object', 'embed'];
  };
  
  fileUploads: {
    allowedTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/xml'];
    maxSize: '10MB';
    virusScanning: 'clamav_integration';
    contentValidation: 'mime_type_verification';
    quarantine: 'suspicious_files_isolated';
  };
}
```

### SQL Injection Prevention
```typescript
interface SQLSecurity {
  parameterizedQueries: {
    enforcement: 'mandatory_prepared_statements';
    noRawSQL: 'eslint_rule_enforcement';
    supabaseRLS: 'row_level_security_mandatory';
  };
  
  queryValidation: {
    whitelistApproach: 'predefined_query_patterns';
    inputSanitization: 'escape_all_user_inputs';
    limitClauses: 'mandatory_result_set_limits';
  };
  
  databasePermissions: {
    applicationUser: 'minimal_required_permissions';
    noAdminAccess: 'application_cannot_modify_schema';
    connectionLimits: 'max_connections_per_service';
  };
}
```

## API Security

### Rate Limiting & DDoS Protection
```typescript
interface APISecurityMeasures {
  rateLimiting: {
    globalLimits: {
      requestsPerMinute: 1000;
      requestsPerHour: 10000;
      implementation: 'token_bucket_algorithm';
    };
    
    endpointSpecific: {
      '/functions/v1/chat': '60_requests_per_minute_per_user';
      '/functions/v1/process-document': '10_requests_per_minute_per_user';
      '/functions/v1/calculate-tax': '30_requests_per_minute_per_user';
      '/auth/login': '5_attempts_per_minute_per_ip';
    };
    
    enforcement: {
      throttling: 'gradual_delay_increase';
      blocking: 'temporary_ip_ban_for_abuse';
      alerting: 'security_team_notification';
    };
  };
  
  ddosProtection: {
    cloudflare: {
      ddosProtection: true;
      wafRules: 'custom_brazilian_tax_patterns';
      botManagement: 'challenge_suspicious_requests';
      rateLimiting: 'geographic_and_behavioral';
    };
    
    applicationLevel: {
      requestQueuing: 'priority_based_processing';
      gracefulDegradation: 'read_only_mode_during_attack';
      autoscaling: 'automatic_resource_scaling';
    };
  };
}
```

### API Key Management
```typescript
interface APIKeyManagement {
  generation: {
    algorithm: 'crypto_secure_random';
    length: '256_bits_minimum';
    format: 'base64_encoded';
    prefix: 'cp_live_' | 'cp_test_';
  };
  
  rotation: {
    schedule: 'automatic_every_90_days';
    gracePeriod: '7_days_dual_key_support';
    notification: '30_day_advance_warning';
    emergencyRotation: 'immediate_for_compromise';
  };
  
  storage: {
    encryption: 'envelope_encryption_with_kms';
    access: 'need_to_know_basis';
    auditing: 'all_access_logged';
    backup: 'encrypted_offsite_storage';
  };
  
  monitoring: {
    unusualUsage: 'geographic_time_pattern_analysis';
    leakageDetection: 'github_secret_scanning';
    revokeCapability: 'immediate_key_invalidation';
  };
}
```

## Database Security

### Row Level Security (RLS) Implementation
```sql
-- Example RLS policies for sensitive data
CREATE POLICY "Users can only access their own companies" ON empresas
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Accountants can only access their clients' transactions" ON transacoes
  FOR ALL USING (
    empresa_id IN (
      SELECT id FROM empresas WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Audit logs are read-only for non-admins" ON audit_logs
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin' OR
    user_id = auth.uid()
  );

-- Sensitive data masking for non-owners
CREATE POLICY "Mask sensitive data for viewers" ON empresas
  FOR SELECT USING (
    CASE 
      WHEN user_id = auth.uid() THEN true
      WHEN auth.jwt() ->> 'role' = 'viewer' THEN (
        -- Mask sensitive fields in SELECT
        SELECT set_config('app.mask_sensitive', 'true', true) IS NOT NULL
      )
      ELSE false
    END
  );
```

### Database Monitoring & Auditing
```typescript
interface DatabaseSecurity {
  auditLogging: {
    allDataAccess: true;
    sensitiveOperations: 'detailed_logging';
    retentionPeriod: '7_years_compliance';
    tamperProtection: 'cryptographic_signatures';
  };
  
  queryMonitoring: {
    slowQueries: 'performance_and_security_analysis';
    unusualPatterns: 'ml_based_anomaly_detection';
    massDataAccess: 'immediate_alert_for_bulk_operations';
    failedQueries: 'potential_injection_attempt_detection';
  };
  
  backupSecurity: {
    encryption: 'separate_encryption_keys';
    frequency: 'continuous_with_point_in_time_recovery';
    testing: 'monthly_restore_verification';
    offsite: 'geographically_distributed_copies';
  };
  
  accessControl: {
    minimumPrivilege: 'role_based_database_users';
    connectionSecurity: 'certificate_based_authentication';
    networkIsolation: 'vpc_private_subnets_only';
    monitoring: 'real_time_connection_analysis';
  };
}
```

## Compliance & Regulatory Requirements

### LGPD (Lei Geral de Proteção de Dados) Compliance
```typescript
interface LGPDCompliance {
  dataProcessingBases: {
    consent: 'explicit_informed_consent_for_marketing';
    contractPerformance: 'accounting_services_delivery';
    legalObligation: 'tax_compliance_requirements';
    legitimateInterest: 'fraud_prevention_security';
  };
  
  dataSubjectRights: {
    access: 'self_service_data_export_portal';
    rectification: 'user_controlled_profile_updates';
    erasure: 'right_to_be_forgotten_implementation';
    portability: 'standardized_data_export_formats';
    objection: 'opt_out_mechanisms';
  };
  
  technicalMeasures: {
    dataMinimization: 'collect_only_necessary_data';
    purposeLimitation: 'use_data_only_for_stated_purposes';
    accuracyEnsurance: 'regular_data_quality_checks';
    storageTimeLimits: 'automated_data_retention_policies';
  };
  
  organizationalMeasures: {
    dpoDesignation: 'data_protection_officer_appointed';
    privacyByDesign: 'privacy_impact_assessments';
    employeeTraining: 'regular_privacy_awareness_training';
    vendorContracts: 'data_processing_agreements';
  };
}
```

### Financial Data Compliance
```typescript
interface FinancialCompliance {
  dataRetention: {
    taxRecords: '5_years_minimum_brazil_requirement';
    auditTrails: '7_years_corporate_compliance';
    transactionLogs: '10_years_banking_regulation';
    userActivity: '3_years_security_analysis';
  };
  
  accessLogging: {
    financialData: 'comprehensive_audit_trail';
    calculationResults: 'tamper_proof_logging';
    reportGeneration: 'user_attribution_tracking';
    dataExports: 'detailed_access_records';
  };
  
  integrityVerification: {
    checksums: 'cryptographic_hash_verification';
    digitalSignatures: 'non_repudiation_mechanisms';
    timestamping: 'trusted_timestamp_authorities';
    versionControl: 'immutable_change_history';
  };
}
```

## Incident Response & Security Monitoring

### Security Incident Response Plan
```typescript
interface IncidentResponse {
  detectionSources: {
    automated: ['waf_alerts', 'anomaly_detection', 'failed_login_patterns'];
    manual: ['user_reports', 'security_audits', 'penetration_tests'];
    external: ['threat_intelligence', 'vulnerability_disclosures'];
  };
  
  responseTeam: {
    primary: 'security_lead_24_7_availability';
    secondary: 'development_team_escalation';
    external: 'cyber_security_consultant_on_retainer';
    legal: 'privacy_lawyer_for_data_breaches';
  };
  
  responseSteps: {
    immediate: {
      '0-15min': 'assess_scope_and_contain_threat';
      '15-30min': 'notify_stakeholders_and_preserve_evidence';
      '30-60min': 'implement_temporary_mitigations';
    };
    
    shortTerm: {
      '1-4hours': 'detailed_investigation_and_analysis';
      '4-8hours': 'implement_permanent_fixes';
      '8-24hours': 'verify_remediation_and_monitor';
    };
    
    longTerm: {
      '1-3days': 'post_incident_review_and_documentation';
      '3-7days': 'improve_security_controls';
      '1-4weeks': 'update_procedures_and_training';
    };
  };
  
  notification: {
    users: 'transparent_communication_within_72_hours';
    authorities: 'anpd_notification_if_high_risk';
    partners: 'api_customers_for_service_impact';
    media: 'public_statement_for_major_incidents';
  };
}
```

### Continuous Security Monitoring
```typescript
interface SecurityMonitoring {
  realTimeAlerts: {
    authentication: {
      failedLogins: 'threshold_5_attempts_per_minute';
      suspiciousPatterns: 'geographical_impossibility';
      privilegeEscalation: 'role_change_attempts';
    };
    
    dataAccess: {
      massDownloads: 'bulk_data_export_detection';
      sensitiveQueries: 'financial_data_access_patterns';
      offHoursActivity: 'unusual_time_access_detection';
    };
    
    infrastructure: {
      resourceUsage: 'ddos_attack_indicators';
      networkTraffic: 'data_exfiltration_patterns';
      systemChanges: 'unauthorized_configuration_modifications';
    };
  };
  
  securityMetrics: {
    kpis: {
      meanTimeToDetect: 'target_under_5_minutes';
      meanTimeToRespond: 'target_under_30_minutes';
      falsePositiveRate: 'target_under_5_percent';
      securityAwareness: 'monthly_phishing_simulation_results';
    };
    
    reporting: {
      dailyDashboard: 'security_operations_center_view';
      weeklyReports: 'trend_analysis_and_recommendations';
      monthlyReviews: 'executive_security_posture_summary';
      quarterlyAssessments: 'comprehensive_security_audit';
    };
  };
}
```

## Security Training & Awareness

### Employee Security Training
```typescript
interface SecurityTraining {
  onboarding: {
    duration: '4_hours_mandatory_training';
    topics: ['data_protection', 'password_security', 'phishing_recognition', 'incident_reporting'];
    certification: 'required_passing_score_80_percent';
    retesting: 'annual_refresher_training';
  };
  
  roleSpecific: {
    developers: ['secure_coding', 'threat_modeling', 'security_testing'];
    administrators: ['access_management', 'system_hardening', 'monitoring'];
    support: ['social_engineering_recognition', 'data_handling', 'escalation_procedures'];
  };
  
  ongoingAwareness: {
    phishingSimulations: 'monthly_targeted_campaigns';
    securityTips: 'weekly_security_awareness_emails';
    incidentLessons: 'post_incident_learning_sessions';
    industryUpdates: 'quarterly_threat_landscape_briefings';
  };
}
```

### Vendor Security Requirements
```typescript
interface VendorSecurity {
  assessment: {
    initialEvaluation: 'security_questionnaire_and_audit';
    ongoingMonitoring: 'annual_security_reviews';
    riskClassification: 'based_on_data_access_level';
  };
  
  contractualRequirements: {
    dataProtection: 'lgpd_compliance_mandatory';
    securityStandards: 'iso27001_or_equivalent';
    incidentNotification: 'within_24_hours';
    auditRights: 'annual_security_audit_access';
  };
  
  monitoring: {
    securityAlerts: 'vendor_security_incident_tracking';
    performanceMetrics: 'security_sla_monitoring';
    complianceStatus: 'ongoing_certification_verification';
  };
}
```

## Security Testing & Validation

### Regular Security Assessments
```typescript
interface SecurityTesting {
  penetrationTesting: {
    frequency: 'quarterly_external_testing';
    scope: 'complete_application_and_infrastructure';
    methodology: 'owasp_testing_guide_compliance';
    reporting: 'detailed_remediation_roadmap';
  };
  
  vulnerabilityScanning: {
    automated: 'daily_dependency_vulnerability_scans';
    manual: 'weekly_code_security_reviews';
    infrastructure: 'monthly_network_security_scans';
    web: 'continuous_application_security_scanning';
  };
  
  codeAnalysis: {
    static: 'sonarqube_security_rules_enforcement';
    dynamic: 'runtime_security_testing_in_staging';
    dependency: 'npm_audit_and_snyk_integration';
    secrets: 'git_pre_commit_secret_detection';
  };
  
  complianceAudits: {
    internal: 'monthly_security_control_reviews';
    external: 'annual_third_party_security_audit';
    regulatory: 'lgpd_compliance_assessment';
    industry: 'accounting_industry_security_standards';
  };
}
```

## Disaster Recovery & Business Continuity

### Backup & Recovery Strategy
```typescript
interface DisasterRecovery {
  backupStrategy: {
    frequency: {
      database: 'continuous_with_point_in_time_recovery';
      files: 'hourly_incremental_daily_full';
      configurations: 'version_controlled_with_change_tracking';
      secrets: 'encrypted_daily_backup_to_secure_vault';
    };
    
    retention: {
      daily: '30_days_retention';
      weekly: '12_weeks_retention';
      monthly: '12_months_retention';
      yearly: '7_years_compliance_retention';
    };
    
    testing: {
      restoreTesting: 'monthly_full_restore_verification';
      recoveryDrills: 'quarterly_disaster_recovery_exercises';
      documentationUpdates: 'post_drill_procedure_refinement';
    };
  };
  
  businessContinuity: {
    rto: 'recovery_time_objective_4_hours';
    rpo: 'recovery_point_objective_15_minutes';
    alternativeSites: 'cloud_based_failover_infrastructure';
    communicationPlan: 'multi_channel_stakeholder_notification';
  };
}
```

---

*These security guidelines are living documents that must be regularly reviewed and updated to address evolving threats and regulatory requirements. All team members are responsible for adhering to these guidelines and reporting security concerns immediately.*

**Security Classification**: Internal Use Only  
**Last Updated**: January 2025  
**Next Review**: April 2025  
**Document Owner**: Security Team  
**Approval**: CTO & Legal Counsel