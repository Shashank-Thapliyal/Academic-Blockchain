'use strict';

const { Contract } = require('fabric-contract-api');

class AcademicContract extends Contract {

  _getTxTimestamp(ctx) {
    try {
      const txTimestamp = ctx.stub.getTxTimestamp();
      if (txTimestamp && txTimestamp.seconds !== undefined) {
        const seconds = txTimestamp.seconds.low !== undefined ? txTimestamp.seconds.low : Number(txTimestamp.seconds);
        const nanos = txTimestamp.nanos || 0;
        const millis = (seconds * 1000) + Math.floor(nanos / 1000000);
        return new Date(millis).toISOString();
      }
    } catch (e) {
      // fallback
    }
    return '2024-01-01T00:00:00.000Z';
  }

  async initLedger(ctx) {
    console.info('============= START : Initialize Academic Ledger ===========');
    const timestamp = this._getTxTimestamp(ctx);
    const initMarker = {
      docType: 'networkInit',
      initializedAt: timestamp,
      consortium: 'AcademicConsortium',
      version: '1.0.0'
    };
    await ctx.stub.putState('NETWORK_INIT', Buffer.from(JSON.stringify(initMarker)));
    console.info('============= END : Initialize Academic Ledger ===========');
  }

  // ==========================================
  // MODULE 1: Student Registration & Profile
  // ==========================================

  async RegisterStudent(ctx, studentId, name, email, department, enrollmentYear) {
    console.info(`RegisterStudent: ${studentId}`);
    if (!studentId || !name || !email) {
      throw new Error('studentId, name, and email are required');
    }

    const exists = await this.studentExists(ctx, studentId);
    if (exists) {
      throw new Error(`Student with ID ${studentId} already exists`);
    }

    const timestamp = this._getTxTimestamp(ctx);
    const student = {
      docType: 'student',
      studentId,
      name,
      email,
      department: department || 'General',
      enrollmentYear: enrollmentYear || timestamp.substring(0, 4),
      registeredAt: timestamp
    };

    await ctx.stub.putState(`STUDENT_${studentId}`, Buffer.from(JSON.stringify(student)));
    return JSON.stringify(student);
  }

  async GetStudent(ctx, studentId) {
    const studentAsBytes = await ctx.stub.getState(`STUDENT_${studentId}`);
    if (!studentAsBytes || studentAsBytes.length === 0) {
      throw new Error(`Student ${studentId} does not exist`);
    }
    return studentAsBytes.toString();
  }

  async studentExists(ctx, studentId) {
    const studentAsBytes = await ctx.stub.getState(`STUDENT_${studentId}`);
    return studentAsBytes && studentAsBytes.length > 0;
  }

  // =======================================================
  // MODULE 2: Certificate Request & 7-Stage Approval State Machine
  // SUBMITTED -> FACULTY_APPROVED -> HOD_APPROVED ->
  // DAC_APPROVED -> EXAM_LOCKED -> DEAN_APPROVED -> ADMIN_FINALIZED
  // =======================================================

  async RequestCertificate(ctx, requestId, studentId, certType, detailsJson) {
    console.info(`RequestCertificate: ${requestId} for student: ${studentId}`);
    const studentExists = await this.studentExists(ctx, studentId);
    if (!studentExists) {
      throw new Error(`Student ${studentId} is not registered`);
    }

    const reqKey = `REQ_${requestId}`;
    const existingReq = await ctx.stub.getState(reqKey);
    if (existingReq && existingReq.length > 0) {
      throw new Error(`Request with ID ${requestId} already exists`);
    }

    let parsedDetails = {};
    if (detailsJson) {
      try {
        parsedDetails = JSON.parse(detailsJson);
      } catch (e) {
        parsedDetails = { raw: detailsJson };
      }
    }

    const timestamp = this._getTxTimestamp(ctx);
    const certificateRequest = {
      docType: 'certificateRequest',
      requestId,
      studentId,
      certType: certType || 'Degree Certificate',
      details: parsedDetails,
      status: 'SUBMITTED',
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [
        {
          stage: 'SUBMITTED',
          updatedBy: studentId,
          timestamp,
          comments: 'Certificate request submitted by student'
        }
      ]
    };

    await ctx.stub.putState(reqKey, Buffer.from(JSON.stringify(certificateRequest)));
    return JSON.stringify(certificateRequest);
  }

  async ApproveFaculty(ctx, requestId, facultyId, comments) {
    return await this._transitionState(ctx, requestId, 'SUBMITTED', 'FACULTY_APPROVED', facultyId, comments || 'Faculty approval granted');
  }

