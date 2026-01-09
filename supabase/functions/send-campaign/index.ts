import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Unauthorized access attempt:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Authenticated user: ${user.id}`);

    const requestBody = await req.json();
    console.error("🔍 REQUEST BODY RECEIVED:", JSON.stringify(requestBody, null, 2));

    const { campaignId, message, scheduledAt, sendLimit, isTestMode, testContactPhone } = requestBody;

    console.error("🔍 PARSED PARAMS:", {
      campaignId: campaignId || "MISSING",
      sendLimit,
      isTestMode,
      testContactPhone: testContactPhone || "NOT SET",
      timestamp: new Date().toISOString(),
    });

    // Verify user owns this campaign and get list_id
    interface ContactData {
      phone: string;
      name: string;
      email: string;
      [key: string]: unknown;
    }
    let contacts: ContactData[] = [];

    if (campaignId) {
      console.error("🔍 Fetching campaign data for campaignId:", campaignId);

      const { data: campaign, error: campaignError } = await supabaseClient
        .from("campaigns")
        .select("user_id, list_id")
        .eq("id", campaignId)
        .single();

      console.error("🔍 CAMPAIGN QUERY RESULT:", {
        campaign: campaign ? JSON.stringify(campaign) : "NULL",
        error: campaignError ? JSON.stringify(campaignError) : "NONE",
        timestamp: new Date().toISOString(),
      });

      if (campaignError || !campaign || campaign.user_id !== user.id) {
        console.error(
          `❌ User ${user.id} attempted to access campaign ${campaignId} they don't own or campaign not found`,
        );
        console.error("Campaign error details:", campaignError);
        return new Response(JSON.stringify({ error: "Campaign not found or access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate list_id exists
      if (!campaign.list_id) {
        console.error("❌ ERRO CRÍTICO: campaign.list_id é NULL!");
        return new Response(JSON.stringify({ error: "Lista de contatos não encontrada para esta campanha" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch contacts from the list
      console.error("🔍 Tentando buscar contatos para list_id:", campaign.list_id);

      const { data: contactsData, error: contactsError } = await supabaseClient
        .from("contacts")
        .select("phone, name, email, extra_data")
        .eq("list_id", campaign.list_id)
        .eq("is_valid", true)
        .limit(10000);

      console.error("🔍 CONTACTS QUERY RESULT:", {
        contactsCount: contactsData?.length || 0,
        hasError: !!contactsError,
        error: contactsError ? JSON.stringify(contactsError) : "NONE",
      });

      if (contactsError) {
        console.error("❌ ERRO ao buscar contatos:", JSON.stringify(contactsError));
        return new Response(JSON.stringify({ error: "Erro ao buscar contatos da lista" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!contactsData || contactsData.length === 0) {
        console.error(`❌ No valid contacts found for list: ${campaign.list_id}`);
        return new Response(JSON.stringify({ error: "Nenhum contato válido encontrado na lista" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      contacts = contactsData.map((c) => ({
        phone: c.phone,
        name: c.name || "Lead",
        email: c.email || "",
        ...((c.extra_data as Record<string, unknown>) || {}),
      }));
      console.error("✅ Contatos mapeados:", contacts.length);
    }

    // Apply send limit
    const sendLimitNum = sendLimit ? parseInt(String(sendLimit), 10) : null;
    const limitedContacts =
      sendLimitNum && !isNaN(sendLimitNum) && sendLimitNum > 0 ? contacts.slice(0, sendLimitNum) : contacts;

    // If test mode, replace all phones with test contact phone
    const contactsToSend =
      isTestMode && testContactPhone
        ? limitedContacts.map((c) => ({ ...c, phone: testContactPhone }))
        : limitedContacts;

    console.error(
      `🚀 Inserindo ${contactsToSend.length} contatos na fila campaign_queue${isTestMode ? " [TEST MODE]" : ""}`,
    );

    // ⭐ INSERIR NA FILA para processamento gradual pelo n8n
    const queueInserts = contactsToSend.map((contact) => ({
      campaign_id: campaignId,
      user_id: user.id,
      contact_phone: contact.phone,
      contact_name: contact.name || "Lead",
      contact_data: contact, // Salva todos os dados extras
      message: message || "Oi! Tudo bem? 😊",
      status: "pending",
      scheduled_for: scheduledAt || null,
    }));

    const { data: insertedQueue, error: queueError } = await supabaseClient
      .from("campaign_queue")
      .insert(queueInserts)
      .select();

    if (queueError) {
      console.error("❌ Erro ao inserir na fila:", queueError);
      return new Response(
        JSON.stringify({
          error: "Erro ao adicionar contatos na fila de envio",
          details: queueError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`✅ ${insertedQueue?.length || 0} contatos adicionados na fila. N8n irá processar automaticamente!`);

    // Atualizar status da campanha
    if (campaignId) {
      await supabaseClient
        .from("campaigns")
        .update({
          status: "sending",
          contacts_total: contactsToSend.length,
        })
        .eq("id", campaignId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `${contactsToSend.length} contatos adicionados na fila de envio. O n8n irá processar aos poucos (1 mensagem a cada 25 minutos).`,
        contactsQueued: contactsToSend.length,
        estimatedTime: `~${Math.round((contactsToSend.length * 25) / 60)} horas`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Erro ao processar campanha",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
