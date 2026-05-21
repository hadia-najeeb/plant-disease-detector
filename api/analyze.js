export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const HF_TOKEN = process.env.HF_TOKEN;
    if (!HF_TOKEN) return res.status(500).json({ error: 'Server misconfigured: missing HF_TOKEN env variable.' });

    // Accept base64 image from frontend
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'No image provided.' });

    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const HF_MODEL = 'linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification';

    const hfRes = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': mimeType || 'image/jpeg',
      },
      body: imageBuffer,
    });

    if (!hfRes.ok) {
      const errData = await hfRes.json().catch(() => ({}));
      if (hfRes.status === 503) {
        return res.status(503).json({ error: 'Model is warming up. Please wait 20 seconds and try again.' });
      }
      return res.status(hfRes.status).json({ error: errData.error || `Hugging Face error ${hfRes.status}` });
    }

    const data = await hfRes.json();
    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

