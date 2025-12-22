const N8N_WEBHOOK_URL =
  "https://fierceparrot-n8n.cloudfy.live/webhook/disparo-massa";

export interface Contact {
  name?: string;
  phone?: string;
  [key: string]: string | number | null | undefined;
}

export interface BulkMetadata {
  campaignName: string;
  messageBase?: string;
}

export interface BulkPayload {
  contacts: Contact[];
  metadata: BulkMetadata;
}

export async function sendBulkToN8n(payload: BulkPayload) {
  const response = await fetch(N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao chamar n8n: ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

// Keep old interface for backwards compatibility with existing code
export interface ContactRow {
  name?: string;
  phone: string;
  [key: string]: string | number | null | undefined;
}
