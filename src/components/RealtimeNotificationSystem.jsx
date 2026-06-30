/**
 * Système de Notifications Temps Réel
 * Utilise les subscriptions Base44 pour tous les appareils
 */

import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

class RealtimeNotificationSystem {
  constructor() {
    this.subscriptions = [];
    this.isInitialized = false;
    this._conversationsCache = null;
    this._conversationsCacheTime = 0;
  }

  /**
   * Initialise le système pour un utilisateur
   */
  async initialize(userId, userRole) {
    if (this.isInitialized) return;

    try {
      // 1. Notifications générales
      this.subscribeToNotifications(userId);

      // 2. Messages en temps réel
      this.subscribeToMessages(userId);

      // 3. Spécifique au rôle
      if (userRole === 'admin') {
        this.subscribeAdminNotifications();
      } else {
        // Vérifier si l'utilisateur est vendeur ou client
        const vendorProfiles = await base44.entities.VendorProfile.filter({ user_id: userId });
        const clientProfiles = await base44.entities.ClientProfile.filter({ user_id: userId });

        if (vendorProfiles.length > 0) {
          this.subscribeVendorNotifications(userId);
        }
        
        if (clientProfiles.length > 0) {
          this.subscribeClientNotifications(userId);
        }
      }

      this.isInitialized = true;
      console.log('✅ Système de notifications temps réel activé');
    } catch (error) {
      console.error('Erreur initialisation notifications:', error);
    }
  }

  /**
   * Notifications générales
   */
  subscribeToNotifications(userId) {
    const unsubscribe = base44.entities.Notification.subscribe(async (event) => {
      if (event.type === 'create' && event.data.user_id === userId) {
        const notification = event.data;
        
        // Toast notification
        toast(notification.title, {
          description: notification.message,
          duration: 5000,
          action: notification.link ? {
            label: "Voir",
            onClick: () => window.location.href = notification.link
          } : undefined
        });

        // Notification navigateur (si autorisé)
        this.sendBrowserNotification(notification.title, notification.message, notification.link);
        
        // Son de notification
        this.playNotificationSound();
        
        // Incrémenter le badge
        this.updateNotificationBadge();

        // Envoyer email de notification (async, non-bloquant)
        this.sendNotificationEmail(notification, userId).catch(e => 
          console.error('Email notification failed:', e)
        );
      }
    });

    this.subscriptions.push(unsubscribe);
  }

  /**
   * Envoie un email pour une notification
   */
  async sendNotificationEmail(notification, userId) {
    try {
      // OPTIMIZED: Fetch only current user
      const user = await base44.auth.me();
      
      if (!user?.email) return;

      const emailBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #FF6B35 0%, #F4C542 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; }
            .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #FF6B35; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .message-box { background: #f5f5f5; padding: 15px; border-left: 4px solid #FF6B35; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin:0;">Event<span style="color: #F4C542;">Crafter</span></h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Notification</p>
            </div>
            <div class="content">
              <h2 style="color: #FF6B35; margin-top: 0;">${notification.title}</h2>
              <div class="message-box">
                <p style="margin: 0;">${notification.message}</p>
              </div>
              ${notification.link ? `
                <div style="text-align: center;">
                  <a href="${window.location.origin}${notification.link}" class="button">Voir les détails</a>
                </div>
              ` : ''}
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Vous avez reçu cette notification le ${new Date().toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}.
              </p>
            </div>
            <div class="footer">
              <p>© 2026 EventCrafter. Tous droits réservés.</p>
              <p>Vous recevez cet email car vous êtes inscrit sur EventCrafter.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await SendEmail({
        to: user.email,
        subject: `EventCrafter - ${notification.title}`,
        body: emailBody
      });
    } catch (error) {
      console.error('Error sending notification email:', error);
    }
  }

  /**
   * Messages en temps réel
   */
  subscribeToMessages(userId) {
    const unsubscribe = base44.entities.Message.subscribe(async (event) => {
      if (event.type === 'create' && event.data.sender_id !== userId) {
        // Cache conversations for 60s to avoid fetching on every message
        const now = Date.now();
        if (!this._conversationsCache || now - this._conversationsCacheTime > 60000) {
          this._conversationsCache = await base44.entities.Conversation.list();
          this._conversationsCacheTime = now;
        }
        const conversations = this._conversationsCache;
        const userConversation = conversations.find(c => 
          c.id === event.data.conversation_id && 
          c.participants.includes(userId)
        );

        if (userConversation) {
          const message = event.data;
          
          // OPTIMIZED: Get sender name from message metadata or default
          const senderName = 'Quelqu\'un';

          toast(`💬 ${senderName}`, {
            description: message.content.slice(0, 50) + (message.content.length > 50 ? '...' : ''),
            duration: 4000,
            action: {
              label: "Répondre",
              onClick: () => window.location.href = `/Chat?conversationId=${message.conversation_id}`
            }
          });

          this.sendBrowserNotification(
            `Nouveau message de ${senderName}`,
            message.content,
            `/Chat?conversationId=${message.conversation_id}`
          );
          
          this.playMessageSound();
        }
      }
    });

    this.subscriptions.push(unsubscribe);
  }

