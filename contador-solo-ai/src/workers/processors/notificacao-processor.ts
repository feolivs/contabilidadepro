/**
 * Processador de Notificações - ContabilidadePRO
 * Envia emails, SMS e push notifications
 */

import { JobProcessor } from '../queue-worker'
import { logger } from '@/lib/simple-logger'
import { createClient } from '@/lib/supabase'

export interface NotificacaoJob {
  type: 'notificacao'
  tipo: 'email' | 'sms' | 'push'
  destinatario: string
  template: string
  dados: Record<string, any>
  prioridade?: 'baixa' | 'media' | 'alta' | 'urgente'
  agendarPara?: string
  timestamp: string
}

export interface NotificacaoResult {
  enviado: boolean
  providerId?: string
  messageId?: string
  erro?: string
}

export class NotificacaoProcessor implements JobProcessor<NotificacaoJob> {
  private supabase = createClient()

  validate(data: NotificacaoJob): boolean {
    return !!(
      data.tipo &&
      data.destinatario &&
      data.template &&
      data.dados
    )
  }

  async process(data: NotificacaoJob): Promise<NotificacaoResult> {
    logger.info('Processando notificação', {
      tipo: data.tipo,
      destinatario: data.destinatario,
      template: data.template,
      prioridade: data.prioridade || 'media'
    })

    // Verificar se deve agendar para depois
    if (data.agendarPara) {
      const agendarData = new Date(data.agendarPara)
      if (agendarData > new Date()) {
        throw new Error(`Notificação agendada para ${agendarData.toISOString()}`)
      }
    }

    try {
      switch (data.tipo) {
        case 'email':
          return await this.enviarEmail(data)
        case 'sms':
          return await this.enviarSMS(data)
        case 'push':
          return await this.enviarPush(data)
        default:
          throw new Error(`Tipo de notificação não suportado: ${data.tipo}`)
      }
    } catch (error) {
      logger.error('Erro ao enviar notificação', {
        tipo: data.tipo,
        destinatario: data.destinatario,
        template: data.template,
        error
      })
      throw error
    }
  }

  async onSuccess(result: NotificacaoResult, data: NotificacaoJob): Promise<void> {
    // Registrar envio bem-sucedido
    try {
      const { error } = await this.supabase
        .from('notificacoes_log')
        .insert({
          tipo: data.tipo,
          destinatario: data.destinatario,
          template: data.template,
          dados: data.dados,
          status: 'enviado',
          provider_id: result.providerId,
          message_id: result.messageId,
          enviado_em: new Date().toISOString()
        })

      if (error) throw error

      logger.info('Notificação enviada com sucesso', {
        tipo: data.tipo,
        destinatario: data.destinatario,
        messageId: result.messageId
      })
    } catch (error) {
      logger.error('Erro ao registrar envio de notificação', {
        tipo: data.tipo,
        destinatario: data.destinatario,
        error
      })
    }
  }

  async onError(error: Error, data: NotificacaoJob): Promise<void> {
    // Registrar falha no envio
    try {
      const { error: dbError } = await this.supabase
        .from('notificacoes_log')
        .insert({
          tipo: data.tipo,
          destinatario: data.destinatario,
          template: data.template,
          dados: data.dados,
          status: 'erro',
          erro_detalhes: error.message,
          tentado_em: new Date().toISOString()
        })

      if (dbError) throw dbError
    } catch (dbError) {
      logger.error('Erro ao registrar falha de notificação', {
        tipo: data.tipo,
        destinatario: data.destinatario,
        error: dbError
      })
    }
  }

  private async enviarEmail(data: NotificacaoJob): Promise<NotificacaoResult> {
    const template = await this.obterTemplate(data.template, 'email')
    const conteudo = this.processarTemplate(template, data.dados)

    // Usar Supabase Edge Function para envio de email
    const { data: result, error } = await this.supabase.functions.invoke('send-email', {
      body: {
        to: data.destinatario,
        subject: conteudo.assunto,
        html: conteudo.corpo,
        priority: data.prioridade || 'media'
      }
    })

    if (error) throw error

    return {
      enviado: true,
      providerId: 'supabase-email',
      messageId: result.messageId
    }
  }