  async ApproveHOD(ctx, requestId, hodId, comments) {
    return await this._transitionState(ctx, requestId, 'FACULTY_APPROVED', 'HOD_APPROVED', hodId, comments || 'HOD recommendation approved');
  }

  async ApproveDAC(ctx, requestId, dacMemberId, comments) {
    return await this._transitionState(ctx, requestId, 'HOD_APPROVED', 'DAC_APPROVED', dacMemberId, comments || 'Department Academic Committee approval complete');
  }

  async LockExamGrades(ctx, requestId, examOfficerId, gradesHash, comments) {
    const request = await this._getRequestObject(ctx, requestId);
    if (request.status !== 'DAC_APPROVED') {
      throw new Error(`Invalid stage transition. Expected DAC_APPROVED, but current status is ${request.status}`);
    }

    const timestamp = this._getTxTimestamp(ctx);
    request.status = 'EXAM_LOCKED';
    request.gradesHash = gradesHash || 'GRADES_VERIFIED';
    request.updatedAt = timestamp;
    request.history.push({
      stage: 'EXAM_LOCKED',
      updatedBy: examOfficerId || 'ExamController',
      timestamp,
      gradesHash: request.gradesHash,
      comments: comments || 'Examination records verified and locked'
    });

    await ctx.stub.putState(`REQ_${requestId}`, Buffer.from(JSON.stringify(request)));
    return JSON.stringify(request);
  }

  async ApproveDean(ctx, requestId, deanId, comments) {
    return await this._transitionState(ctx, requestId, 'EXAM_LOCKED', 'DEAN_APPROVED', deanId, comments || 'Dean Academic sanction granted');
  }

  async FinalizeAdmin(ctx, requestId, adminId, comments) {
    return await this._transitionState(ctx, requestId, 'DEAN_APPROVED', 'ADMIN_FINALIZED', adminId, comments || 'Administration final clearance verified for issuance');
  }

  async _transitionState(ctx, requestId, expectedCurrentState, targetState, actorId, comments) {
    const request = await this._getRequestObject(ctx, requestId);
    if (request.status !== expectedCurrentState) {
      throw new Error(`Invalid stage transition. Request ${requestId} is in status '${request.status}', expected '${expectedCurrentState}'`);
    }

    const timestamp = this._getTxTimestamp(ctx);
    request.status = targetState;
    request.updatedAt = timestamp;
    request.history.push({
      stage: targetState,
      updatedBy: actorId || 'SystemAdmin',
      timestamp,
      comments: comments || `Transitioned to ${targetState}`
    });

    await ctx.stub.putState(`REQ_${requestId}`, Buffer.from(JSON.stringify(request)));
    return JSON.stringify(request);
  }

  async _getRequestObject(ctx, requestId) {
    const reqBytes = await ctx.stub.getState(`REQ_${requestId}`);
    if (!reqBytes || reqBytes.length === 0) {
      throw new Error(`Certificate request ${requestId} does not exist`);
    }
    return JSON.parse(reqBytes.toString());
  }

  async GetCertificateRequest(ctx, requestId) {
    const request = await this._getRequestObject(ctx, requestId);
    return JSON.stringify(request);
  }

  // =======================================================
  // MODULE 3 & 4: Certificate Issuance, IPFS Anchor & Verification
  // =======================================================

  async IssueCertificate(ctx, certId, requestId, studentId, certType, ipfsHash, docHash, issueDate) {
    console.info(`IssueCertificate: ${certId}`);
    if (!certId || !studentId || !ipfsHash || !docHash) {
      throw new Error('certId, studentId, ipfsHash, and docHash are required');
    }

    const certKey = `CERT_${certId}`;
    const existingCert = await ctx.stub.getState(certKey);
    if (existingCert && existingCert.length > 0) {
      throw new Error(`Certificate ${certId} already exists`);
    }

    let requestObj = null;
    if (requestId) {
      requestObj = await this._getRequestObject(ctx, requestId);
      if (requestObj.status !== 'ADMIN_FINALIZED') {
        throw new Error(`Cannot issue certificate. Request ${requestId} is not in ADMIN_FINALIZED status (current: ${requestObj.status})`);
      }
    }

    const studentBytes = await ctx.stub.getState(`STUDENT_${studentId}`);
    let studentData = {};
    if (studentBytes && studentBytes.length > 0) {
      studentData = JSON.parse(studentBytes.toString());
    }

    const timestamp = this._getTxTimestamp(ctx);
    let issuerMsp = 'Org3MSP';
    try {
      issuerMsp = ctx.clientIdentity.getMSPID();
    } catch (e) {
      // fallback
    }

    const certificate = {
      docType: 'certificate',
      certId,
      requestId: requestId || '',
      studentId,
      studentName: studentData.name || '',
      department: studentData.department || '',
      certType: certType || 'Degree Certificate',
      ipfsHash,          // CID from IPFS
      docHash,           // SHA-256 hash of certificate file
      issueDate: issueDate || timestamp.substring(0, 10),
      status: 'ISSUED',  // State: ISSUED or REVOKED
      issuerMSP: issuerMsp,
      createdAt: timestamp,
      revocation: null
    };

    // Store certificate
    await ctx.stub.putState(certKey, Buffer.from(JSON.stringify(certificate)));

    // Store hash mapping for O(1) reverse lookup by file hash
    await ctx.stub.putState(`HASH_${docHash}`, Buffer.from(certId));

    // Update request state if linked
    if (requestObj) {
      requestObj.status = 'CERTIFICATE_ISSUED';
      requestObj.certificateId = certId;
      requestObj.updatedAt = timestamp;
      requestObj.history.push({
        stage: 'CERTIFICATE_ISSUED',
        updatedBy: issuerMsp,
        timestamp,
        comments: `Certificate issued with ID ${certId} and IPFS CID ${ipfsHash}`
      });
      await ctx.stub.putState(`REQ_${requestId}`, Buffer.from(JSON.stringify(requestObj)));
    }

    return JSON.stringify(certificate);
  }

