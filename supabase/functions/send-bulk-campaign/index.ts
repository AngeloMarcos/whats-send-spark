import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { campaignId, contacts, message, webhookUrl, sendNow, scheduledAt, sendLimit } = await req.json();

    if (!webhookUrl) {
      throw new Error("Webhook URL is required");
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      throw new Error("Contacts array is required and cannot be empty");
    }

    console.log(`Sending bulk campaign ${campaignId} with ${contacts.length} contacts to webhook: ${webhookUrl}`);

    // Apply send limit if specified
    const contactsToSend = sendLimit ? contacts.slice(0, sendLimit) : contacts;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        contacts: contactsToSend,
        message,
        sendNow,
        scheduledAt,
        sendLimit,
        totalContacts: contactsToSend.length,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Webhook error:", response.status, errorText);
      throw new Error(`Webhook returned ${response.status}: ${errorText}`);
    }

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = { success: true };
    }

    console.log("Webhook response:", result);

    return new Response(JSON.stringify({ 
      ...result, 
      contactsSent: contactsToSend.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