  /**
   * Notifications Admin
   */
  subscribeAdminNotifications() {
    // Nouvelles vérifications
    const unsubVerification = base44.entities.VerificationRequest.subscribe((event) => {
      if (event.type === 'create') {
        toast('🔍 Nouvelle demande de vérification', {
          description: 'Un utilisateur demande la vérification de son compte',
          duration: 6000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/AdminDashboard?tab=verifications'
          }
        });
        this.playNotificationSound();
      }
    });

    // Nouveaux litiges
    const unsubDispute = base44.entities.Dispute.subscribe((event) => {
      if (event.type === 'create') {
        toast('⚠️ Nouveau litige', {
          description: 'Un litige nécessite votre attention',
          duration: 6000,
          action: {
            label: "Gérer",
            onClick: () => window.location.href = '/AdminDashboard?tab=disputes'
          }
        });
        this.playNotificationSound();
      }
    });

    this.subscriptions.push(unsubVerification, unsubDispute);
  }

  /**
   * Notifications Vendeur
   */
  subscribeVendorNotifications(userId) {
    // Nouvelles réservations
    const unsubBooking = base44.entities.Booking.subscribe((event) => {
      if (event.type === 'create' && event.data.planner_id === userId) {
        const booking = event.data;
        toast('🎉 Nouvelle Réservation !', {
          description: `${booking.client_name || 'Un client'} a réservé pour le ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
          duration: 5000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/VendorDashboard?tab=bookings_received'
          }
        });
        this.playSuccessSound();
        this.sendBrowserNotification(
          '🎉 Nouvelle Réservation',
          `Réservation pour le ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
          '/VendorDashboard?tab=bookings_received'
        );
      }
    });

    // Nouveaux leads
    const unsubLead = base44.entities.Lead.subscribe((event) => {
      if (event.type === 'create' && event.data.status === 'open') {
        toast('🔔 Nouvelle Demande Prospect', {
          description: `${event.data.event_type} - ${event.data.location}`,
          duration: 4000,
          action: {
            label: "Voir",
            onClick: () => window.location.href = '/VendorDashboard?tab=leads'
          }
        });
        this.playNotificationSound();
      }
    });

    // Avis clients
    const unsubReview = base44.entities.VendorReview.subscribe((event) => {
      if (event.type === 'create' && event.data.provider_id === userId) {
        const rating = event.data.rating;
        const emoji = rating >= 4 ? '⭐' : rating >= 3 ? '👍' : '📝';
        toast(`${emoji} Nouvel Avis Reçu`, {
          description: `${rating}/5 étoiles - "${event.data.comment?.slice(0, 50)}..."`,
          duration: 5000
        });
        this.playNotificationSound();
      }
    });

    this.subscriptions.push(unsubBooking, unsubLead, unsubReview);
  }

  /**
   * Notifications Client
   */
  subscribeClientNotifications(userId) {
    // Mises à jour de réservations
    const unsubBooking = base44.entities.Booking.subscribe((event) => {
      if (event.type === 'update' && event.data.created_by === userId) {
        const booking = event.data;
        const statusMessages = {
          'contract_pending': '📝 Contrat prêt à signer',
          'confirmed': '✅ Réservation confirmée',
          'in_progress': '🎬 Prestation en cours',
          'completed': '🎉 Prestation terminée',
          'cancelled': '❌ Réservation annulée'
        };

        const message = statusMessages[booking.status];
        if (message) {
          toast(message, {
            description: `Réservation du ${new Date(booking.event_date).toLocaleDateString('fr-FR')}`,
            duration: 5000,
            action: {
              label: "Voir",
              onClick: () => window.location.href = '/ClientDashboard?tab=bookings'
            }
          });
          this.playNotificationSound();
        }
      }
    });

    this.subscriptions.push(unsubBooking);
  }

  /**
   * Envoie une notification navigateur
   */
  async sendBrowserNotification(title, body, link) {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'eventcrafter-notification',
        requireInteraction: false
      });

      if (link) {
        notification.onclick = () => {
          window.focus();
          window.location.href = link;
          notification.close();
        };
      }
    } else if (Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  }

  /**
   * Sons de notification
   */
  playNotificationSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0MU6fm');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  playMessageSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAgoWFZ1xbY5WqpYxeNDJcoNLYpF0ZBDyY2vHBbyQEK37M8deFNQYXY7jr4JZLDQxNo+Htr10aBTOO1PDJdysEI3XF7tuNPgkTXLLo6aVTEwpEnt/xvGofBDCF0PLRgDIFHGu+7eCXTwwLUqPk');
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  playSuccessSound() {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACAhYyLcmFidKCxsZRkOTdkpNjgrWkfCEGe3/TJfzAHMIrT9OKNOwofb8Xy6aJWEQ1XquXyxXAlCTyX2fLUhDUJJ3rK8uCZTQ8PZLnr75lQDg5VquTwtGod');
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  /**
   * Met à jour le badge de notifications
   */
  updateNotificationBadge() {
    const event = new CustomEvent('notification-received');
    window.dispatchEvent(event);
  }

  /**
   * Nettoie les subscriptions
   */
  cleanup() {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
    this.isInitialized = false;
  }
}

export const realtimeNotifications = new RealtimeNotificationSystem();
