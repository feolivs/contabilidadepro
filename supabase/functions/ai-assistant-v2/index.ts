// AI Assistant Helper Functions for Supabase Dashboard Integration
// This service provides helper functions that work WITH the integrated Supabase AI Assistant
// The actual AI Assistant is accessed via cmd+i in the Supabase Dashboard

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { structuredLogger } from '../_shared/structured-logger.ts'
import { errorHandler } from '../_shared/error-handler.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface HelperRequest {
  operation: 'prepare_context' | 'log_interaction' | 'get_suggestions' | 'analyze_schema'
  data?: any
  user_id?: string
}

interface HelperResponse {
  success: boolean
  data?: any
  suggestions?: string[]
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { operation, data, user_id }: HelperRequest = await req.json()

    const startTime = Date.now()
    let response: HelperResponse = { success: false }

    structuredLogger.info('AI Assistant Helper request received', {
      operation,
      user_id,
      has_data: !!data
    })

    switch (operation) {
      case 'prepare_context':
        response = await prepareContextForAI(data)
        break

      case 'log_interaction':
        response = await logUserInteraction(data, user_id)
        break

      case 'get_suggestions':
        response = await getSuggestions(data)
        break

      case 'analyze_schema':
        response = await analyzeSchemaStructure(data)
        break

      default:
        throw new Error(`Unsupported operation: ${operation}`)
    }

    const executionTime = Date.now() - startTime

    structuredLogger.info('AI Assistant Helper completed', {
      operation,
      success: response.success,
      execution_time_ms: executionTime
    })

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: response.success ? 200 : 400
    })

  } catch (error) {
    return errorHandler(error, 'AI Assistant Helper')
  }
})

