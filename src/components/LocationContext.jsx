import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/api/base44Client';

const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('XAF');
  const [currencySymbol, setCurrencySymbol] = useState('FCFA');

  const exchangeRates = {
    'XAF': 1,
    'EUR': 0.001524,
    'USD': 0.00165,
    'GBP': 0.0013,
    'NGN': 2.5
  };

  useEffect(() => {
    const initLocation = async () => {
      try {
        // 1. Charger les pays actifs depuis Supabase
        const countriesList = await supabase.from("country").select("*").eq("status","active").then(r => r.data || []);
        setCountries(countriesList);

        // 2. Pays par défaut : Cameroun
        let defaultCountryCode = 'CM';

        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const vendorProfiles = await supabase.from("vendor_profile").select("*").eq("user_id",user.id).then(r => r.data || []);
            const clientProfiles = await supabase.from("client_profile").select("*").eq("user_id",user.id).then(r => r.data || []);
            const profile = vendorProfiles[0] || clientProfiles[0];
            // Garder CM par défaut pour cette plateforme camerounaise
          }
        } catch (e) {
          // Non connecté — CM par défaut
        }

        setSelectedCountry(defaultCountryCode);
      } catch (err) {
        console.error('Failed to init location context', err);
      } finally {
        setLoading(false);
      }
    };

    initLocation();
  }, []);

  useEffect(() => {
    if (selectedCountry && countries.length > 0) {
      const c = countries.find(x => x.code === selectedCountry);
      if (c) {
        setCurrency(c.currency_code || 'XAF');
        setCurrencySymbol(c.currency_symbol || 'FCFA');
      }
    }
  }, [selectedCountry, countries]);

  const formatPrice = (amountInBase) => {
    if (amountInBase === undefined || amountInBase === null) return '';
    const rate = exchangeRates[currency] || 1;
    const converted = Math.round(amountInBase * rate);
    return `${converted.toLocaleString()} ${currencySymbol}`;
  };

  return (
    <LocationContext.Provider value={{
      selectedCountry,setSelectedCountry,
      countries,
      loading,
      currency,
      currencySymbol,
      formatPrice
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => useContext(LocationContext);


