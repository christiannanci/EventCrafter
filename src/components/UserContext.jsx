import { Service, VendorProfile, ClientProfile, Booking, Event, Conversation, Message, Review, Notification, Membership, Invoice, Region, Departement, Ville, Quartier, Fonction, PlatformFeedback, Contract, Dispute, Lead, Transaction, Payout, Refund, AppUser, Country, ServiceType } from '@/api/entities';
import React, { createContext, useState, useEffect, useContext } from 'react';


const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [clientProfile, setClientProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      if (currentUser) {
        const [vendorProfiles, clientProfiles] = await Promise.all([
          VendorProfile.filter({ user_id: currentUser.id }),
          ClientProfile.filter({ user_id: currentUser.id })
        ]);

        setVendorProfile(vendorProfiles[0] || null);
        setClientProfile(clientProfiles[0] || null);
      }
    } catch (err) {
      setError(err);
      setUser(null);
      setVendorProfile(null);
      setClientProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const refreshProfiles = async () => {
    if (!user) return;
    
    try {
      const [vendorProfiles, clientProfiles] = await Promise.all([
        VendorProfile.filter({ user_id: user.id }),
        ClientProfile.filter({ user_id: user.id })
      ]);

      setVendorProfile(vendorProfiles[0] || null);
      setClientProfile(clientProfiles[0] || null);
    } catch (err) {
      console.error("Failed to refresh profiles", err);
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      vendorProfile,
      clientProfile,
      loading,
      error,
      refreshProfiles,
      refetch: fetchUserData
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

