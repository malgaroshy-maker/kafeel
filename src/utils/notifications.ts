/**
 * Notification Service for Kafeel (كفيل)
 * Handles SMS and WhatsApp alerts for match notifications.
 */

export interface NotificationPayload {
  to: string; // Phone number
  message: string;
  type: 'sms' | 'whatsapp';
}

class NotificationService {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Sends a notification via the specified channel.
   * Currently logs to console in development, can be connected to a real API for production.
   */
  async sendNotification(payload: NotificationPayload): Promise<boolean> {
    const { to, message, type } = payload;

    if (this.isDevelopment) {
      console.log(`%c[NOTIFICATION][${type.toUpperCase()}] to ${to}:`, 'color: #3b82f6; font-weight: bold;', message);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    }

    try {
      // TODO: Connect to real SMS/WhatsApp API (e.g., Twilio, Infobip, or local Libyan provider)
      // Example:
      // const response = await fetch('https://api.provider.com/send', {
      //   method: 'POST',
      //   body: JSON.stringify(payload)
      // });
      // return response.ok;
      
      console.warn('Real notification API not yet configured for production.');
      return false;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Sends a match alert to a customer and guarantor.
   */
  async sendMatchAlert(customerName: string, customerPhone: string, guarantorName: string, guarantorPhone: string) {
    const customerMsg = `عزيزي ${customerName}، تم العثور على كفيل مناسب (${guarantorName}). يرجى مراجعة المكتب لإتمام الإجراءات.`;
    const guarantorMsg = `عزيزي ${guarantorName}، تم اختيارك ككفيل لـ ${customerName}. يرجى مراجعة المكتب لإتمام الإجراءات.`;

    await Promise.all([
      this.sendNotification({ to: customerPhone, message: customerMsg, type: 'whatsapp' }),
      this.sendNotification({ to: guarantorPhone, message: guarantorMsg, type: 'whatsapp' })
    ]);
  }
}

export const notificationService = new NotificationService();
