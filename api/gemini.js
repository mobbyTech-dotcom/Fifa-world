export default async function handler(req, res) {
  // รับเฉพาะ Method POST เท่านั้น
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // ดึง API Key จาก Environment Variable ที่ตั้งไว้ในระบบของ Vercel
  const apiKey = process.env.GEMINI_KEY; 
  if (!apiKey) {
    return res.status(500).json({ error: 'API key is missing in backend' });
  }

  try {
    const prompt = req.body.prompt;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    // ยิง Request ไปหา Google Gemini
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
