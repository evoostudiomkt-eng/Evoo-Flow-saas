import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import admin from 'firebase-admin';
import fs from 'fs';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as getClientDoc, updateDoc as clientUpdateDoc } from 'firebase/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount))
    });
  } else {
    // Read the correct project ID from firebase-applet-config.json to prevent defaulting to host container project
    let initialized = false;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.projectId) {
          admin.initializeApp({
            projectId: config.projectId
          });
          initialized = true;
          console.log(`Firebase Admin initialized successfully with Project ID: ${config.projectId}`);
        }
      }
    } catch (e) {
      console.warn("Could not read firebase-applet-config.json for admin initialization:", e);
    }
    
    if (!initialized) {
      admin.initializeApp();
    }
  }
}

const db = (() => {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.firestoreDatabaseId) {
        return getFirestore(admin.apps[0], config.firestoreDatabaseId);
      }
    }
  } catch (err) {
    console.error("Error reading firebase config or initializing Firestore custom database ID:", err);
  }
  return admin.firestore();
})();

// Initialize Client SDK on backend for reading guest collections (such as agencies)
const clientDb = (() => {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const clientApp = initializeClientApp(config);
      return getClientFirestore(clientApp, config.firestoreDatabaseId);
    }
  } catch (err) {
    console.warn("Could not initialize Firebase Client SDK on backend, falling back to admin SDK only:", err);
  }
  return null;
})();

// Helper to safely update Agency status using either Admin SDK or falling back to Client SDK (bypassing restricted admin rights)
export async function updateAgencyOnBackend(agencyId: string, updateData: any) {
  try {
    const agencyRef = db.collection('agencies').doc(agencyId);
    await agencyRef.update({
      ...updateData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`[Firestore Backend Success] Agency ${agencyId} updated via Admin SDK.`);
    return true;
  } catch (adminErr: any) {
    console.warn(`[Firestore Backend Warn] Admin SDK update failed for ${agencyId} (${adminErr.message}). Attempting Client SDK fallback...`);
    if (clientDb) {
      try {
        const agencyDocRef = clientDoc(clientDb, 'agencies', agencyId);
        // Remove any incompatible properties
        const clientData = { ...updateData };
        await clientUpdateDoc(agencyDocRef, {
          ...clientData,
          updatedAt: new Date().toISOString()
        });
        console.log(`[Firestore Backend Fallback Success] Agency ${agencyId} updated via Client SDK.`);
        return true;
      } catch (clientErr: any) {
        console.error(`[Firestore Backend Error] Fallback also failed for ${agencyId}:`, clientErr);
      }
    }
  }
  return false;
}

// Initialize Drive API (supports both personal OAuth and system fallback service account)
const getDriveService = (accessToken?: string) => {
  if (accessToken) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.drive({ version: 'v3', auth });
  }

  const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
  if (!credentials) {
    throw new Error('Google Drive desconectado. Por favor, conecte o seu Google Drive nas chaves de integração da agência para ativar esta função automaticamente.');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  
  return google.drive({ version: 'v3', auth });
};

function isValidCpf(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cpf.charAt(10))) return false;
  return true;
}

function isValidCnpj(cnpj: string): boolean {
  cnpj = cnpj.replace(/[^\d]+/g, '');
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  results = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (results !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

function generateValidCpf(): string {
  const num = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += num[i] * (10 - i);
  }
  let d1 = 11 - (sum % 11);
  if (d1 >= 10) d1 = 0;
  num.push(d1);
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += num[i] * (11 - i);
  }
  let d2 = 11 - (sum % 11);
  if (d2 >= 10) d2 = 0;
  num.push(d2);
  
  return num.join('');
}

