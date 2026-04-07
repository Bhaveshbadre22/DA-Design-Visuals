// Vercel Serverless Function: POST /api/contact
// Sends enquiry email via Gmail SMTP (Nodemailer).
// Required env vars in Vercel:
// - GMAIL_USER (example: bhavesh.leifii@gmail.com)
// - GMAIL_APP_PASSWORD (Google "App Password" - not your normal Gmail password)
// Optional:
// - CONTACT_TO_EMAIL (default: bhavesh.leifii@gmail.com)
// - CONTACT_FROM_NAME (default: DA Design Visuals)

const nodemailer = require('nodemailer');

function cleanHeaderValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/[\r\n]+/g, ' ');
}

function isValidEmail(email) {
  // Basic sanity check; Resend will also validate.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function readRawBody(req) {
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      // Small safety limit (256KB)
      if (data.length > 256 * 1024) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function parseFormUrlEncoded(body) {
  const params = new URLSearchParams(body);
  const out = {};

  for (const [rawKey, value] of params.entries()) {
    const key = rawKey.endsWith('[]') ? rawKey.slice(0, -2) : rawKey;

    if (out[key] === undefined) {
      out[key] = rawKey.endsWith('[]') ? [value] : value;
      continue;
    }

    if (Array.isArray(out[key])) {
      out[key].push(value);
    } else {
      out[key] = [out[key], value];
    }
  }

  return out;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      return;
    }

    const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
    const rawBody = await readRawBody(req);

    let data = {};
    if (contentType.includes('application/json')) {
      data = rawBody ? JSON.parse(rawBody) : {};
    } else {
      // Default for HTML forms / jQuery serialize()
      data = parseFormUrlEncoded(rawBody);
    }

    const name = cleanHeaderValue(data.name);
    const email = cleanHeaderValue(data.email);
    const message = String(data.message ?? '').trim();
    const budget = cleanHeaderValue(data.budget);

    const services = Array.isArray(data.service)
      ? data.service.map(cleanHeaderValue).filter(Boolean)
      : typeof data.service === 'string'
        ? [cleanHeaderValue(data.service)].filter(Boolean)
        : [];

    if (!name || !isValidEmail(email)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Please enter your name and a valid email.' }));
      return;
    }

    const toEmail = process.env.CONTACT_TO_EMAIL || 'bhavesh.leifii@gmail.com';
    const fromName = process.env.CONTACT_FROM_NAME || 'DA Design Visuals';

    const gmailUser = String(process.env.GMAIL_USER || '').trim();
    const gmailPass = String(process.env.GMAIL_APP_PASSWORD || '').trim();
    if (!gmailUser || !gmailPass) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Server is missing GMAIL_USER or GMAIL_APP_PASSWORD.' }));
      return;
    }

    const subject = `New enquiry from ${name}`;

    const lines = [
      'New enquiry from DA Design Visuals website',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
    ];

    if (services.length) lines.push(`Services: ${services.join(', ')}`);
    if (budget) lines.push(`Budget: ${budget}`);
    if (message) {
      lines.push('', 'Message:', message);
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    await transporter.sendMail({
      from: `${fromName} <${gmailUser}>`,
      to: toEmail,
      subject,
      text: lines.join('\n'),
      replyTo: email,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, message: 'Thank you! Your message has been sent.' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err?.message || 'Server error' }));
  }
};
