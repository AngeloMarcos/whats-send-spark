import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validate URL to prevent SSRF
function validateUrl(urlString: string): { valid: boolean; error?: string } {
  try {
    const url = new URL(urlString);
    
    if (url.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS" };
    }
    
    // Block private/internal IPs and hostnames
    const blockedPatterns = [
      "localhost",
      "127.0.0.1",
      "0.0.0.0",
      "10.",
      "192.168.",
      "172.16.",
      "172.17.",
      "172.18.",
      "172.19.",
      "172.20.",
      "172.21.",
      "172.22.",
      "172.23.",
      "172.24.",
      "172.25.",
      "172.26.",
      "172.27.",
      "172.28.",
      "172.29.",
      "172.30.",
      "172.31.",
      "internal",
      "local",
      "metadata.google",
      "169.254.",
    ];
    
    if (blockedPatterns.some((p) => url.hostname.includes(p))) {
      return { valid: false, error: "Internal or private URLs are not allowed" };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL
    const validation = validateUrl(url);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Testing webhook connection to: ${url}`);

    // Test connection with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        method: "HEAD", // Use HEAD to minimize data transfer
        signal: controller.signal,
        headers: {
          "User-Agent": "Lovable-Webhook-Test/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Accept 2xx and 3xx status codes, and 405 (Method Not Allowed - webhook exists but doesn't accept HEAD)
      const isSuccess = response.ok || response.status === 405 || (response.status >= 300 && response.status < 400);
      
      if (isSuccess) {
        console.log(`Webhook test successful: ${response.status} in ${responseTime}ms`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            responseTime,
            status: response.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        console.log(`Webhook test failed: ${response.status}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Server returned status ${response.status}`,
            status: response.status,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        console.log("Webhook test timed out");
        return new Response(
          JSON.stringify({ success: false, error: "Connection timed out (10s)" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error("Webhook test error:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Could not connect to webhook" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
