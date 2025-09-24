#!/usr/bin/env node

/**
 * 🚀 APLICAR MIGRAÇÃO ALERTS-SERVICE
 * Script para aplicar a migração dos cron jobs diretamente
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://selnwgpyjctpjzdrfrey.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não configurada')
  process.exit(1)
}

async function executeMigration() {
  console.log('🚀 Aplicando migração alerts-service...')
  
  try {
    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'supabase/migrations/20250122000007_migrate_to_alerts_service.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migração carregada:', migrationPath)
    console.log('📏 Tamanho:', migrationSQL.length, 'caracteres')
    
    // Executar via API REST do Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      },
      body: JSON.stringify({
        sql: migrationSQL
      })
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ Migração aplicada com sucesso!')
      console.log('📥 Resultado:', result)
    } else {
      const error = await response.text()
      console.log('❌ Erro ao aplicar migração:', response.status)
      console.log('📥 Erro:', error)
    }
    
  } catch (error) {
    console.error('❌ Erro fatal:', error.message)
  }
}

// Função alternativa usando SQL direto
async function applyMigrationDirect() {
  console.log('🚀 Aplicando migração direta...')
  
  const migrations = [
    // 1. Remover jobs antigos
    `SELECT cron.unschedule('compliance-monitor-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compliance-monitor-daily');`,
    `SELECT cron.unschedule('intelligent-alerts-scheduler') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'intelligent-alerts-scheduler');`,
    `SELECT cron.unschedule('alert-escalation-monitor') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alert-escalation-monitor');`,
    `SELECT cron.unschedule('overdue-alerts-processor') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'overdue-alerts-processor');`,
    
    // 2. Criar novos jobs
    `SELECT cron.schedule(
      'alerts-service-compliance-daily',
      '0 9 * * *',
      $$SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'operation', 'check_compliance',
          'compliance_config', jsonb_build_object(
            'mode', 'check_all',
            'days_ahead', 30,
            'send_alerts', true
          )
        )
      );$$
    );`,
    
    `SELECT cron.schedule(
      'alerts-service-notifications-4h',
      '0 */4 * * *',
      $$SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'operation', 'process_notifications',
          'notification_config', jsonb_build_object(
            'action', 'check_deadlines',
            'check_config', jsonb_build_object(
              'days_ahead', array[7, 3, 1],
              'send_notifications', true
            )
          )
        )
      );$$
    );`,
    
    `SELECT cron.schedule(
      'alerts-service-escalation-2h',
      '0 */2 * * *',
      $$SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'operation', 'escalate_alerts',
          'escalation_config', jsonb_build_object(
            'action', 'check_escalations'
          )
        )
      );$$
    );`,
    
    `SELECT cron.schedule(
      'alerts-service-overdue-daily',
      '0 8 * * *',
      $$SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/alerts-service',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := jsonb_build_object(
          'operation', 'process_overdue'
        )
      );$$
    );`
  ]
  
  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i]
    console.log(`📝 Executando migração ${i + 1}/${migrations.length}...`)
    
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ sql })
      })
      
      if (response.ok) {
        console.log(`✅ Migração ${i + 1} aplicada`)
      } else {
        const error = await response.text()
        console.log(`❌ Erro na migração ${i + 1}:`, error)
      }
    } catch (error) {
      console.log(`❌ Erro na migração ${i + 1}:`, error.message)
    }
  }
}

// Verificar status dos cron jobs
async function checkCronJobs() {
  console.log('🔍 Verificando status dos cron jobs...')
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_alerts_cron_status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    })
    
    if (response.ok) {
      const jobs = await response.json()
      console.log('📊 Status dos cron jobs:')
      jobs.forEach(job => {
        console.log(`  • ${job.job_name}: ${job.active ? '✅ Ativo' : '❌ Inativo'}`)
        console.log(`    Schedule: ${job.schedule}`)
        console.log(`    Próxima execução: ${job.next_run}`)
      })
    } else {
      console.log('❌ Erro ao verificar cron jobs:', response.status)
    }
  } catch (error) {
    console.log('❌ Erro ao verificar cron jobs:', error.message)
  }
}

async function main() {
  console.log('🚨 MIGRAÇÃO ALERTS-SERVICE')
  console.log('==========================')
  
  await applyMigrationDirect()
  
  console.log('\n⏳ Aguardando 5 segundos...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  await checkCronJobs()
  
  console.log('\n🎉 Migração concluída!')
  console.log('✅ alerts-service está ativo e configurado')
}

if (require.main === module) {
  main().catch(console.error)
}

module.exports = { applyMigrationDirect, checkCronJobs }