// Helper function to prepare context for the integrated Supabase AI Assistant
async function prepareContextForAI(data: any): Promise<HelperResponse> {
  try {
    const { table_name, include_relationships = true } = data

    // Get schema information
    const { data: schemaInfo } = await supabase.rpc('get_schema_for_ai_assistant')

    let context: any = {
      schema_info: schemaInfo
    }

    // If specific table requested, filter to that table
    if (table_name) {
      context.schema_info = schemaInfo?.filter((row: any) => row.table_name === table_name)
    }

    // Get relationships if requested
    if (include_relationships) {
      const { data: relationships } = await supabase.rpc('get_table_relationships_for_ai')
      context.relationships = relationships
    }

    // Add Brazilian accounting context
    context.business_context = {
      domain: 'Brazilian Accounting System',
      key_concepts: [
        'DAS (Documento de Arrecadação do Simples Nacional)',
        'NFe (Nota Fiscal Eletrônica)',
        'Regime Tributário (MEI, Simples Nacional, Lucro Presumido)',
        'Compliance fiscal brasileiro'
      ],
      naming_conventions: 'Portuguese business terms',
      data_types: 'Use NUMERIC for financial values with proper precision'
    }

    return {
      success: true,
      data: context,
      suggestions: [
        'Use this context when asking the AI Assistant (cmd+i) for help',
        'The AI Assistant can now understand your schema structure',
        'Ask for schema design, RLS policies, or query optimization'
      ]
    }

  } catch (error) {
    structuredLogger.error('Context preparation error', { error: error.message })
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to log user interactions with AI Assistant
async function logUserInteraction(data: any, user_id?: string): Promise<HelperResponse> {
  try {
    if (!user_id) {
      throw new Error('User ID is required for logging interactions')
    }

    const interaction = {
      user_id,
      session_id: data.session_id || `session_${Date.now()}`,
      interaction_type: data.type || 'general',
      prompt: data.prompt || '',
      response: data.response || '',
      context_data: data.context || {},
      execution_time_ms: data.execution_time_ms || 0,
      success: data.success !== false,
      error_message: data.error_message || null,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('ai_assistant_interactions')
      .insert(interaction)

    if (error) {
      throw error
    }

    return {
      success: true,
      data: { logged: true, interaction_id: interaction.session_id }
    }

  } catch (error) {
    structuredLogger.error('Interaction logging error', { error: error.message })
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to get suggestions for common development tasks
async function getSuggestions(data: any): Promise<HelperResponse> {
  try {
    const { task_type, table_name } = data

    let suggestions: string[] = []

    switch (task_type) {
      case 'schema_design':
        suggestions = [
          'Use the AI Assistant (cmd+i) to design new tables',
          'Ask: "Create a table for Brazilian tax calculations with proper data types"',
          'Include audit fields: created_at, updated_at, user_id',
          'Consider RLS policies for multi-tenant security',
          'Use NUMERIC type for financial values with proper precision'
        ]
        break

      case 'query_optimization':
        suggestions = [
          'Use EXPLAIN ANALYZE to understand query performance',
          'Ask AI Assistant: "How can I optimize this slow query?"',
          'Consider adding indexes on frequently queried columns',
          'Use materialized views for complex aggregations',
          'Partition large tables by date for better performance'
        ]
        break

      case 'rls_policies':
        suggestions = [
          'Ask AI Assistant: "Create RLS policies for multi-tenant table"',
          'Use auth.uid() to identify current user',
          'Filter by empresa_id or company_id for tenant isolation',
          'Test policies thoroughly with different user roles',
          'Consider performance impact of complex policies'
        ]
        break

      case 'sql_to_js':
        suggestions = [
          'Use our sql_to_supabase_js_helper() function',
          'Ask AI Assistant to convert complex queries to supabase-js',
          'Consider using RPC for complex business logic',
          'Add proper TypeScript types for better development experience',
          'Handle errors gracefully in your client code'
        ]
        break

      default:
        suggestions = [
          'Use cmd+i to access the integrated Supabase AI Assistant',
          'Prepare context using our helper functions',
          'Ask specific questions about your schema or queries',
          'The AI Assistant understands PostgreSQL and Supabase patterns'
        ]
    }

    return {
      success: true,
      suggestions,
      data: { task_type, available_helpers: ['prepare_context', 'analyze_schema', 'log_interaction'] }
    }

  } catch (error) {
    structuredLogger.error('Suggestions error', { error: error.message })
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper function to analyze schema structure
async function analyzeSchemaStructure(data: any): Promise<HelperResponse> {
  try {
    const { table_name } = data

    // Get schema information
    const { data: schemaInfo } = await supabase.rpc('get_schema_for_ai_assistant')
    const { data: relationships } = await supabase.rpc('get_table_relationships_for_ai')

    let analysis: any = {
      total_tables: 0,
      total_columns: 0,
      tables_with_relationships: 0,
      common_patterns: []
    }

    if (schemaInfo) {
      // Group by table
      const tableGroups = schemaInfo.reduce((acc: any, row: any) => {
        if (!acc[row.table_name]) {
          acc[row.table_name] = []
        }
        acc[row.table_name].push(row)
        return acc
      }, {})

      analysis.total_tables = Object.keys(tableGroups).length
      analysis.total_columns = schemaInfo.length

      // Analyze patterns
      const auditFields = ['created_at', 'updated_at', 'user_id']
      const financialTables = Object.keys(tableGroups).filter(name =>
        name.includes('fiscal') || name.includes('calculo') || name.includes('financ')
      )

      analysis.common_patterns = [
        `${financialTables.length} financial/fiscal tables detected`,
        `Tables with audit fields: ${Object.keys(tableGroups).filter(tableName =>
          auditFields.some(field =>
            tableGroups[tableName].some((col: any) => col.column_name === field)
          )
        ).length}`,
        `Foreign key relationships: ${relationships?.length || 0}`
      ]

      // If specific table requested
      if (table_name && tableGroups[table_name]) {
        analysis.table_details = {
          name: table_name,
          columns: tableGroups[table_name].length,
          column_details: tableGroups[table_name],
          relationships: relationships?.filter((rel: any) =>
            rel.source_table === table_name || rel.target_table === table_name
          )
        }
      }
    }

    return {
      success: true,
      data: analysis,
      suggestions: [
        'Use this analysis to understand your schema structure',
        'Ask the AI Assistant (cmd+i) for specific improvements',
        'Consider adding missing audit fields or relationships',
        'Review naming conventions for consistency'
      ]
    }

  } catch (error) {
    structuredLogger.error('Schema analysis error', { error: error.message })
    return {
      success: false,
      error: error.message
    }
  }
}
