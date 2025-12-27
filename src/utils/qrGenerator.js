import QRCode from 'qrcode';
import crypto from 'crypto';

export const generateMemberId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MEM${timestamp}${random}`;
};

export const generateQRCodeData = (gymId, memberId) => {
  // Permanent QR data: only gymId and memberId (must never change)
  return JSON.stringify({ gymId, memberId });
};

export const generateQRCodeImage = async (data) => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 1,
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const validateQRCodeData = (qrData, expectedGymId = null) => {
  try {
    const data = JSON.parse(qrData);

    // Expect only gymId and memberId for permanent QR codes
    if (!data.gymId || !data.memberId) {
      return { valid: false, error: 'Invalid QR code format' };
    }

    // Verify gymId matches if provided
    if (expectedGymId && data.gymId !== expectedGymId) {
      return { valid: false, error: 'QR code does not belong to this gym' };
    }

    return { valid: true, gymId: data.gymId, memberId: data.memberId };
  } catch (error) {
    return { valid: false, error: 'Invalid QR code data' };
  }
};
