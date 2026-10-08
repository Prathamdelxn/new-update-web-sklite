'use client';

import { useState, useEffect, use } from 'react';
import { motion } from 'framer-motion';
import { Package, Calendar, FileText, CheckCircle2, Building2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

// Since this is a public link, we cannot use the authenticated interceptors
// We'll create a basic axios instance to hit the public API
const publicApi = axios.create({
 baseURL: process.env.NEXT_PUBLIC_INTERIOR_API_URL || 'http://localhost:3000',
});

export default function PublicRFQPage({ params }: { params: Promise<{ token: string }> }) {
 const unwrappedParams = use(params);
 const token = unwrappedParams.token;

 const [loading, setLoading] = useState(true);
 const [submitted, setSubmitted] = useState(false);
 const [submitting, setSubmitting] = useState(false);
 const [error, setError] = useState<string | null>(null);
 
 const [vendorInfo, setVendorInfo] = useState({ name: '', email: '', phone: '', remarks: '' });
 const [rfqData, setRfqData] = useState<any>(null);
 const [rates, setRates] = useState<Record<string, string>>({});

 useEffect(() => {
 const fetchRfq = async () => {
 try {
 const response = await publicApi.get(`/api/v1/public/rfq/${token}`);
 if (response.data.success) {
 setRfqData(response.data.data);
 } else {
 setError(response.data.message || 'Invalid or expired RFQ link');
 }
 } catch (err: any) {
 setError(err.response?.data?.message || 'Failed to load RFQ details');
 } finally {
 setLoading(false);
 }
 };
 fetchRfq();
 }, [token]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setSubmitting(true);
 setError(null);

 try {
 // Map rates to the schema array
 const ratesArray = Object.keys(rates).map(itemId => {
 const itemDef = rfqData.items.find((i: any) => i._id === itemId || i.id === itemId || i.name === itemId);
 return {
 itemId: itemId,
 name: itemDef ? itemDef.name : itemId,
 unitPrice: Number(rates[itemId])
 };
 });

 const payload = {
 vendorName: vendorInfo.name,
 contactInfo: vendorInfo.email || vendorInfo.phone,
 remarks: vendorInfo.remarks,
 rates: ratesArray
 };

 await publicApi.post(`/api/v1/public/rfq/${token}`, payload);
 setSubmitted(true);
 } catch (err: any) {
 setError(err.response?.data?.message || 'Failed to submit quotation. Please try again.');
 } finally {
 setSubmitting(false);
 }
 };

 if (loading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 ">
 <div className="flex flex-col items-center gap-4">
 <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
 <p className="text-sm text-slate-500 font-medium">Loading Quotation Request...</p>
 </div>
 </div>
 );
 }

 if (error || !rfqData) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4"
 >
 <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <AlertCircle className="w-8 h-8 text-rose-600 " />
 </div>
 <h2 className="text-2xl font-bold text-slate-900 ">Request Closed</h2>
 <p className="text-slate-500 text-sm leading-relaxed">
 {error || 'This request for quotation is no longer accepting submissions.'}
 </p>
 </motion.div>
 </div>
 );
 }

 if (submitted) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
 <motion.div 
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4"
 >
 <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
 <CheckCircle2 className="w-8 h-8 text-emerald-600 " />
 </div>
 <h2 className="text-2xl font-bold text-slate-900 ">Quotation Submitted</h2>
 <p className="text-slate-500 text-sm leading-relaxed">
 Thank you, {vendorInfo.name || 'Vendor'}. Your rates have been securely transmitted to the procurement team. 
 You will be notified if your bid is selected.
 </p>
 </motion.div>
 </div>
 );
 }

 // Fallback if PO doesn't have an items list (legacy PO)
 const itemsList = rfqData.items && rfqData.items.length > 0 
 ? rfqData.items 
 : [{ _id: 'item-1', name: rfqData.materialName, quantity: 1, unit: 'Lot' }];

 return (
 <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500/30">
 <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
 <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-inner">
 <Building2 className="w-4 h-4 text-white" />
 </div>
 <div>
 <h1 className="font-bold text-sm tracking-tight leading-none">Procurement Portal</h1>
 <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-wider">Official RFQ Submission</p>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] sm:text-xs font-medium text-slate-500 hidden sm:inline">Ref:</span>
 <span className="text-[10px] sm:text-xs font-bold font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 max-w-[100px] sm:max-w-none truncate">
 {rfqData.poNumber}
 </span>
 </div>
 </div>
 </header>

 <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
 <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 sm:space-y-8">
 
 <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 shadow-sm">
 <h2 className="text-lg sm:text-2xl font-bold mb-2">Request for Quotation</h2>
 <p className="text-slate-500 text-xs sm:text-sm max-w-2xl leading-relaxed">
 Please provide your best unit rates for the requested materials below. 
 The prices should be inclusive of standard delivery to the project site unless specified otherwise.
 </p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
 <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-8 shadow-sm space-y-4 sm:space-y-6">
 <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
 <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</div>
 Vendor Information
 </h3>
 
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Company Name</label>
 <input 
 required
 type="text" 
 value={vendorInfo.name}
 onChange={e => setVendorInfo({...vendorInfo, name: e.target.value})}
 placeholder="e.g. ABC Corp" 
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Email / Phone</label>
 <input 
 required
 type="text" 
 value={vendorInfo.email}
 onChange={e => setVendorInfo({...vendorInfo, email: e.target.value})}
 placeholder="contact@company.com" 
 className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
 />
 </div>
 </div>
 </div>

 <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
 <div className="p-4 sm:p-8 border-b border-slate-200 bg-slate-50/50 ">
 <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
 <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</div>
 Quotation Rates
 </h3>
 </div>
 
 <div className="divide-y divide-slate-100 ">
 {itemsList.map((item: any) => (
 <div key={item._id || item.id} className="p-4 sm:p-8 sm:flex items-center justify-between gap-4 sm:gap-6 hover:bg-slate-50/50 :bg-slate-800/20 transition-colors">
 <div className="mb-3 sm:mb-0 flex-1">
 <h4 className="font-bold text-sm sm:text-base">{item.name}</h4>
 <p className="text-xs sm:text-sm text-slate-500 mt-1">Requested Quantity: <span className="font-semibold text-slate-700 ">{item.quantity} {item.unit}</span></p>
 </div>
 
 <div className="flex items-center gap-3 sm:w-64">
 <div className="relative w-full">
 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">₹</span>
 <input 
 type="number" 
 required
 value={rates[item._id || item.id] || ''}
 onChange={(e) => setRates({...rates, [item._id || item.id]: e.target.value})}
 placeholder="Unit Rate" 
 className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
 />
 </div>
 <span className="text-xs font-bold text-slate-400 uppercase w-16">/ {item.unit}</span>
 </div>
 </div>
 ))}
 </div>
 
 <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-200 ">
 <div className="space-y-2 max-w-lg">
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Additional Terms or Remarks (Optional)</label>
 <textarea 
 rows={2}
 value={vendorInfo.remarks}
 onChange={e => setVendorInfo({...vendorInfo, remarks: e.target.value})}
 placeholder="e.g. Prices valid for 7 days. Delivery within 48 hours of PO."
 className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none shadow-sm"
 />
 </div>
 </div>
 </div>

 <div className="flex justify-end pt-4 pb-12">
 <Button 
 type="submit" 
 size="lg" 
 className="w-full sm:w-auto px-8 h-12 text-base shadow-lg shadow-indigo-500/25"
 disabled={submitting}
 >
 {submitting ? (
 <>
 <Loader2 className="w-5 h-5 animate-spin mr-2" /> Submitting Quotes...
 </>
 ) : (
 'Submit Official Quotation'
 )}
 </Button>
 </div>

 </form>
 </motion.div>
 </main>
 </div>
 );
}
