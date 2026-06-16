import "server-only";

/**
 * Send an SMS. In development (or when no gateway is configured) the message is
 * logged to the server console so OTP flows are testable without a real gateway.
 */
export async function sendSms(phone: string, message: string): Promise<void> {
  const apiUrl = process.env.SMS_API_URL;
  const apiKey = process.env.SMS_API_KEY;

  if (!apiUrl || !apiKey) {
    console.log(`📱 [SMS to ${phone}] ${message}`);
    return;
  }

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      senderid: process.env.SMS_SENDER_ID,
      number: phone,
      message,
    }),
  });

  if (!res.ok) {
    throw new Error(`SMS gateway error: ${res.status}`);
  }
}
