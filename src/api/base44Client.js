// ============================================================
//  base44Client.js  —  REMPLACÉ PAR SUPABASE
//  Ce fichier remplace l'ancien SDK Base44.
//  Toutes les autres parties du code n'ont PAS besoin de changer.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Variables manquantes : VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY doivent être définies dans .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Couche de compatibilité Base44 → Supabase ────────────────
// Reproduit l'API base44.entities.Query utilisée dans le reste du code

class SupabaseQuery {
  constructor(tableName) {
    this.tableName = tableName;
  }

  // base44: Query.filter({ champ: valeur })
  async filter(filters = {}, options = {}) {
    let query = supabase.from(this.tableName).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    });
    if (options.limit)  query = query.limit(options.limit);
    if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    if (options.sort)   query = query.order(options.sort.field, { ascending: options.sort.direction !== 'desc' });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  // base44: Query.list()
  async list(options = {}) {
    let query = supabase.from(this.tableName).select('*');
    if (options.limit) query = query.limit(options.limit);
    if (options.sort) query = query.order(options.sort.field, { ascending: options.sort.direction !== 'desc' });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // base44: Query.get(id)
  async get(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  // base44: Query.create(data)
  async create(data) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  // base44: Query.update(id, data)
  async update(id, data) {
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  // base44: Query.delete(id)
  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return { success: true };
  }
}

// ── Auth compatible Base44 ───────────────────────────────────
const auth = {
  // base44: User.me()
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return {
      id:    user.id,
      email: user.email,
      ...user.user_metadata,
    };
  },

  // base44: User.login({ email, password })
  async login({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  // base44: User.logout()
  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // base44: User.register({ email, password, ...profile })
  async register({ email, password, ...profile }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: profile },
    });
    if (error) throw error;
    return data.user;
  },

  // Écouter les changements d'état d'authentification
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user || null);
    });
  },
};

// Export compatible avec l'ancien SDK Base44
export const base44 = {
  entities: {
    // Crée dynamiquement un SupabaseQuery pour n'importe quelle table
    Query: new Proxy({}, {
      get(_, tableName) {
        return new SupabaseQuery(tableName);
      }
    }),
  },
  auth,
};
