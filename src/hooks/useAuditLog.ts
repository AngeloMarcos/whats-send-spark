import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type AuditAction = 
  | 'login_attempt'
  | 'login_failed'
  | 'login_success'
  | 'logout'
  | 'campaign_created'
  | 'campaign_updated'
  | 'campaign_deleted'
  | 'campaign_started'
  | 'list_created'
  | 'list_deleted'
  | 'template_created'
  | 'template_updated'
  | 'template_deleted'
  | 'settings_updated'
  | 'contacts_imported';

export type ResourceType = 
  | 'auth'
  | 'campaign'
  | 'list'
  | 'template'
  | 'settings'
  | 'contacts';

interface AuditLogParams {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, string | number | boolean | null | string[]>;
}


export function useAuditLog() {
  const log = useCallback(async ({ 
    action, 
    resourceType, 
    resourceId, 
    details = {} 
  }: AuditLogParams) => {
    try {
      // Get user agent info
      const userAgent = navigator.userAgent;
      
      // Note: IP address would ideally be captured server-side
      // For frontend logging, we'll leave it null
      const { error } = await supabase
        .from('audit_logs')
        .insert([{
          action,
          resource_type: resourceType,
          resource_id: resourceId || null,
          details: (details || {}) as Json,
          user_agent: userAgent,
          ip_address: null, // Would need server-side to get real IP
        }]);

      if (error) {
        console.error('Failed to log audit event:', error);
      }
    } catch (err) {
      // Silent fail - audit logging should not break the app
      console.error('Audit log error:', err);
    }
  }, []);

  // Convenience methods for common actions
  const logLogin = useCallback((success: boolean, email: string) => {
    return log({
      action: success ? 'login_success' : 'login_failed',
      resourceType: 'auth',
      details: { email, success },
    });
  }, [log]);

  const logLogout = useCallback(() => {
    return log({
      action: 'logout',
      resourceType: 'auth',
    });
  }, [log]);

  const logCampaignAction = useCallback((
    action: 'campaign_created' | 'campaign_updated' | 'campaign_deleted' | 'campaign_started',
    campaignId: string,
    details?: Record<string, string | number | boolean | null | string[]>
  ) => {
    return log({
      action,
      resourceType: 'campaign',
      resourceId: campaignId,
      details,
    });
  }, [log]);

  const logListAction = useCallback((
    action: 'list_created' | 'list_deleted',
    listId: string,
    details?: Record<string, string | number | boolean | null | string[]>
  ) => {
    return log({
      action,
      resourceType: 'list',
      resourceId: listId,
      details,
    });
  }, [log]);

  const logTemplateAction = useCallback((
    action: 'template_created' | 'template_updated' | 'template_deleted',
    templateId: string,
    details?: Record<string, string | number | boolean | null | string[]>
  ) => {
    return log({
      action,
      resourceType: 'template',
      resourceId: templateId,
      details,
    });
  }, [log]);

  const logSettingsUpdate = useCallback((fieldsChanged: string[]) => {
    return log({
      action: 'settings_updated',
      resourceType: 'settings',
      details: { fieldsChanged },
    });
  }, [log]);

  const logContactsImport = useCallback((listId: string, count: number) => {
    return log({
      action: 'contacts_imported',
      resourceType: 'contacts',
      resourceId: listId,
      details: { count },
    });
  }, [log]);

  return {
    log,
    logLogin,
    logLogout,
    logCampaignAction,
    logListAction,
    logTemplateAction,
    logSettingsUpdate,
    logContactsImport,
  };
}