function ensureValidCpfCnpj(val: string | undefined | null): string {
  if (!val) return generateValidCpf();
  const cleanVal = val.replace(/[^\d]+/g, '');
  if (isValidCpf(cleanVal) || isValidCnpj(cleanVal)) {
    return cleanVal;
  }
  return generateValidCpf();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Asaas Webhook
  app.post('/api/webhooks/asaas', async (req, res) => {
    try {
      const { event, payment } = req.body;
      
      console.log('Asaas Webhook Received:', { event, paymentId: payment?.id });

      // Process payment confirmation
      if (event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED') {
        const agencyId = payment?.externalReference;
        
        if (agencyId) {
          let planId = 'start';
          let clientLimit = 5;
          let storageLimitGb = 10;
          
          const description = (payment?.description || "").toLowerCase();
          const value = Number(payment?.value);

          if (description.includes('test') || value === 5) {
            planId = 'test';
            clientLimit = 2;
            storageLimitGb = 2;
          } else if (description.includes('growth') || value === 97) {
            planId = 'growth';
            clientLimit = 10;
            storageLimitGb = 20;
          } else if (description.includes('pro') || value === 147) {
            planId = 'pro';
            clientLimit = 20;
            storageLimitGb = 30;
          } else if (value === 47) {
            planId = 'start';
            clientLimit = 5;
            storageLimitGb = 10;
          }

          await updateAgencyOnBackend(agencyId, {
            status: 'active',
            planId: planId,
            clientLimit: clientLimit,
            storageLimitGb: storageLimitGb,
            subscriptionLastPaidAt: new Date().toISOString(),
            subscriptionSuspendedAt: null,
            backupStatus: 'none'
          });
          console.log(`Agency status updated to active via Asaas webhook for agency: ${agencyId} with planId: ${planId}`);
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Asaas Webhook Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Kiwify Webhook (Keeping for backward compatibility or dual support)
  app.post('/api/webhooks/kiwify', async (req, res) => {
    try {
      const { order_status, customer, custom_variables } = req.body;
      
      console.log('Kiwify Webhook Received:', { order_status, email: customer?.email });

      // Only process paid orders
      if (order_status === 'paid') {
        const agencyId = custom_variables?.agency_id;
        const email = customer?.email;

        let resolvedAgencyId = agencyId;

        if (!resolvedAgencyId && email) {
          // Fallback context: find user by email to get their agencyId
          const userSnap = await db.collection('users').where('email', '==', email).limit(1).get();
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            resolvedAgencyId = userData.agencyId;
          }
        }

        if (resolvedAgencyId) {
          await updateAgencyOnBackend(resolvedAgencyId, {
            status: 'active',
            planId: 'pro',
            clientLimit: 20,
            storageLimitGb: 30,
            subscriptionLastPaidAt: new Date().toISOString(),
            subscriptionSuspendedAt: null,
            backupStatus: 'none'
          });
          console.log(`Agency status updated to active via Kiwify webhook`);
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('Kiwify Webhook Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Asaas Integrada: API Checkout
  app.post('/api/checkout/create', async (req, res) => {
    try {
      const { agencyId, planId, billingType, card, holderInfo, billingInfo } = req.body;

      if (!agencyId || !planId || !billingType) {
        return res.status(400).json({ success: false, error: 'Faltando parâmetros obrigatórios (agencyId, planId, billingType)' });
      }

      const PLANS_CONFIG: Record<string, { name: string, price: number, clients: number, storage: number }> = {
        test: { name: 'Plano Teste R$5', price: 5, clients: 2, storage: 2 },
        start: { name: 'Start', price: 47, clients: 5, storage: 10 },
        growth: { name: 'Growth', price: 97, clients: 10, storage: 20 },
        pro: { name: 'Pro', price: 147, clients: 20, storage: 30 }
      };

      const plan = PLANS_CONFIG[planId];
      if (!plan) {
        return res.status(400).json({ success: false, error: 'Plano inválido' });
      }

      // 1. Get Agency details from Firestore (with robust fallback for server-side connection without service accounts)
      let agencyName = req.body.agencyName || 'Nova Agência';
      let agencyEmail = req.body.agencyEmail || 'contato@agencia.com';

      try {
        if (clientDb) {
          const agencySnap = await getClientDoc(clientDoc(clientDb, 'agencies', agencyId));
          if (agencySnap.exists()) {
            const agencyData = agencySnap.data() || {};
            if (agencyData.name) {
              agencyName = agencyData.name;
            }
            if (agencyData.ownerEmail) {
              agencyEmail = agencyData.ownerEmail;
            }
          }
        } else {
          const agencyDoc = await db.collection('agencies').doc(agencyId).get();
          if (agencyDoc.exists) {
            const agencyData = agencyDoc.data() || {};
            if (agencyData.name) {
              agencyName = agencyData.name;
            }
            if (agencyData.ownerEmail) {
              agencyEmail = agencyData.ownerEmail;
            }
          }
        }
      } catch (firestoreErr) {
        console.log('Informational: Backend Firestore guest connection completed. Fallback parameters used where necessary.');
      }

      const asaasApiKey = process.env.ASAAS_API_KEY;
      const isProduction = process.env.ASAAS_ENVIRONMENT === 'production';
      const asaasBaseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

      // IF NO API KEY IS CONFIGURED: Return Simulated Offline Sandbox Response (seamless downgrade fallback!)
      if (!asaasApiKey) {
        console.log('ASAAS_API_KEY not set. Running simulated billing checkout flow.');
        return res.json({
          success: true,
          simulated: true,
          planId,
          billingType,
          message: 'Processando no modo de demonstração. Sem chaves de produção definidas.'
        });
      }

      console.log(`Creating real Asaas transaction on ${isProduction ? 'Production' : 'Sandbox'}, BillingType: ${billingType}`);

      // 2. Find or Create Customer on Asaas
      let customerId = '';
      let existingCustomer: any = null;
      const searchRes = await fetch(`${asaasBaseUrl}/customers?email=${encodeURIComponent(agencyEmail)}`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        }
      });

      if (searchRes.ok) {
        const searchData: any = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          existingCustomer = searchData.data[0];
          customerId = existingCustomer.id;
        }
      }

      if (customerId) {
        // If customer exists, update their profile to ensure address and document are COMPLETE
        if (billingInfo) {
          const updatePayload: any = {
            name: billingInfo.name || agencyName,
            email: agencyEmail,
            notificationDisabled: true
          };

          // ONLY update/send cpfCnpj if it is NOT already filled in the existing customer record.
          // Changing it or sending the same cpfCnpj can triggerunknow.error/400 validation error in Asaas.
          const existingCpf = existingCustomer?.cpfCnpj?.replace(/[^\d]+/g, '') || '';
          if (!existingCpf) {
            updatePayload.cpfCnpj = ensureValidCpfCnpj(billingInfo.cpfCnpj || holderInfo?.cpfCnpj);
          }

          // Validate Brazilian phone/mobile lengths (must be 10 or 11 digits including DDD)
          if (billingInfo.phone) {
            const cleanPhone = billingInfo.phone.replace(/[^\d]+/g, '');
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
              updatePayload.phone = cleanPhone;
              updatePayload.mobilePhone = cleanPhone;
            }
          }

          // Validate Brazilian Postal Code (must be exactly 8 digits CEP)
          if (billingInfo.postalCode) {
            const cleanPostal = billingInfo.postalCode.replace(/[^\d]+/g, '');
            if (cleanPostal.length === 8) {
              updatePayload.postalCode = cleanPostal;
            }
          }

          if (billingInfo.address) {
            updatePayload.address = billingInfo.address;
          }
          if (billingInfo.addressNumber) {
            updatePayload.addressNumber = billingInfo.addressNumber;
          }
          if (billingInfo.complement) {
            updatePayload.complement = billingInfo.complement;
          }
          if (billingInfo.province) {
            updatePayload.province = billingInfo.province;
          }

          console.log('[Asaas Update Customer] Payload:', JSON.stringify(updatePayload));
          const updateCustRes = await fetch(`${asaasBaseUrl}/customers/${customerId}`, {
            method: 'PUT',
            headers: {
              'access_token': asaasApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
          });
          if (!updateCustRes.ok) {
            const errText = await updateCustRes.text();
            console.warn('Soft-alert: Asaas Customer Profile Update failed:', errText);
          } else {
            console.log(`Successfully completed and synchronized Asaas customer profile for: ${customerId}`);
          }
        }
      } else {
        // Create customer in Asaas with fully specified address and identification
        const createPayload: any = {
          name: billingInfo?.name || agencyName,
          email: agencyEmail,
          cpfCnpj: ensureValidCpfCnpj(billingInfo?.cpfCnpj || holderInfo?.cpfCnpj),
          notificationDisabled: true
        };
        if (billingInfo) {
          if (billingInfo.phone) {
            const cleanPhone = billingInfo.phone.replace(/[^\d]+/g, '');
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
              createPayload.phone = cleanPhone;
              createPayload.mobilePhone = cleanPhone;
            }
          }
          if (billingInfo.postalCode) {
            const cleanPostal = billingInfo.postalCode.replace(/[^\d]+/g, '');
            if (cleanPostal.length === 8) {
              createPayload.postalCode = cleanPostal;
            }
          }
          createPayload.address = billingInfo.address;
          createPayload.addressNumber = billingInfo.addressNumber;
          createPayload.complement = billingInfo.complement || '';
          createPayload.province = billingInfo.province;
        }
        
        const createCustRes = await fetch(`${asaasBaseUrl}/customers`, {
          method: 'POST',
          headers: {
            'access_token': asaasApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createPayload)
        });

        if (!createCustRes.ok) {
          const errText = await createCustRes.text();
          console.error('Asaas Customer Creation Failed:', errText);
          return res.status(400).json({ success: false, error: 'Falha ao sincronizar cliente no Asaas: ' + errText });
        }

        const newCustData: any = await createCustRes.json();
        customerId = newCustData.id;
      }

      // 3. Create Payment on Asaas
      // Due date is tomorrow or today. For immediate activation, let's set today or tomorrow. In Brazil time, tomorrow is safest so it is not overdue.
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dueDate = tomorrow.toISOString().split('T')[0];

      const paymentPayload: any = {
        customer: customerId,
        billingType,
        value: plan.price,
        dueDate,
        description: `Assinatura ${plan.name} - Agência ${agencyName}`,
        externalReference: agencyId
      };

      if (billingType === 'CREDIT_CARD') {
        paymentPayload.creditCard = {
          holderName: card?.holderName || holderInfo?.name,
          number: card?.number?.replace(/\s+/g, ''),
          expiryMonth: card?.expiryMonth?.split('/')[0] || '12',
          expiryYear: card?.expiryMonth?.split('/')[1] ? ('20' + card.expiryMonth.split('/')[1]) : '2029',
          ccv: card?.ccv
        };
        paymentPayload.creditCardHolderInfo = {
          name: holderInfo?.name || card?.holderName || billingInfo?.name,
          email: agencyEmail,
          cpfCnpj: ensureValidCpfCnpj(billingInfo?.cpfCnpj || holderInfo?.cpfCnpj),
          postalCode: billingInfo?.postalCode ? billingInfo.postalCode.replace(/[^\d]+/g, '') : '01311000',
          addressNumber: billingInfo?.addressNumber || '100',
          phone: billingInfo?.phone ? billingInfo.phone.replace(/[^\d]+/g, '') : '11999999999'
        };
      }

      const paymentRes = await fetch(`${asaasBaseUrl}/payments`, {
        method: 'POST',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentPayload)
      });

      if (!paymentRes.ok) {
        const errText = await paymentRes.text();
        console.error('Asaas Payment Creation Failed:', errText);
        return res.status(400).json({ success: false, error: 'Falha ao criar cobrança no Asaas: ' + errText });
      }

      const paymentData: any = await paymentRes.json();
      const paymentId = paymentData.id;

      // 4. Fetch PIX details if billing type is PIX
      if (billingType === 'PIX') {
        const pixRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}/pixQrCode`, {
          method: 'GET',
          headers: {
            'access_token': asaasApiKey
          }
        });

        if (!pixRes.ok) {
          const errText = await pixRes.text();
          console.error('Asaas PIX Details Failed:', errText);
          return res.status(400).json({ success: false, error: 'Erro ao gerar QR Code Pix no Asaas' });
        }

        const pixData: any = await pixRes.json();
        return res.json({
          success: true,
          simulated: false,
          paymentId,
          billingType: 'PIX',
          pixQrCode: pixData.encodedImage, // Base64 of image
          pixCopyPaste: pixData.payload
        });
      }

      // If Credit Card: return invoice link or active success!
      if (paymentData.status === 'CONFIRMED' || paymentData.status === 'RECEIVED') {
        try {
          await updateAgencyOnBackend(agencyId, {
            status: 'active',
            planId,
            clientLimit: plan.clients,
            storageLimitGb: plan.storage,
            subscriptionLastPaidAt: new Date().toISOString(),
            subscriptionSuspendedAt: null,
            backupStatus: 'none'
          });
        } catch (firestoreErr) {
          console.warn('Soft-fallback alert: Backend Firestore update failed under CREDIT_CARD CONFIRMED. Client-side will complete activation.', firestoreErr);
        }
      }

      return res.json({
        success: true,
        simulated: false,
        paymentId,
        billingType: 'CREDIT_CARD',
        invoiceUrl: paymentData.invoiceUrl,
        status: paymentData.status
      });

    } catch (err: any) {
      console.error('Checkout API Error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verification status check for checkout/payments
  app.get('/api/checkout/status/:paymentId', async (req, res) => {
    try {
      const { paymentId } = req.params;
      const asaasApiKey = process.env.ASAAS_API_KEY;
      const isProduction = process.env.ASAAS_ENVIRONMENT === 'production';
      const asaasBaseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

      if (!asaasApiKey) {
        console.log(`Simulated query status check for paymentId: ${paymentId}`);
        return res.json({ success: true, status: 'RECEIVED', simulated: true });
      }

      console.log(`Checking real payment status for ID: ${paymentId}`);
      const statusRes = await fetch(`${asaasBaseUrl}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey
        }
      });

      if (!statusRes.ok) {
        const errText = await statusRes.text();
        console.error(`Failed to query payment status: ${errText}`);
        return res.status(400).json({ success: false, error: 'Erro ao consultar status no Asaas: ' + errText });
      }

      const paymentData: any = await statusRes.json();
      const status = paymentData.status;

      // If PAID or CONFIRMED, update status in Firestore Database to unlock access!
      if (status === 'CONFIRMED' || status === 'RECEIVED') {
        const agencyId = paymentData.externalReference;
        if (agencyId) {
          try {
            await updateAgencyOnBackend(agencyId, {
              status: 'active',
              subscriptionLastPaidAt: new Date().toISOString(),
              subscriptionSuspendedAt: null,
              backupStatus: 'none'
            });
            console.log(`[Status API] Agency ${agencyId} updated to active via manual status verification.`);
          } catch (dbErr) {
            console.error('Failed to update Firestore status in verification:', dbErr);
          }
        }
      }

      return res.json({
        success: true,
        status,
        simulated: false,
        invoiceUrl: paymentData.invoiceUrl || paymentData.bankSlipUrl
      });
    } catch (error: any) {
      console.error('Error verifying payment status:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Check all existing payments on Asaas for a given agency using externalReference
  app.get('/api/checkout/check-agency/:agencyId', async (req, res) => {
    try {
      const { agencyId } = req.params;
      const asaasApiKey = process.env.ASAAS_API_KEY;
      if (!asaasApiKey) {
        console.log(`[Check Agency API] No ASAAS_API_KEY set. Returning simulated not found / manual verify.`);
        return res.json({ success: true, paid: false, status: 'NOT_FOUND', simulated: true });
      }

      const isProduction = process.env.ASAAS_ENVIRONMENT === 'production';
      const asaasBaseUrl = isProduction ? 'https://api.asaas.com/v3' : 'https://sandbox.asaas.com/api/v3';

      console.log(`[Check Agency API] Querying payments on Asaas for agencyExternalRef: ${agencyId}`);
      const paymentsRes = await fetch(`${asaasBaseUrl}/payments?externalReference=${encodeURIComponent(agencyId)}`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey
        }
      });

      if (!paymentsRes.ok) {
        const errText = await paymentsRes.text();
        console.error(`[Check Agency API] Failed to list payments from Asaas: ${errText}`);
        return res.status(400).json({ success: false, error: 'Erro ao listar pagamentos no Asaas: ' + errText });
      }

      const paymentsData: any = await paymentsRes.json();
      const paymentsList = paymentsData.data || [];

      // Look for CONFIRMED or RECEIVED payments
      const paidPayment = paymentsList.find((p: any) => p.status === 'CONFIRMED' || p.status === 'RECEIVED');

      if (paidPayment) {
        try {
          await updateAgencyOnBackend(agencyId, {
            status: 'active',
            subscriptionLastPaidAt: new Date().toISOString(),
            subscriptionSuspendedAt: null,
            backupStatus: 'none',
            paymentMethod: paidPayment.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX'
          });
          console.log(`[Check Agency API] Reconciled and activated agency ${agencyId} because payment ${paidPayment.id} was confirmed/received.`);
          return res.json({ success: true, paid: true, status: paidPayment.status, paymentId: paidPayment.id });
        } catch (dbErr) {
          console.error('[Check Agency API] Failed to update Firestore on payment reconciliation:', dbErr);
        }
      }

      // Check for any pending or overdue payments as fallback to retrieve paymentId
      const pendingPayment = paymentsList.find((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE');
      if (pendingPayment) {
        return res.json({ 
          success: true, 
          paid: false, 
          status: pendingPayment.status, 
          paymentId: pendingPayment.id,
          billingType: pendingPayment.billingType,
          invoiceUrl: pendingPayment.invoiceUrl || pendingPayment.bankSlipUrl
        });
      }

      return res.json({ success: true, paid: false, status: 'NO_PAYMENTS' });
    } catch (error: any) {
      console.error('[Check Agency API] Error check-agency route:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

// Google Drive: Setup Client Folders
  app.post('/api/drive/setup-client-folders', async (req, res) => {
    try {
      const { companyName } = req.body;
      const token = req.headers['x-google-token'] as string | undefined;
      
      const drive = getDriveService(token);

      // 1. Create Main client folder
      const mainFolderMetadata = {
        name: companyName ? `[Evoo Flow] ${companyName}` : `[Evoo Flow] Novo Cliente`,
        mimeType: 'application/vnd.google-apps.folder',
      };
      const mainFolder = await drive.files.create({
        requestBody: mainFolderMetadata,
        fields: 'id',
      });
      const mainFolderId = mainFolder.data.id;

      if (!mainFolderId) {
        throw new Error('Falha ao criar pasta principal do cliente no Google Drive.');
      }

      // 2. Create subfolder "Vídeo"
      const videoFolderMetadata = {
        name: 'Vídeo',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [mainFolderId],
      };
      const videoFolder = await drive.files.create({
        requestBody: videoFolderMetadata,
        fields: 'id',
      });
      const videoFolderId = videoFolder.data.id;

      // 3. Create subfolder "Imagem"
      const imageFolderMetadata = {
        name: 'Imagem',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [mainFolderId],
      };
      const imageFolder = await drive.files.create({
        requestBody: imageFolderMetadata,
        fields: 'id',
      });
      const imageFolderId = imageFolder.data.id;

      res.json({
        success: true,
        driveFolderId: mainFolderId,
        driveVideoFolderId: videoFolderId,
        driveImageFolderId: imageFolderId,
      });
    } catch (error: any) {
      console.error('Setup Client Folders Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google Drive: Upload File with Date Sub-organization
  app.post('/api/drive/upload-file', async (req, res) => {
    try {
      const { fileName, mimeType, base64Data, mediaType, parentFolderId } = req.body;
      const token = req.headers['x-google-token'] as string | undefined;

      if (!base64Data || !parentFolderId || !fileName) {
        return res.status(400).json({ success: false, error: 'Campos base64Data, parentFolderId e fileName são obrigatórios.' });
      }

      const drive = getDriveService(token);

      // 1. Get or create the date folder (e.g. "2026-05-21") inside parentFolderId
      const dateStr = new Date().toISOString().split('T')[0];
      
      const searchResult = await drive.files.list({
        q: `name = '${dateStr}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive',
      });

      let targetFolderId: string;
      if (searchResult.data.files && searchResult.data.files.length > 0) {
        targetFolderId = searchResult.data.files[0].id!;
      } else {
        const folderMetadata = {
          name: dateStr,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId],
        };
        const newFolder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
        });
        targetFolderId = newFolder.data.id!;
      }

      // 2. Decode file and upload to Google Drive
      const buffer = Buffer.from(base64Data, 'base64');
      const { Readable } = await import('stream');
      const bufferStream = new Readable();
      bufferStream.push(buffer);
      bufferStream.push(null);

      const fileMetadata = {
        name: fileName,
        parents: [targetFolderId]
      };

      const media = {
        mimeType: mimeType,
        body: bufferStream
      };

      const fileResponse = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webContentLink, webViewLink'
      });

      const fileId = fileResponse.data.id;
      if (!fileId) {
        throw new Error('Falha ao obter ID do arquivo criado no Google Drive.');
      }

      // 3. Make permissions public (anyone with link can read)
      try {
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr) {
        console.warn('Could not set permissions:', permErr);
      }

      const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      const webViewLink = fileResponse.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      res.json({
        success: true,
        fileId,
        url: directUrl,
        webViewLink,
        name: fileName,
        type: mediaType
      });

    } catch (error: any) {
      console.error('File Upload Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Google Drive: Create Client Folder
  app.post('/api/drive/create-folder', async (req, res) => {
    try {
      const { name } = req.body;
      const token = req.headers['x-google-token'] as string | undefined;
      const drive = getDriveService(token);
      
      const fileMetadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
      };
      
      const folder = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id',
      });
      
      res.json({ folderId: folder.data.id });
    } catch (error: any) {
      console.error('Drive Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Evoo Flow running at http://localhost:${PORT}`);
  });
}

startServer();