  private async enviarSMS(data: NotificacaoJob): Promise<NotificacaoResult> {
    const template = await this.obterTemplate(data.template, 'sms')
    const conteudo = this.processarTemplate(template, data.dados)

    // Integração com provedor de SMS (exemplo: Twilio)
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from('YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN').toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: data.destinatario,
        From: 'YOUR_TWILIO_NUMBER',
        Body: conteudo.corpo
      })
    })

    if (!response.ok) {
      throw new Error(`Erro no envio de SMS: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      enviado: true,
      providerId: 'twilio',
      messageId: result.sid
    }
  }

  private async enviarPush(data: NotificacaoJob): Promise<NotificacaoResult> {
    const template = await this.obterTemplate(data.template, 'push')
    const conteudo = this.processarTemplate(template, data.dados)

    // Integração com serviço de push notifications
    // Exemplo usando Firebase Cloud Messaging
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': 'key=YOUR_SERVER_KEY',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: data.destinatario, // FCM token
        notification: {
          title: conteudo.titulo,
          body: conteudo.corpo,
          icon: '/icon-192x192.png'
        },
        data: data.dados
      })
    })

    if (!response.ok) {
      throw new Error(`Erro no envio de push: ${response.statusText}`)
    }

    const result = await response.json()

    return {
      enviado: true,
      providerId: 'fcm',
      messageId: result.multicast_id?.toString()
    }
  }

  private async obterTemplate(templateName: string, tipo: string) {
    // Buscar template no banco de dados
    const { data, error } = await this.supabase
      .from('templates_notificacao')
      .select('*')
      .eq('nome', templateName)
      .eq('tipo', tipo)
      .single()

    if (error || !data) {
      // Templates padrão
      return this.obterTemplatePadrao(templateName, tipo)
    }

    return data
  }

  private obterTemplatePadrao(templateName: string, tipo: string) {
    const templates = {
      email: {
        vencimento_das: {
          assunto: 'Vencimento DAS - {{empresa_nome}}',
          corpo: `
            <h2>Lembrete: Vencimento do DAS</h2>
            <p>Olá,</p>
            <p>O DAS da empresa <strong>{{empresa_nome}}</strong> vence em <strong>{{data_vencimento}}</strong>.</p>
            <p><strong>Valor:</strong> R$ {{valor}}</p>
            <p><strong>Período:</strong> {{periodo}}</p>
            <p>Não se esqueça de efetuar o pagamento até a data de vencimento.</p>
            <p>Atenciosamente,<br>ContabilidadePRO</p>
          `
        },
        calculo_concluido: {
          assunto: 'Cálculo Fiscal Concluído - {{tipo_calculo}}',
          corpo: `
            <h2>Cálculo Fiscal Concluído</h2>
            <p>O cálculo de <strong>{{tipo_calculo}}</strong> foi concluído com sucesso.</p>
            <p><strong>Empresa:</strong> {{empresa_nome}}</p>
            <p><strong>Período:</strong> {{periodo}}</p>
            <p><strong>Valor:</strong> R$ {{valor}}</p>
            <p>Acesse o sistema para visualizar os detalhes completos.</p>
          `
        }
      },
      sms: {
        vencimento_das: {
          corpo: 'DAS {{empresa_nome}} vence em {{data_vencimento}}. Valor: R$ {{valor}}. ContabilidadePRO'
        },
        calculo_concluido: {
          corpo: 'Cálculo {{tipo_calculo}} concluído. Empresa: {{empresa_nome}}. Valor: R$ {{valor}}. ContabilidadePRO'
        }
      },
      push: {
        vencimento_das: {
          titulo: 'Vencimento DAS',
          corpo: '{{empresa_nome}} - Vence em {{data_vencimento}}'
        },
        calculo_concluido: {
          titulo: 'Cálculo Concluído',
          corpo: '{{tipo_calculo}} - {{empresa_nome}}'
        }
      }
    }

    const tipoTemplates = templates[tipo as keyof typeof templates] as any
    return tipoTemplates[templateName] || {
      assunto: 'Notificação ContabilidadePRO',
      corpo: 'Você tem uma nova notificação.',
      titulo: 'ContabilidadePRO'
    }
  }

  private processarTemplate(template: any, dados: Record<string, any>) {
    const processarTexto = (texto: string) => {
      return texto.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return dados[key] || match
      })
    }

    return {
      assunto: template.assunto ? processarTexto(template.assunto) : undefined,
      corpo: processarTexto(template.corpo),
      titulo: template.titulo ? processarTexto(template.titulo) : undefined
    }
  }
}