  async VerifyCertificate(ctx, certId) {
    console.info(`VerifyCertificate: ${certId}`);
    const certBytes = await ctx.stub.getState(`CERT_${certId}`);
    if (!certBytes || certBytes.length === 0) {
      return JSON.stringify({
        certId,
        verificationStatus: 'INVALID',
        message: 'Certificate not found on blockchain ledger',
        verified: false
      });
    }

    const cert = JSON.parse(certBytes.toString());
    if (cert.status === 'REVOKED') {
      return JSON.stringify({
        certId,
        verificationStatus: 'REVOKED',
        message: 'Certificate was issued but subsequently revoked',
        verified: false,
        certificate: cert
      });
    }

    return JSON.stringify({
      certId,
      verificationStatus: 'VERIFIED',
      message: 'Certificate is valid and authentic on Hyperledger Fabric ledger',
      verified: true,
      certificate: cert
    });
  }

  async VerifyCertificateByHash(ctx, docHash) {
    console.info(`VerifyCertificateByHash: ${docHash}`);
    const certIdBytes = await ctx.stub.getState(`HASH_${docHash}`);
    if (!certIdBytes || certIdBytes.length === 0) {
      return JSON.stringify({
        docHash,
        verificationStatus: 'INVALID',
        message: 'No certificate matching this SHA-256 hash found on ledger',
        verified: false
      });
    }

    const certId = certIdBytes.toString();
    return await this.VerifyCertificate(ctx, certId);
  }

  async RevokeCertificate(ctx, certId, reason, revokedBy) {
    console.info(`RevokeCertificate: ${certId}`);
    const certBytes = await ctx.stub.getState(`CERT_${certId}`);
    if (!certBytes || certBytes.length === 0) {
      throw new Error(`Certificate ${certId} does not exist`);
    }

    const cert = JSON.parse(certBytes.toString());
    if (cert.status === 'REVOKED') {
      throw new Error(`Certificate ${certId} has already been revoked`);
    }

    const timestamp = this._getTxTimestamp(ctx);
    cert.status = 'REVOKED';
    cert.revocation = {
      reason: reason || 'Academic misconduct or administrative revocation',
      revokedBy: revokedBy || 'DeanAdmin',
      revokedAt: timestamp
    };

    await ctx.stub.putState(`CERT_${certId}`, Buffer.from(JSON.stringify(cert)));
    return JSON.stringify(cert);
  }

  // =======================================================
  // Query Helpers for Dashboards & Audits
  // ==========================================

  async GetAllRequests(ctx) {
    return await this._queryByPrefix(ctx, 'REQ_');
  }

  async GetAllCertificates(ctx) {
    return await this._queryByPrefix(ctx, 'CERT_');
  }

  async GetAllStudents(ctx) {
    return await this._queryByPrefix(ctx, 'STUDENT_');
  }

  async _queryByPrefix(ctx, prefix) {
    const iterator = await ctx.stub.getStateByRange(prefix, prefix + '\uffff');
    const results = [];
    let result = await iterator.next();
    while (!result.done) {
      if (result.value && result.value.value.toString()) {
        try {
          results.push(JSON.parse(result.value.value.toString('utf8')));
        } catch (e) {
          results.push(result.value.value.toString('utf8'));
        }
      }
      result = await iterator.next();
    }
    await iterator.close();
    return JSON.stringify(results);
  }
}

module.exports = AcademicContract;
