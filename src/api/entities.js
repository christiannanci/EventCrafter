import { supabase } from './base44Client';

class SupabaseQuery {
  constructor(tableName) { this.tableName = tableName; }
  async filter(filters = {}) {
    let q = supabase.from(this.tableName).select('*');
    Object.entries(filters).forEach(([k, v]) => { q = Array.isArray(v) ? q.in(k, v) : q.eq(k, v); });
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async list(options = {}) {
    let q = supabase.from(this.tableName).select('*');
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }
  async get(id) {
    const { data, error } = await supabase.from(this.tableName).select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  async create(data) {
    const { data: result, error } = await supabase.from(this.tableName).insert(data).select().single();
    if (error) throw error;
    return result;
  }
  async update(id, data) {
    const { data: result, error } = await supabase.from(this.tableName).update(data).eq('id', id).select().single();
    if (error) throw error;
    return result;
  }
  async delete(id) {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);
    if (error) throw error;
    return { success: true };
  }
}

export const Query = new Proxy({}, { get(_, t) { return new SupabaseQuery(t); } });
export const Country = new SupabaseQuery('country');
export const ServiceType = new SupabaseQuery('service_type');
export const Service = new SupabaseQuery('service');
export const VendorProfile = new SupabaseQuery('vendor_profile');
export const ClientProfile = new SupabaseQuery('client_profile');
export const Booking = new SupabaseQuery('booking');
export const Event = new SupabaseQuery('event');
export const Conversation = new SupabaseQuery('conversation');
export const Message = new SupabaseQuery('message');
export const Review = new SupabaseQuery('review');
export const Notification = new SupabaseQuery('notification');
export const Membership = new SupabaseQuery('membership');
export const Invoice = new SupabaseQuery('invoice');
export const Region = new SupabaseQuery('region');
export const Departement = new SupabaseQuery('departement');
export const Ville = new SupabaseQuery('ville');
export const Quartier = new SupabaseQuery('quartier');
export const Fonction = new SupabaseQuery('fonction');
export const PlatformFeedback = new SupabaseQuery('platform_feedback');
export const Contract = new SupabaseQuery('contract');
export const Dispute = new SupabaseQuery('dispute');
export const Lead = new SupabaseQuery('lead');
export const Transaction = new SupabaseQuery('transaction');
export const Payout = new SupabaseQuery('payout');
export const Refund = new SupabaseQuery('refund');
export const AppUser = new SupabaseQuery('app_user');
export const VendorReview = new SupabaseQuery('review');
export const MembershipType = new SupabaseQuery('membership');
export const ServiceRequest = new SupabaseQuery('service_request');
export const LeadUnlock = new SupabaseQuery('lead_unlock');
export const VendorReview = new SupabaseQuery('review');
export const MembershipType = new SupabaseQuery('membership_type');



