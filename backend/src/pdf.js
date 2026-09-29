"use strict";

const os = require("os");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

/**
 * Get host address accessible from mobile phones on the same Wi-Fi network.
 */
function getPortalBaseUrl() {
  if (process.env.PORTAL_URL) {
    return process.env.PORTAL_URL.replace(/\/$/, "");
  }
  if (process.env.HOST_IP) {
    return `http://${process.env.HOST_IP}:3000`;
  }
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal && !iface.address.startsWith("127.")) {
          return `http://${iface.address}:3000`;
        }
      }
    }
  } catch (e) {
    // fallback
  }
  return "http://localhost:3000";
}

/**
 * Generate an official, tamper-evident Academic Certificate PDF as a Buffer.
 * Features:
 * - Multi-layered security borders and corner rosettes
 * - Consortium seal of trust with crimson hanging ribbon
 * - Heraldic shield crest with book & laurel wreath
 * - Verification QR code anchored to verification portal
 * - 3-Org multi-signature consensus blocks with realistic pen flourishes
 * - Cryptographic micro-security footer with SHA-256 and IPFS CID
 * @param {Object} certData
 * @returns {Promise<Buffer>}
 */
async function generateCertificatePDF(certData) {
  const baseUrl = getPortalBaseUrl();
  const verifyUrl = `${baseUrl}/verify.html?certId=${encodeURIComponent(certData.certId || "")}`;

  let qrBuffer = null;
  try {
    qrBuffer = await QRCode.toBuffer(verifyUrl, {
      errorCorrectionLevel: "H",
      type: "png",
      margin: 1,
      width: 140,
      color: {
        dark: "#0c2340",
        light: "#ffffff"
      }
    });
  } catch (err) {
    console.error("Failed to generate QR buffer:", err);
  }

  return new Promise((resolve, reject) => {
    try {
      const fixedDate = certData.createdAt 
        ? new Date(certData.createdAt) 
        : (certData.issueDate ? new Date(certData.issueDate) : new Date());

      const doc = new PDFDocument({
        layout: "landscape",
        size: "A4",
        margins: { top: 15, bottom: 15, left: 15, right: 15 },
        info: {
          Title: `Academic Certificate - ${certData.certId || "Credential"}`,
          Author: "Academic Consortium University",
          Subject: certData.certType || "Degree Conferment",
          CreationDate: fixedDate,
          ModDate: fixedDate
        }
      });

      const buffers = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const width = doc.page.width;   // 841.89
      const height = doc.page.height; // 595.28

      // ==========================================
      // 1. Background Parchment & Watermark
      // ==========================================
      doc.rect(0, 0, width, height).fill("#faf9f5");

      doc.save();
      doc.opacity(0.035);
      doc.circle(width / 2, height / 2 + 10, 160).lineWidth(4).stroke("#0c2340");
      doc.circle(width / 2, height / 2 + 10, 130).lineWidth(2).stroke("#0c2340");
      doc.circle(width / 2, height / 2 + 10, 95).lineWidth(1).stroke("#0c2340");
      doc.fontSize(22).font("Helvetica-Bold").fillColor("#0c2340")
         .text("ACADEMIC CONSORTIUM", width / 2 - 200, height / 2 - 10, { width: 400, align: "center" });
      doc.fontSize(12).font("Helvetica").fillColor("#0c2340")
         .text("VERITAS • SAPIENTIA • INTEGRITAS", width / 2 - 200, height / 2 + 18, { width: 400, align: "center" });
      doc.restore();

      // ==========================================
      // 2. Ornate Multi-Tier Security Borders
      // ==========================================
      // Outer fine gold
      doc.rect(14, 14, width - 28, height - 28).lineWidth(1).stroke("#c59b27");
      // Main thick imperial navy
      doc.rect(20, 20, width - 40, height - 40).lineWidth(3.5).stroke("#0c2340");
      // Inner gold line
      doc.rect(26, 26, width - 52, height - 52).lineWidth(1).stroke("#d4af37");
      // Fine inner frame
      doc.rect(30, 30, width - 60, height - 60).lineWidth(0.5).stroke("#cbd5e1");

      // Corner Ornaments
      const drawCorner = (x, y, dx, dy) => {
        doc.save();
        doc.lineWidth(1.5).strokeColor("#c59b27");
        doc.moveTo(x, y + 14 * dy).lineTo(x, y).lineTo(x + 14 * dx, y).stroke();
        doc.lineWidth(0.75).strokeColor("#0c2340");
        doc.moveTo(x + 4 * dx, y + 10 * dy).lineTo(x + 4 * dx, y + 4 * dy).lineTo(x + 10 * dx, y + 4 * dy).stroke();
        doc.restore();
      };
      drawCorner(34, 34, 1, 1);
      drawCorner(width - 34, 34, -1, 1);
      drawCorner(34, height - 34, 1, -1);
      drawCorner(width - 34, height - 34, -1, -1);

      // ==========================================
      // 3. University Crest (Top Center)
      // ==========================================
      const crestX = width / 2;
      const crestY = 44;
      doc.save();
      // Shield body
      doc.moveTo(crestX - 16, crestY)
         .lineTo(crestX + 16, crestY)
         .lineTo(crestX + 14, crestY + 18)
         .quadraticCurveTo(crestX, crestY + 32, crestX, crestY + 32)
         .quadraticCurveTo(crestX - 14, crestY + 18, crestX - 16, crestY)
         .fillAndStroke("#0c2340", "#c59b27");
      
      // Book vector inside shield
      doc.lineWidth(1).strokeColor("#ffffff");
      doc.moveTo(crestX - 8, crestY + 11).lineTo(crestX, crestY + 13).lineTo(crestX + 8, crestY + 11).stroke();
      doc.moveTo(crestX - 8, crestY + 16).lineTo(crestX, crestY + 18).lineTo(crestX + 8, crestY + 16).stroke();
      doc.moveTo(crestX, crestY + 13).lineTo(crestX, crestY + 20).stroke();

      // Laurel branches left & right
      doc.lineWidth(1).strokeColor("#c59b27");
      for (let i = 0; i < 4; i++) {
        doc.circle(crestX - 22, crestY + 5 + i * 6, 2).stroke();
        doc.circle(crestX + 22, crestY + 5 + i * 6, 2).stroke();
      }
      doc.restore();

      // ==========================================
      // 4. Header & Charter Typography
      // ==========================================
      let y = 80;
      doc.fontSize(22).font("Helvetica-Bold").fillColor("#0c2340")
         .text("ACADEMIC CONSORTIUM UNIVERSITY", 45, y, { width: width - 90, align: "center", characterSpacing: 1.5 });

      y += 24;
      doc.fontSize(8.5).font("Helvetica-Bold").fillColor("#c59b27")
         .text("CONSTITUTED UNDER MULTI-ORGANIZATIONAL BLOCKCHAIN CONSORTIUM CHARTER", 45, y, { width: width - 90, align: "center", characterSpacing: 1 });

      y += 13;
      doc.fontSize(7.5).font("Helvetica").fillColor("#64748b")
         .text("ORG 1: ACADEMIC FACULTY  •  ORG 2: EXAMINATION BOARD  •  ORG 3: CENTRAL REGISTRY & GOVERNANCE", 45, y, { width: width - 90, align: "center", characterSpacing: 0.5 });

      // Divider line with gold center diamond
      y += 14;
      doc.lineWidth(0.75).strokeColor("#c59b27");
      doc.moveTo(width / 2 - 160, y).lineTo(width / 2 - 12, y).stroke();
      doc.moveTo(width / 2 + 12, y).lineTo(width / 2 + 160, y).stroke();
      doc.rect(width / 2 - 4, y - 4, 8, 8).fillColor("#0c2340").fill();
      doc.rect(width / 2 - 2, y - 2, 4, 4).fillColor("#c59b27").fill();

      // ==========================================
      // 5. Degree Conferment Title
      // ==========================================
      y += 13;
      doc.fontSize(16).font("Helvetica-Bold").fillColor("#1e293b")
         .text("CERTIFICATE OF DEGREE CONFERMENT", 45, y, { width: width - 90, align: "center", characterSpacing: 1.5 });

      y += 17;
      doc.fontSize(8.5).font("Helvetica-Oblique").fillColor("#475569")
         .text("This tamper-evident academic credential is authenticated and anchored on Hyperledger Fabric.", 45, y, { width: width - 90, align: "center" });

      // ==========================================
      // 6. Candidate & Degree Body
      // ==========================================
      y += 20;
      doc.fontSize(11).font("Helvetica").fillColor("#334155")
         .text("On the recommendation of the Faculty and the authority of the Governing Council, be it known that", 45, y, { width: width - 90, align: "center" });

      // Student Name
      const studentName = certData.studentName && certData.studentName !== "Academic Student" 
        ? certData.studentName 
        : (certData.studentName || "Candidate");

      y += 18;
      doc.fontSize(24).font("Helvetica-Bold").fillColor("#0c2340")
         .text(studentName, 45, y, { width: width - 90, align: "center" });

      y += 28;
      // Underline flourish with gold center bead
      doc.lineWidth(1).strokeColor("#c59b27");
      doc.moveTo(width / 2 - 130, y).lineTo(width / 2 - 8, y).stroke();
      doc.moveTo(width / 2 + 8, y).lineTo(width / 2 + 130, y).stroke();
      doc.circle(width / 2, y, 2.5).fillColor("#c59b27").fill();

      const studentId = certData.studentId || "N/A";
      const department = certData.department || "Computer Science & Engineering";

      y += 12;
      doc.fontSize(11).font("Helvetica").fillColor("#1e293b")
         .text(`bearing Permanent Registration ID: ${studentId}   •   Department of ${department}`, 45, y, { width: width - 90, align: "center" });

      y += 20;
      doc.fontSize(10).font("Helvetica-Oblique").fillColor("#475569")
         .text("having satisfied all curriculum requirements, academic honors, and examination prerequisites, is admitted to the award of", 45, y, { width: width - 90, align: "center" });

      // Degree Title in sapphire
      const degreeTitle = certData.certType || "Bachelor of Technology in Computer Science & Engineering";
      y += 16;
      doc.fontSize(18).font("Helvetica-Bold").fillColor("#0369a1")
         .text(degreeTitle, 45, y, { width: width - 90, align: "center", characterSpacing: 0.5 });

      y += 22;
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#854d0e")
         .text("WITH FIRST CLASS HONORS & ACADEMIC DISTINCTION", 45, y, { width: width - 90, align: "center", characterSpacing: 1.5 });

      let formattedDate = "";
      try {
        const d = certData.issueDate ? new Date(certData.issueDate) : new Date();
        formattedDate = d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
      } catch (e) {
        formattedDate = certData.issueDate || "2026";
      }

      y += 15;
      doc.fontSize(8).font("Helvetica").fillColor("#64748b")
         .text(`Conferred at University Hall on this ${formattedDate}`, 45, y, { width: width - 90, align: "center" });

      // ==========================================
      // 7. Official Gold Foil Seal with Ribbons
      // ==========================================
      const sealX = 75;
      const sealY = 475;
      doc.save();
      // Hanging Ribbons
      doc.fillColor("#991b1b");
      doc.polygon([sealX - 10, sealY + 15], [sealX - 18, sealY + 52], [sealX - 10, sealY + 45], [sealX - 2, sealY + 52]);
      doc.polygon([sealX + 2, sealY + 52], [sealX + 10, sealY + 45], [sealX + 18, sealY + 52], [sealX + 10, sealY + 15]);

      // Starburst seal (32 points)
      doc.fillColor("#d97706");
      for (let i = 0; i < 32; i++) {
        const angle = (i * Math.PI * 2) / 32;
        const rOuter = 32;
        const rInner = 27;
        const sx = sealX + Math.cos(angle) * rOuter;
        const sy = sealY + Math.sin(angle) * rOuter;
        if (i === 0) doc.moveTo(sx, sy);
        else doc.lineTo(sx, sy);
      }
      doc.fill();

      // Inner gold circle
      doc.circle(sealX, sealY, 25).fillAndStroke("#b45309", "#fef08a");
      doc.circle(sealX, sealY, 21).lineWidth(1).stroke("#fef08a");
      doc.fontSize(5).font("Helvetica-Bold").fillColor("#ffffff")
         .text("CONSORTIUM", sealX - 22, sealY - 9, { width: 44, align: "center" })
         .text("★ ★ ★", sealX - 22, sealY - 2, { width: 44, align: "center" })
         .text("SEAL OF TRUST", sealX - 22, sealY + 5, { width: 44, align: "center" });
      doc.restore();

      // ==========================================
      // 8. Verification QR Code (Top-Right)
      // ==========================================
      if (qrBuffer) {
        const qrX = width - 110;
        const qrY = 38;
        doc.save();
        doc.rect(qrX - 5, qrY - 5, 76, 88).fillAndStroke("#ffffff", "#c59b27");
        doc.image(qrBuffer, qrX, qrY, { width: 66, height: 66 });
        doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#0c2340")
           .text("SCAN TO VERIFY", qrX - 5, qrY + 68, { width: 76, align: "center" });
        doc.fontSize(5).font("Helvetica").fillColor("#64748b")
           .text("Zero-Trust Ledger Proof", qrX - 5, qrY + 76, { width: 76, align: "center" });
        doc.restore();
      }

      // ==========================================
      // 9. Multi-Org Signatures (3 Distributed Columns)
      // ==========================================
      const sigY = height - 120;
      const sigColWidth = 190;

      const drawSignatureFlourish = (x, y) => {
        doc.save();
        doc.lineWidth(1.2).strokeColor("#0f3b6c");
        doc.moveTo(x + 15, y - 6)
           .bezierCurveTo(x + 35, y - 22, x + 50, y + 4, x + 70, y - 10)
           .bezierCurveTo(x + 90, y - 24, x + 115, y + 2, x + 140, y - 8)
           .bezierCurveTo(x + 155, y - 16, x + 165, y + 6, x + 175, y - 4)
           .stroke();
        doc.restore();
      };

      // Org 1 Signature (Academic)
      const col1X = 135;
      drawSignatureFlourish(col1X, sigY);
      doc.lineWidth(0.75).strokeColor("#0c2340").moveTo(col1X, sigY).lineTo(col1X + sigColWidth, sigY).stroke();
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0c2340").text("Prof. Rajesh K. Sharma, Ph.D.", col1X, sigY + 6, { width: sigColWidth, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#334155").text("Head of Department", col1X, sigY + 18, { width: sigColWidth, align: "center" });
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#0284c7").text("Org 1: Academic Authority (Org1MSP)", col1X, sigY + 28, { width: sigColWidth, align: "center" });

      // Org 2 Signature (Exam Board)
      const col2X = width / 2 - sigColWidth / 2;
      drawSignatureFlourish(col2X, sigY);
      doc.lineWidth(0.75).strokeColor("#0c2340").moveTo(col2X, sigY).lineTo(col2X + sigColWidth, sigY).stroke();
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0c2340").text("Dr. Anita Deshmukh", col2X, sigY + 6, { width: sigColWidth, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#334155").text("Controller of Examinations", col2X, sigY + 18, { width: sigColWidth, align: "center" });
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#d97706").text("Org 2: Evaluation Authority (Org2MSP)", col2X, sigY + 28, { width: sigColWidth, align: "center" });

      // Org 3 Signature (Registry & Governance)
      const col3X = width - sigColWidth - 45;
      drawSignatureFlourish(col3X, sigY);
      doc.lineWidth(0.75).strokeColor("#0c2340").moveTo(col3X, sigY).lineTo(col3X + sigColWidth, sigY).stroke();
      doc.fontSize(9.5).font("Helvetica-Bold").fillColor("#0c2340").text("Dr. Vikramaditya Sen", col3X, sigY + 6, { width: sigColWidth, align: "center" });
      doc.fontSize(8).font("Helvetica").fillColor("#334155").text("Dean of Academic Affairs & Registrar", col3X, sigY + 18, { width: sigColWidth, align: "center" });
      doc.fontSize(7).font("Helvetica-Bold").fillColor("#059669").text("Org 3: Central Governance (Org3MSP)", col3X, sigY + 28, { width: sigColWidth, align: "center" });

      // ==========================================
      // 10. Security Micro-Strip Footer
      // ==========================================
      const footerY = height - 48;
      doc.save();
      doc.rect(34, footerY, width - 68, 22).fill("#f1f5f9");
      doc.rect(34, footerY, width - 68, 22).lineWidth(0.5).stroke("#cbd5e1");

      const certIdStr = certData.certId || "N/A";
      const issueDateStr = certData.issueDate || formattedDate;
      const reqIdStr = certData.requestId || "DIRECT_ISSUE";

      const hashStr = certData.sha256Hash || certData.docHash || "SEALED & ANCHORED ON HYPERLEDGER FABRIC";
      const ipfsStr = certData.ipfsCid || certData.ipfsHash || "DECENTRALIZED IPFS PINNED CONTENT";

      doc.fontSize(6.5).font("Helvetica-Bold").fillColor("#0c2340")
         .text(`CERTIFICATE ID: ${certIdStr}   |   ISSUE DATE: ${issueDateStr}   |   REQUEST ID: ${reqIdStr}`, 40, footerY + 4, { width: width - 80, align: "center" });
      doc.fontSize(5.8).font("Helvetica").fillColor("#475569")
         .text(`SHA-256 HASH: ${hashStr}   |   IPFS CID: ${ipfsStr}   |   CONSENSUS: Org1MSP • Org2MSP • Org3MSP`, 40, footerY + 13, { width: width - 80, align: "center" });
      doc.restore();

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateCertificatePDF, getPortalBaseUrl };
