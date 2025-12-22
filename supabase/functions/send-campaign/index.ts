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
    const { campaignId, webhookUrl, sheetId, sheetTabId, message, sendNow, scheduledAt, sendLimit } = await req.json();

    if (!webhookUrl) {
      throw new Error("Webhook URL is required");
    }

    console.log(`Sending campaign ${campaignId} to webhook: ${webhookUrl}`);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        sheetId,
        sheetTabId,
        message,
        sendNow,
        scheduledAt,
        sendLimit,
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});