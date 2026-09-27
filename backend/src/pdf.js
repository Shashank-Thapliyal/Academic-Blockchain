'use strict';

const os = require('os');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');

/**
 * Get host address accessible from mobile phones on the same Wi-Fi network.
 */
function getPortalBaseUrl() {
  if (process.env.PORTAL_URL) {
    return process.env.PORTAL_URL.replace(/\/$/, '');
  }
  if (process.env.HOST_IP) {
    return `http://${process.env.HOST_IP}:3000`;
  }
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Find non-internal IPv4 address (e.g. 192.168.x.x, 10.x.x.x, 172.x.x.x)
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('127.')) {
          return `http://${iface.address}:3000`;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return 'http://localhost:3000';
}

/**
 * Generate an official Academic Certificate PDF as a Buffer.
 * @param {Object} certData
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePDF(certData) {
  const baseUrl = getPortalBaseUrl();
  const verifyUrl = `${baseUrl}/verify.html?certId=${encodeURIComponent(certData.certId)}`;
  
  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verifyUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      width: 140,
      color: {
        dark: '#1e3a8a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR buffer:', err);
  }

  return new Promise((resolve, reject) => {
    try {
      const fixedDate = certData.createdAt ? new Date(certData.createdAt) : (certData.issueDate ? new Date(certData.issueDate) : new Date('2024-01-01T00:00:00.000Z'));
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        info: {
          Title: `Academic Certificate - ${certData.certId}`,
          Author: 'Academic Consortium University',
          Subject: certData.certType || 'Degree Completion',
          CreationDate: fixedDate,
          ModDate: fixedDate
        }
      });

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const width = doc.page.width;
      const height = doc.page.height;
      const contentWidth = width - 80;

      // Outer Decorative Border
      doc.rect(20, 20, width - 40, height - 40)
         .lineWidth(3)
         .strokeColor('#1e3a8a')
         .stroke();

      // Inner Border
      doc.rect(26, 26, width - 52, height - 52)
         .lineWidth(1)
         .strokeColor('#93c5fd')
         .stroke();

      // ==========================================
      // 1. Central Header & Title Section
      // ==========================================
      let currY = 45;

      doc.font('Helvetica-Bold')
         .fontSize(24)
         .fillColor('#1e3a8a')
         .text('ACADEMIC CONSORTIUM UNIVERSITY', 40, currY, { width: contentWidth, align: 'center' });

      currY += 28;
      doc.fontSize(11)
         .font('Helvetica')
         .fillColor('#64748b')
         .text('Office of the Controller of Examinations & Central Registry', 40, currY, { width: contentWidth, align: 'center' });

      currY += 20;
      doc.fontSize(17)
         .font('Helvetica-Bold')
         .fillColor('#0f172a')
         .text('CERTIFICATE OF DEGREE COMPLETION', 40, currY, { width: contentWidth, align: 'center', characterSpacing: 1 });

      currY += 20;
      doc.fontSize(10)
         .font('Helvetica-Oblique')
         .fillColor('#475569')
         .text('This tamper-evident credential is authenticated and anchored on Hyperledger Fabric.', 40, currY, { width: contentWidth, align: 'center' });

      // ==========================================
      // 2. Candidate & Degree Body
      // ==========================================
      currY += 28;
      doc.fontSize(13)
         .font('Helvetica')
         .fillColor('#334155')
         .text('This is to certify that', 40, currY, { width: contentWidth, align: 'center' });

      currY += 20;
      doc.fontSize(22)
         .font('Helvetica-Bold')
         .fillColor('#1e3a8a')
         .text(certData.studentName || 'Student Name', 40, currY, { width: contentWidth, align: 'center' });

      currY += 26;
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#334155')
         .text(`bearing Registration ID: ${certData.studentId || 'N/A'}`, 40, currY, { width: contentWidth, align: 'center' });

      currY += 18;
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#334155')
         .text(`has successfully satisfied all requirements of the Department of ${certData.department || 'Computer Science & Engineering'}`, 40, currY, { width: contentWidth, align: 'center' });

      currY += 18;
      doc.fontSize(12)
         .font('Helvetica')
         .fillColor('#334155')
         .text('and has been officially conferred the award of', 40, currY, { width: contentWidth, align: 'center' });

      currY += 22;
      doc.fontSize(17)
         .font('Helvetica-Bold')
         .fillColor('#0284c7')
         .text(certData.certType || 'Bachelor of Technology in Computer Science', 40, currY, { width: contentWidth, align: 'center' });

      // ==========================================
      // 3. Embedded Verification QR Code (Top-Right Overlay)
      // ==========================================
      if (qrBuffer) {
        const qrX = width - 115;
        const qrY = 36;
        doc.image(qrBuffer, qrX, qrY, { width: 66, height: 66 });
        doc.fontSize(7)
           .font('Helvetica-Bold')
           .fillColor('#1e3a8a')
           .text('SCAN TO VERIFY', qrX - 10, qrY + 68, { width: 86, align: 'center' });
      }

      // ==========================================
      // 4. Multi-Org Signatures
      // ==========================================
      const sigY = height - 120;
      doc.fontSize(10).font('Helvetica').fillColor('#0f172a');

      // Org1 Signature (Faculty / Academic)
      doc.text('_____________________________', 60, sigY);
      doc.text('Head of Department (CSE)', 60, sigY + 15);
      doc.fontSize(8).fillColor('#64748b').text('Org 1: Academic Authority', 60, sigY + 28);

      // Org2 Signature (Exam Controller)
      doc.fontSize(10).fillColor('#0f172a');
      doc.text('_____________________________', width / 2 - 80, sigY);
      doc.text('Controller of Examinations', width / 2 - 80, sigY + 15);
      doc.fontSize(8).fillColor('#64748b').text('Org 2: Evaluation Authority', width / 2 - 80, sigY + 28);

      // Org3 Signature (Dean / Administration)
      doc.fontSize(10).fillColor('#0f172a');
      doc.text('_____________________________', width - 220, sigY);
      doc.text('Dean / Registrar', width - 220, sigY + 15);
      doc.fontSize(8).fillColor('#64748b').text('Org 3: Central Governance', width - 220, sigY + 28);

      // ==========================================
      // 5. Verification Footnote & Ledger Metadata
      // ==========================================
      const footerY = height - 52;
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor('#475569')
         .text(`Certificate ID: ${certData.certId}  |  Issue Date: ${certData.issueDate || new Date().toISOString().substring(0, 10)}  |  Request ID: ${certData.requestId || 'N/A'}`, 40, footerY, { width: contentWidth, align: 'center' });

      doc.fontSize(7)
         .fillColor('#94a3b8')
         .text(`IPFS / SHA-256 Distributed Proof: Validated by 3-Org Consortium Consensus (Org1, Org2, Org3)`, 40, footerY + 12, { width: contentWidth, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatePDF, getPortalBaseUrl };
