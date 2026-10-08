'use client';

// Port of interior-os-frontend's projects/[projectId]/procurement/page.tsx.
// Uses window.confirm instead of the source app's useConfirm dialog context
// (not present in sky-lite-web).

import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Truck,
  Package,
  Wrench,
  Loader2,
  Clock,
  Plus,
  Trash2,
  X,
  AlertCircle,
  History,
  Pencil,
  Mail,
  CheckCircle2,
  FileText,
  Camera,
  Lock,
  CreditCard,
  Eye,
} from 'lucide-react';
import { SendRFQModal } from './SendRFQModal';
import { InteriorGRNModal } from './InteriorGRNModal';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import interiorApiClient from '@/services/interiorApi.client';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';
import { useCurrency } from '@/hooks/useCurrency';

interface POItemInput {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

interface InteriorProcurementViewProps {
  projectId: string;
}

export default function InteriorProcurementView({ projectId }: InteriorProcurementViewProps) {
  const toast = useToast();
  const { confirm } = useConfirm();
  const { currencySymbol, formatExactCurrency } = useCurrency();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'procurement' | 'inventory'>('procurement');
  const [activePipeline, setActivePipeline] = useState('requested');

  // TanStack Query for Procurement, Inventory, Vendors, and Payments
  const { data: procurementData, isLoading: loading } = useQuery({
    queryKey: ['project-materials', projectId],
    queryFn: async () => {
      const [posRes, invRes, vendorsRes, payRes] = await Promise.allSettled([
        interiorProjectService.getPurchaseOrders(projectId),
        interiorProjectService.getInventory(projectId),
        interiorApiClient.get('/vendors'),
        interiorProjectService.getPayments(projectId),
      ]);

      return {
        pos: posRes.status === 'fulfilled' && posRes.value?.success && posRes.value?.data ? posRes.value.data : [],
        inventory: invRes.status === 'fulfilled' && invRes.value?.success && invRes.value?.data ? invRes.value.data : [],
        vendors: vendorsRes.status === 'fulfilled' && vendorsRes.value?.data?.data ? vendorsRes.value.data.data : [],
        payments: payRes.status === 'fulfilled' ? (payRes.value?.data || payRes.value || []) : [],
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!projectId,
  });

  const pos = useMemo(() => procurementData?.pos || [], [procurementData?.pos]);
  const inventory = useMemo(() => procurementData?.inventory || [], [procurementData?.inventory]);
  const vendors = useMemo(() => procurementData?.vendors || [], [procurementData?.vendors]);
  const payments = useMemo(() => procurementData?.payments || [], [procurementData?.payments]);

  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [poItems, setPoItems] = useState<POItemInput[]>([]);
  const [newItem, setNewItem] = useState<POItemInput>({ name: '', quantity: 1, unit: 'nos', unitPrice: 0 });

  // Payments Integration State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payingPo, setPayingPo] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Bank Transfer' as const,
    referenceNo: '',
    remarks: '',
    paymentDate: new Date().toISOString().split('T')[0],
    projectName: '',
    projectLocation: '',
    invoiceNo: '',
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingPo, setUpdatingPo] = useState(false);
  const [isSendRFQOpen, setIsSendRFQOpen] = useState(false);
  const [sentEmailVendorIds, setSentEmailVendorIds] = useState<Set<string>>(new Set());
  const [isGRNOpen, setIsGRNOpen] = useState(false);
  
  const [isLinkActive, setIsLinkActive] = useState(true);
  const [linkExpiry, setLinkExpiry] = useState('12h');

  // Reset link active state when a new PO is opened
  useEffect(() => {
    if (selectedPo) {
      setIsLinkActive(true);
      // We also could reset sentEmailVendorIds here if we wanted to
      setSentEmailVendorIds(new Set());
    }
  }, [selectedPo]);


  const [selectedStock, setSelectedStock] = useState<any>(null);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [installQty, setInstallQty] = useState('');
  const [installNotes, setInstallNotes] = useState('');
  const [loggingInstall, setLoggingInstall] = useState(false);
  const [installError, setInstallError] = useState('');

  // Create Material State
  const [isCreateMaterialOpen, setIsCreateMaterialOpen] = useState(false);
  const [creatingMaterial, setCreatingMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');
  const [newMaterialStock, setNewMaterialStock] = useState<number | ''>(0);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [viewingImages, setViewingImages] = useState<{proofUrl?: string, invoiceUrl?: string} | null>(null);

  const invalidateProcurementData = () => {
    queryClient.invalidateQueries({ queryKey: ['project-materials', projectId] });
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPo || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (!paymentForm.referenceNo.trim()) {
      toast.error('Reference / UTR number is required');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await interiorProjectService.createPayment(projectId, {
        type: 'outgoing',
        poNo: payingPo.poNumber || payingPo._id,
        vendorName: payingPo.vendorName || payingPo.vendorId?.name || 'Vendor',
        category: payingPo.materialName || 'Wood & Plywood',
        amount: parseFloat(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        paymentMethod: paymentForm.paymentMethod,
        referenceNo: paymentForm.referenceNo.trim(),
        remarks: paymentForm.remarks.trim(),
        projectName: paymentForm.projectName?.trim(),
        projectLocation: paymentForm.projectLocation?.trim(),
        invoiceNo: paymentForm.invoiceNo?.trim(),
      });
      toast.success('Vendor payment recorded successfully in Payments Outflow!');
      setIsPayModalOpen(false);
      invalidateProcurementData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const autoCreatePaymentForPo = async (po: any) => {
    // Automatic payment creation is disabled so POs don't default to "Paid"
    return;
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      toast.error('Please select a Product Name before adding the item');
      return;
    }
    if (newItem.quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }
    if (newItem.unitPrice < 0) {
      toast.error('Rate cannot be negative');
      return;
    }
    setPoItems((prev) => [...prev, { ...newItem }]);
    setNewItem({ name: '', quantity: 1, unit: '', unitPrice: 0 });
  };

  const handleMaterialChange = (materialName: string) => {
    const selectedItem = inventory.find((i: any) => i.productName === materialName);
    if (selectedItem) {
      setNewItem({ ...newItem, name: materialName, unit: selectedItem.unit });
    } else {
      setNewItem({ ...newItem, name: materialName });
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterialName.trim() || !newMaterialUnit.trim()) return;
    try {
      setCreatingMaterial(true);
      if (editingMaterialId) {
        await interiorProjectService.updateInventoryMaterial(projectId, editingMaterialId, {
          productName: newMaterialName,
          unit: newMaterialUnit,
        });
        toast.success('Material updated successfully');
      } else {
        await interiorProjectService.createInventoryMaterial(projectId, {
          productName: newMaterialName,
          unit: newMaterialUnit,
          initialStock: newMaterialStock === '' ? 0 : Number(newMaterialStock),
        });
        toast.success('Material added to inventory successfully');
      }
      setNewMaterialName('');
      setNewMaterialUnit('');
      setNewMaterialStock(0);
      setEditingMaterialId(null);
      setIsCreateMaterialOpen(false);
      invalidateProcurementData();
    } catch (err: any) {
      console.error('Failed to create/update material', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save material');
    } finally {
      setCreatingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (item: any) => {
    const ok = await confirm({
      title: 'Delete Material',
      message: 'Are you sure you want to delete this material? This will permanently remove it from inventory.',
      confirmText: 'Delete',
      type: 'danger',
    });
    if (!ok) return;
    try {
      await interiorProjectService.deleteInventoryMaterial(projectId, item._id);
      toast.success('Material deleted successfully');
      invalidateProcurementData();
    } catch (err: any) {
      toast.error('Failed to delete material');
      console.error(err);
    }
  };

  const handleRemoveItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) {
      toast.error('Please add at least one item to the Purchase Order');
      return;
    }
    try {
      setCreatingPo(true);
      await interiorProjectService.createPurchaseOrder(projectId, {
        vendorName: vendorName.trim() || 'Unassigned',
        items: poItems,
        deliveryDate: deliveryDate || undefined,
        status: activePipeline === 'requested' ? 'requested' : 'pending',
      });
      toast.success(activePipeline === 'requested' ? 'Material request created successfully' : 'Purchase Order created successfully');
      setIsAddPoOpen(false);
      setVendorName('');
      setDeliveryDate('');
      setPoItems([]);
      invalidateProcurementData();
    } catch (err: any) {
      console.error('Failed to create PO', err);
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to create Purchase Order');
    } finally {
      setCreatingPo(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);
      const res = await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { status });
      if (res.success) {
        setSelectedPo(res.data);
      }
      invalidateProcurementData();
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error('Failed to update PO status');
      invalidateProcurementData();
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleUpdateVendor = async (vendorName: string) => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);

      // Find the selected quote
      const quote = selectedPo.quotes?.find((q: any) => q.vendorName === vendorName);
      
      let updatedItems = selectedPo.items || [];
      let totalAmount = selectedPo.amount || 0;

      if (quote && quote.rates && quote.rates.length > 0) {
        // Update items with the new unit prices
        updatedItems = updatedItems.map((item: any) => {
          const rateInfo = quote.rates.find((r: any) => r.itemId === (item._id || item.id) || r.name === item.name);
          return {
            ...item,
            unitPrice: rateInfo ? rateInfo.unitPrice : item.unitPrice,
            totalPrice: rateInfo ? (rateInfo.unitPrice * (item.quantity || 1)) : item.totalPrice
          };
        });

        // Recalculate total amount
        totalAmount = updatedItems.reduce((sum: number, item: any) => sum + (item.totalPrice || 0), 0);
      }

      const updatedPoPayload = { 
        vendorName, 
        status: 'approved',
        items: updatedItems,
        amount: totalAmount
      };

      setSelectedPo({ ...selectedPo, ...updatedPoPayload });
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, updatedPoPayload);
      toast.success('Vendor selected and PO approved!');
      setIsDetailOpen(false);
      await autoCreatePaymentForPo({ ...selectedPo, ...updatedPoPayload });
      invalidateProcurementData();
    } catch (err) {
      console.error('Failed to update vendor', err);
      toast.error('Failed to update vendor');
      invalidateProcurementData();
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleLocalRateChange = (index: number, newRate: number) => {
    if (!selectedPo) return;
    const updatedItems = [...selectedPo.items];
    updatedItems[index] = { ...updatedItems[index], unitPrice: newRate, amount: updatedItems[index].quantity * newRate };
    const newTotal = updatedItems.reduce((acc, it) => acc + (it.quantity * (it.unitPrice || 0)), 0);
    setSelectedPo({ ...selectedPo, items: updatedItems, amount: newTotal });
  };

  const handleSubmitGRN = async (receivedItems: any[], challanNumber: string, proofUrl: string, receivedBy: string, invoiceUrl: string) => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);
      const newGrn = {
        receivedItems,
        challanNumber,
        proofUrl,
        receivedBy,
        invoiceUrl,
        receivedAt: new Date().toISOString()
      };
      
      let currentGrns = selectedPo.grns;
      if (!currentGrns && selectedPo.grnData?.allGrns) {
        try { currentGrns = JSON.parse(selectedPo.grnData.allGrns); } catch(e) {}
      }
      if (!currentGrns) currentGrns = selectedPo.grnData ? [selectedPo.grnData] : [];
      
      const updatedGrns = [...currentGrns, newGrn];

      // Calculate if fully delivered
      let fullyDelivered = true;
      selectedPo.items.forEach((item: any) => {
        const totalReceived = updatedGrns.reduce((acc, grn) => {
          const r = grn.receivedItems?.find((i: any) => i.name === item.name);
          return acc + (r?.receivedQuantity || 0);
        }, 0);
        if (totalReceived < item.quantity) {
          fullyDelivered = false;
        }
      });

      const newStatus = fullyDelivered ? 'delivered' : 'partially_delivered';
      const updatedPo = { ...selectedPo, status: newStatus, grns: updatedGrns, grnData: { allGrns: JSON.stringify(updatedGrns) } };
      
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { 
        status: newStatus,
        grns: updatedGrns,
        grnData: { allGrns: JSON.stringify(updatedGrns) }
      });
      
      setSelectedPo(updatedPo);
      await autoCreatePaymentForPo(updatedPo);
      invalidateProcurementData();
    } catch (err) {
      console.error('Failed to submit GRN', err);
      throw err;
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleSaveRates = async () => {
    if (!selectedPo) return;
    
    if (selectedPo.status === 'approved') {
      const formattedAmount = formatCost(selectedPo.amount || 0);
      const ok = await confirm({
        title: 'Approve & Lock PO',
        message: `You are about to assign this PO to ${selectedPo.vendorName || 'the vendor'} and lock in the final rates at ${formattedAmount}. This cannot be easily undone. Do you want to proceed?`,
        confirmText: 'Approve PO',
        type: 'warning',
      });
      if (!ok) return;
    }

    try {
      setUpdatingPo(true);
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { 
        vendorName: selectedPo.vendorName,
        status: selectedPo.status,
        items: selectedPo.items, 
        amount: selectedPo.amount 
      });
      if (selectedPo.status === 'approved') {
        await autoCreatePaymentForPo(selectedPo);
      }
      toast.success('PO Details saved successfully');
      invalidateProcurementData();
    } catch (err) {
      console.error('Failed to save PO details', err);
      toast.error('Failed to save details');
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleDeletePO = async () => {
    if (!selectedPo) return;
    const ok = await confirm({
      title: 'Delete Purchase Order',
      message: 'Are you sure you want to delete this Purchase Order? This will permanently delete the PO and its material history.',
      confirmText: 'Delete PO',
      type: 'danger',
    });
    if (!ok) return;
    try {
      setUpdatingPo(true);
      await interiorProjectService.deletePurchaseOrder(projectId, selectedPo._id);
      toast.success('Purchase Order deleted successfully');
      setIsDetailOpen(false);
      setSelectedPo(null);
      invalidateProcurementData();
    } catch (err) {
      toast.error('Failed to delete Purchase Order');
      console.error('Failed to delete PO', err);
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleLogInstallation = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(installQty);
    if (isNaN(qty) || qty <= 0) return;

    const available = selectedStock.totalReceived - selectedStock.installedQuantity;
    if (qty > available) {
      setInstallError(`Cannot use more than available stock (${available} ${selectedStock.unit})`);
      return;
    }

    try {
      setLoggingInstall(true);
      setInstallError('');
      await interiorProjectService.logInventoryInstall(projectId, {
        inventoryId: selectedStock._id,
        quantity: qty,
        notes: installNotes || undefined,
      });
      toast.success('Material usage logged successfully');
      setIsInstallOpen(false);
      setInstallQty('');
      setInstallNotes('');
      invalidateProcurementData();
    } catch (err: any) {
      console.error('Failed to log material usage', err);
      setInstallError(err.response?.data?.message || 'Failed to log material usage');
    } finally {
      setLoggingInstall(false);
    }
  };

  const pipelines = [
    { key: 'requested', label: 'Material Request', icon: FileText, color: 'text-purple-500' },
    { key: 'rfq', label: 'RFQ', icon: FileText, color: 'text-indigo-400' },
    { key: 'pending', label: 'Purchase Order', icon: Clock, color: 'text-slate-500' },
    { key: 'approved', label: 'Approved PO', icon: ShoppingCart, color: 'text-blue-500' },
    { key: 'partially_delivered', label: 'Partial Delivery', icon: AlertCircle, color: 'text-yellow-500' },
    { key: 'delivered', label: 'Delivered', icon: Wrench, color: 'text-emerald-500' },
  ];

  const formatCost = (amount: number) => {
    return formatExactCurrency(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Procurement & Inventory</h2>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
          Manage trade orders, track deliveries, and log materials installed on-site.
        </p>
      </div>

      {/* Aggregate Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-blue-500">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Total Procurement Budget</p>
            <p className="text-xl font-bold mt-1">{formatCost(pos.reduce((acc: number, c: any) => acc + (c.amount || 0), 0))}</p>
          </div>
          <ShoppingCart className="w-8 h-8 text-blue-500/20" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Active Purchase Orders</p>
            <p className="text-xl font-bold mt-1">
              {pos.filter((po: any) => ['approved'].includes(po.status)).length} POs
            </p>
          </div>
          <Truck className="w-8 h-8 text-amber-500/20" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">POs Received / Delivered</p>
            <p className="text-xl font-bold mt-1">{pos.filter((po: any) => po.status === 'delivered').length} POs</p>
          </div>
          <Package className="w-8 h-8 text-emerald-500/20" />
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))] pb-4">
        <div className="flex items-center gap-3">
          <div className="border border-[hsl(var(--border))] rounded-lg p-0.5 flex bg-[hsl(var(--muted)/0.3)] shrink-0">
            <button
              onClick={() => setActiveTab('procurement')}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                activeTab === 'procurement'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              Procurement Board
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={cn(
                'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                activeTab === 'inventory'
                  ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm'
                  : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
              )}
            >
              Inventory Management
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'procurement' ? (
            <>
              {activePipeline === 'requested' && (
                <Button onClick={() => setIsAddPoOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Request Material
                </Button>
              )}
              {activePipeline === 'pending' && (
                <Button onClick={() => setIsAddPoOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create PO
                </Button>
              )}
            </>
          ) : (
            <Button onClick={() => {
              setEditingMaterialId(null);
              setNewMaterialName('');
              setNewMaterialUnit('');
              setNewMaterialStock(0);
              setIsCreateMaterialOpen(true);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Material
            </Button>
          )}
        </div>
      </div>

      {activeTab === 'procurement' ? (
        <>
          {/* Pipeline Board */}
          <div className="flex flex-col space-y-6">
            <div className="w-full relative bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] overflow-x-auto scrollbar-hide rounded-t-2xl">
              <div className="flex items-center w-full min-w-max">
                {pipelines.map((pipe) => {
                  const items = pos.filter((po: any) => po.status === pipe.key);
                  const isActive = activePipeline === pipe.key;
                  return (
                    <button
                      key={pipe.key}
                      onClick={() => setActivePipeline(pipe.key)}
                      className={cn(
                        'relative flex items-center justify-center flex-1 gap-1.5 px-4 py-3 text-xs font-medium transition-colors outline-none',
                        isActive ? 'text-[hsl(var(--primary))] font-semibold' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]'
                      )}
                    >
                      <pipe.icon
                        className={cn(
                          'w-4 h-4 stroke-[1.75px] transition-colors',
                          isActive ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))]'
                        )}
                      />
                      <span className="whitespace-nowrap">{pipe.label}</span>
                      <span className={cn(
                        'px-1.5 py-0.5 rounded-full text-[10px] ml-1 flex items-center justify-center min-w-[20px]',
                        isActive ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
                      )}>
                        {items.length}
                      </span>
                      {isActive && (
                        <motion.div
                          layoutId="interiorProcurementFlowTabUnderline"
                          className="absolute left-0 right-0 bottom-0 h-[3px] bg-[hsl(var(--primary))] rounded-t-full"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pos.filter((po: any) => po.status === activePipeline).map((item: any) => {
                const poPaidAmount = payments
                  .filter((p: any) => p.type === 'outgoing' && p.poNo === item.poNumber)
                  .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                const remainingBalance = Math.max(0, (item.amount || 0) - poPaidAmount);
                const isFullyPaid = (item.amount || 0) > 0 && poPaidAmount >= (item.amount || 0);
                const isPartiallyPaid = poPaidAmount > 0 && poPaidAmount < (item.amount || 0);

                let receivedValue = 0;
                let parsedGrns = item.grns;
                if (!parsedGrns && item.grnData?.allGrns) {
                  try { parsedGrns = JSON.parse(item.grnData.allGrns); } catch(e) {}
                }
                if (!parsedGrns && item.grnData) {
                  parsedGrns = [item.grnData];
                }
                if (parsedGrns && Array.isArray(parsedGrns)) {
                  item.items?.forEach((poItem: any) => {
                    const totalReceived = parsedGrns.reduce((sum: number, grn: any) => {
                      const rItem = grn.receivedItems?.find((ri: any) => ri.name === poItem.name);
                      return sum + (rItem?.receivedQuantity || 0);
                    }, 0);
                    receivedValue += (totalReceived * (poItem.unitPrice || 0));
                  });
                }
                
                let suggestedPayment = remainingBalance;
                if (receivedValue > 0) {
                  suggestedPayment = Math.max(0, receivedValue - poPaidAmount);
                  suggestedPayment = Math.min(suggestedPayment, remainingBalance);
                }

                return (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => {
                      setSelectedPo(item);
                      setIsDetailOpen(true);
                    }}
                    className="p-5 border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-sm space-y-4 hover:border-[hsl(var(--primary)/0.3)] hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">{item.poNumber}</span>
                          {isFullyPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Paid
                            </span>
                          ) : isPartiallyPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              Part Paid ({currencySymbol} {poPaidAmount})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              Unpaid
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[hsl(var(--foreground))] text-sm">{formatCost(item.amount)}</span>
                      </div>
                      <h4 className="text-base font-bold text-[hsl(var(--foreground))] line-clamp-1">{item.materialName}</h4>
                      {item.status !== 'requested' && item.vendorName && item.vendorName !== 'Unassigned' && (
                        <p className="text-xs text-[hsl(var(--muted-foreground))] truncate mt-1">Vendor: {item.vendorName}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-xs text-[hsl(var(--muted-foreground))]">
                      <span className="font-medium">{item.items?.length || 1} product(s)</span>
                      {item.deliveryDate && (
                        <span className="flex items-center gap-1.5 font-medium">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {new Date(item.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    
                    {activePipeline === 'requested' && (
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await interiorProjectService.updatePurchaseOrder(projectId, item._id, { status: 'rfq' });
                            setActivePipeline('rfq'); // Automatically jump to the RFQ tab
                            invalidateProcurementData();
                          } catch (err) {
                            console.error('Failed to update status to RFQ', err);
                            toast.error((err as any)?.response?.data?.message || 'Failed to update RFQ status');
                          }
                        }}
                        className="w-full mt-2"
                        size="sm"
                      >
                        Request for RFQ
                      </Button>
                    )}
                    {(activePipeline === 'partially_delivered') && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPo(item);
                          setIsGRNOpen(true);
                        }}
                        className="w-full mt-2 bg-emerald-500 hover:bg-emerald-600 text-white"
                        size="sm"
                      >
                        Receive Material
                      </Button>
                    )}
                    {!isFullyPaid && ['approved', 'partially_delivered', 'delivered'].includes(item.status) && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPayingPo(item);
                          setPaymentForm({
                            amount: suggestedPayment.toString(),
                            paymentMethod: 'Bank Transfer',
                            referenceNo: '',
                            remarks: `Payment for PO ${item.poNumber} (${item.materialName})`,
                            paymentDate: new Date().toISOString().split('T')[0],
                            projectName: '',
                            projectLocation: '',
                            invoiceNo: '',
                          });
                          setIsPayModalOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Vendor ({currencySymbol} {suggestedPayment.toLocaleString()})
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {pos.filter((po: any) => po.status === activePipeline).length === 0 && (
              <div className="text-center py-16">
                <Package className="w-12 h-12 text-[hsl(var(--muted-foreground))] opacity-20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[hsl(var(--foreground))]">No Purchase Orders</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">There are no orders in this stage currently.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Inventory Management */
        <div className="space-y-6">
          {inventory.length === 0 ? (
            <Card className="p-12 text-center border border-dashed border-[hsl(var(--border))]">
              <Package className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-bold">No Products in Inventory</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 max-w-sm mx-auto">
                Click "Add Material" to define your master catalog of materials!
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {inventory.map((item: any) => {
                const available = item.totalReceived - item.installedQuantity;
                const percentInstalled = Math.round((item.installedQuantity / item.totalReceived) * 100) || 0;

                return (
                  <Card key={item._id} className="overflow-hidden flex flex-col h-[400px]">
                    <div className="p-4 bg-[hsl(var(--muted)/0.15)] border-b border-[hsl(var(--border))] space-y-4 shrink-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 shrink-0 text-[hsl(var(--primary))]" />
                            <h3 className="text-sm font-bold text-[hsl(var(--foreground))] truncate">{item.productName}</h3>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                              Unit: <span className="font-semibold text-[hsl(var(--foreground))]">{item.unit}</span>
                            </p>
                            <div className="flex items-center gap-1">
                              <button onClick={() => {
                                setEditingMaterialId(item._id);
                                setNewMaterialName(item.productName);
                                setNewMaterialUnit(item.unit);
                                setNewMaterialStock(''); // Not updated on edit
                                setIsCreateMaterialOpen(true);
                              }} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-blue-500 rounded hover:bg-blue-50 transition-colors" title="Edit Material">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteMaterial(item)} className="p-1 text-[hsl(var(--muted-foreground))] hover:text-red-500 rounded hover:bg-red-50 transition-colors" title="Delete Material">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <Button
                          disabled={available <= 0}
                          onClick={() => {
                            setSelectedStock(item);
                            setIsInstallOpen(true);
                          }}
                          size="sm"
                          className="text-xs h-8 px-3 shrink-0"
                        >
                          <Wrench className="w-3 h-3 mr-1.5" /> Log Used
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center bg-[hsl(var(--card))] p-3 rounded-lg border border-[hsl(var(--border))]">
                        <div className="space-y-0.5 border-r border-[hsl(var(--border))]">
                          <span className="text-[9px] font-semibold text-[hsl(var(--muted-foreground))] uppercase">Delivered</span>
                          <p className="text-xs font-extrabold text-[hsl(var(--foreground))]">
                            {item.totalReceived}
                          </p>
                        </div>
                        <div className="space-y-0.5 border-r border-[hsl(var(--border))]">
                          <span className="text-[9px] font-semibold text-emerald-500 uppercase">Used</span>
                          <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            {item.installedQuantity}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-semibold text-blue-500 uppercase">Available</span>
                          <p className="text-xs font-extrabold text-blue-600 dark:text-blue-400">
                            {available}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))] font-semibold uppercase">
                          <span>Usage Progress</span>
                          <span>{percentInstalled}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percentInstalled}%` }} />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-[hsl(var(--card))] flex-1 flex flex-col overflow-hidden">
                      <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1.5 mb-3 shrink-0">
                        <History className="w-3.5 h-3.5" /> Usage History
                      </span>
                      <div className="flex-1 overflow-y-auto pr-2 scrollbar-none">
                        {item.installHistory && item.installHistory.length > 0 ? (
                          <div className="divide-y divide-[hsl(var(--border))]">
                            {item.installHistory.map((log: any, index: number) => (
                              <div key={log._id || index} className="py-2.5 flex flex-col gap-1 text-xs">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold text-[hsl(var(--foreground))] text-[11px]">
                                    +<span className="text-emerald-600 dark:text-emerald-400">{log.quantity} {item.unit}</span>
                                  </p>
                                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] font-mono">
                                    {new Date(log.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>
                                {log.notes && <p className="text-[10px] text-[hsl(var(--muted-foreground))] line-clamp-2">{log.notes}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic text-center py-4">
                            No materials used yet.
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add PO Modal */}
      <AnimatePresence>
        {isAddPoOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[hsl(var(--primary))]" /> Request Material
                </h3>
                <button onClick={() => setIsAddPoOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePO}>
                <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Target Delivery Date</label>
                    <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                  </div>

                  <div className="border border-[hsl(var(--border))] rounded-lg p-3.5 space-y-3 bg-[hsl(var(--muted)/0.1)]">
                    <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground))] tracking-wider">Add Materials Line</span>

                    <div className="space-y-2">
                      <select
                        value={newItem.name}
                        onChange={(e) => handleMaterialChange(e.target.value)}
                        className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))] appearance-none"
                      >
                        <option value="" disabled>Select Material from Catalog...</option>
                        {inventory.map((m: any) => (
                          <option key={m._id} value={m.productName}>{m.productName}</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={newItem.quantity || ''}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 0 })}
                        />
                        <Input 
                          placeholder="Unit" 
                          value={newItem.unit} 
                          disabled 
                          className="bg-slate-50 opacity-70 cursor-not-allowed"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder={`Rate (${currencySymbol})`}
                          value={newItem.unitPrice || ''}
                          onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddItem}
                        variant="outline"
                        className="w-full text-xs font-bold py-1"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Item Line
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Order Item Details</span>
                    {poItems.length === 0 ? (
                      <p className="text-[11px] text-[hsl(var(--muted-foreground))] italic p-4 text-center border border-dashed border-[hsl(var(--border))] rounded-lg">
                        No items added. Add at least one line above.
                      </p>
                    ) : (
                      <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] max-h-[140px] overflow-y-auto">
                        {poItems.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                            <div className="min-w-0 flex-1">
                              <p className="font-bold truncate text-[hsl(var(--foreground))]">{item.name}</p>
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                                {item.quantity} {item.unit} @ {formatCost(item.unitPrice)} each
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-bold font-mono">{formatCost(item.quantity * item.unitPrice)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {poItems.length > 0 && (
                    <div className="p-3 border border-[hsl(var(--primary)/0.2)] rounded-lg bg-[hsl(var(--primary)/0.03)] flex items-center justify-between text-xs font-bold">
                      <span className="text-[hsl(var(--muted-foreground))] uppercase">PO Total Cost</span>
                      <span className="text-sm font-extrabold text-[hsl(var(--primary))] font-mono">
                        {formatCost(poItems.reduce((acc, it) => acc + it.quantity * it.unitPrice, 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsAddPoOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingPo || poItems.length === 0}>
                    {creatingPo && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Submit Request
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PO Detail & Status Update Drawer */}
      <AnimatePresence>
        {isDetailOpen && selectedPo && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="w-full max-w-md border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-2xl flex flex-col h-full overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-[hsl(var(--muted))] px-2 py-0.5 rounded-full uppercase">{selectedPo.poNumber}</span>
                  <h3 className="text-base font-bold mt-1 text-[hsl(var(--foreground))]">
                    {selectedPo.status === 'requested' ? 'Material Request Details' : selectedPo.status === 'rfq' ? 'RFQ Details' : 'Purchase Order Details'}
                  </h3>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                {selectedPo.status === 'requested' ? (
                  <div className="space-y-6">
                    <div className="space-y-0.5 border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted)/0.1)]">
                      <span className="font-semibold text-[hsl(var(--muted-foreground))] block uppercase text-[10px]">Target Delivery Date</span>
                      <span className="font-bold text-[hsl(var(--foreground))]">
                        {selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : 'Not specified'}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1.5">
                          Requested Materials
                        </span>
                      </div>
                      <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))]">
                        {selectedPo.items && selectedPo.items.length > 0 ? (
                          selectedPo.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                              <div>
                                <p className="font-bold text-[hsl(var(--foreground))]">{item.name}</p>
                              </div>
                              <span className="font-bold font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] px-2 py-1 rounded">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                            <div>
                              <p className="font-bold text-[hsl(var(--foreground))]">{selectedPo.materialName}</p>
                            </div>
                            <span className="font-bold font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] px-2 py-1 rounded">
                              1 unit
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : selectedPo.status === 'rfq' ? (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1.5">
                          Requested Materials
                        </span>
                      </div>
                      <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))]">
                        {selectedPo.items && selectedPo.items.length > 0 ? (
                          selectedPo.items.map((item: any, idx: number) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                              <div>
                                <p className="font-bold text-[hsl(var(--foreground))]">{item.name}</p>
                              </div>
                              <span className="font-bold font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] px-2 py-1 rounded">
                                {item.quantity} {item.unit}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                            <div>
                              <p className="font-bold text-[hsl(var(--foreground))]">{selectedPo.materialName}</p>
                            </div>
                            <span className="font-bold font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted)/0.3)] px-2 py-1 rounded">
                              1 unit
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Link & Expiration Info */}
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-bold flex items-center gap-1.5 ${isLinkActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                          <FileText className="w-3.5 h-3.5" /> 
                          {isLinkActive ? 'Public RFQ Link Active' : 'RFQ Link Expired'}
                        </span>
                        
                        {isLinkActive ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/30 px-2 py-1 rounded border border-rose-100 dark:border-rose-900/30">
                              Expires in:
                            </span>
                            <select 
                              value={linkExpiry} 
                              onChange={(e) => setLinkExpiry(e.target.value)}
                              className="text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800 rounded px-1 py-0.5 text-rose-600 focus:outline-none"
                            >
                              <option value="12h">12 Hours</option>
                              <option value="1d">1 Day</option>
                              <option value="2d">2 Days</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Deactivated
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <input 
                          readOnly 
                          value={`${window.location.origin}/rfq/${selectedPo._id}`}
                          className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] font-mono"
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="shrink-0 h-7" 
                          disabled={!isLinkActive} 
                          onClick={() => {
                            const url = `${window.location.origin}/rfq/${selectedPo._id}`;
                            navigator.clipboard.writeText(url);
                            toast.success('Link copied!');
                          }}
                        >
                          Copy
                        </Button>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-indigo-100 dark:border-indigo-900/30">
                        <span className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">
                          {isLinkActive ? 'Vendors can currently submit quotes' : 'No longer accepting quotes'}
                        </span>
                        <Button 
                          size="sm" 
                          variant={isLinkActive ? 'destructive' : 'outline'} 
                          className="h-6 text-[10px] px-2"
                          onClick={() => setIsLinkActive(!isLinkActive)}
                        >
                          {isLinkActive ? 'Force Expire Now' : 'Reactivate Link'}
                        </Button>
                      </div>
                    </div>

                    {isLinkActive && vendors && vendors.length > 0 && (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground))] tracking-wider flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Share RFQ Link with Vendors
                        </span>
                        <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))] bg-[hsl(var(--card))] max-h-48 overflow-y-auto">
                          {vendors.map((vendor: any) => {
                            const rfqUrl = `${window.location.origin}/rfq/${selectedPo._id}`;
                            const waMessage = encodeURIComponent(`Hello ${vendor.name},\n\nPlease submit your quotation for our requirement by clicking the following link:\n${rfqUrl}\n\nThank you.`);
                            const emailSubject = encodeURIComponent(`Request for Quotation: ${selectedPo.materialName}`);
                            const emailBody = encodeURIComponent(`Hello ${vendor.name},\n\nPlease submit your quotation for our requirement by clicking the following link:\n${rfqUrl}\n\nThank you.`);

                            return (
                              <div key={vendor._id} className="p-3 flex items-center justify-between text-xs hover:bg-[hsl(var(--muted)/0.3)] transition-colors">
                                <div>
                                  <p className="font-bold text-[hsl(var(--foreground))]">{vendor.name}</p>
                                  <p className="text-[9px] text-[hsl(var(--muted-foreground))]">{vendor.email || vendor.phoneNumber || 'No contact info'}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[10px] flex items-center gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                    onClick={() => window.open(`https://wa.me/${(vendor.phoneNumber || '').replace(/[^0-9]/g, '')}?text=${waMessage}`, '_blank')}
                                    disabled={!vendor.phoneNumber}
                                  >
                                    WhatsApp
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="h-7 text-[10px] flex items-center gap-1"
                                    onClick={async () => {
                                      try {
                                        await interiorApiClient.post('/procurement/send-rfq', {
                                          poId: selectedPo._id,
                                          vendorIds: [vendor._id],
                                          notes: '',
                                          rfqLink: `${window.location.origin}/rfq/${selectedPo._id}`
                                        });
                                        setSentEmailVendorIds(prev => new Set(prev).add(vendor._id));
                                        toast.success(`RFQ sent to ${vendor.name} via email!`);
                                      } catch (err) {
                                        console.error('Failed to send RFQ email', err);
                                        toast.error(`Failed to send email to ${vendor.name}`);
                                      }
                                    }}
                                    disabled={!vendor.email || sentEmailVendorIds.has(vendor._id)}
                                  >
                                    {sentEmailVendorIds.has(vendor._id) ? (
                                      <><CheckCircle2 className="w-3 h-3 text-green-500" /> Sent</>
                                    ) : (
                                      <><Mail className="w-3 h-3" /> Email</>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {isLinkActive ? (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground))] tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Quotes Received So Far
                        </span>
                        <div className="space-y-2">
                          {selectedPo.quotes && selectedPo.quotes.length > 0 ? (
                            selectedPo.quotes.map((quote: any, idx: number) => (
                              <div key={idx} className="p-3 border border-[hsl(var(--border))] rounded-lg flex items-center justify-between bg-[hsl(var(--card))]">
                                <div>
                                  <p className="font-bold text-xs">{quote.vendorName}</p>
                                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                    Submitted {new Date(quote.submittedAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100">Quote Received</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 border border-dashed border-[hsl(var(--border))] rounded-lg flex items-center justify-center bg-[hsl(var(--muted)/0.3)] opacity-70">
                              <p className="text-[10px] text-[hsl(var(--muted-foreground))] italic">Waiting for vendors to submit quotes...</p>
                            </div>
                          )}
                        </div>
                        <p className="text-[9px] text-[hsl(var(--muted-foreground))] text-center mt-2 leading-relaxed">
                          Wait for the link to expire, or force expire it to view the detailed comparison matrix.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground))] tracking-wider flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5" /> Vendor Quotation Comparison
                        </span>
                        
                        <div className="border border-[hsl(var(--border))] rounded-xl overflow-hidden bg-[hsl(var(--card))] shadow-sm">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="bg-[hsl(var(--muted)/0.3)] border-b border-[hsl(var(--border))] text-[10px] uppercase text-[hsl(var(--muted-foreground))]">
                                <tr>
                                  <th className="p-3 font-bold">Item</th>
                                  {selectedPo.quotes && selectedPo.quotes.length > 0 ? (
                                    selectedPo.quotes.map((quote: any, idx: number) => {
                                      // Determine if this is the lowest total cost vendor
                                      let isLowest = false;
                                      if (selectedPo.quotes.length > 1) {
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                          }, 0)
                                        );
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                          }, 0);
                                        if (myTotal === Math.min(...totals) && myTotal > 0) isLowest = true;
                                      }

                                      return (
                                        <th key={idx} className={`p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px] ${isLowest ? 'bg-emerald-50/30 dark:bg-emerald-950/10 text-emerald-700' : ''}`}>
                                          Supplier {idx + 1}<br/>
                                          <span className="font-normal normal-case text-[9px]">{quote.vendorName}</span>
                                        </th>
                                      )
                                    })
                                  ) : (
                                    <th className="p-3 font-bold border-l border-[hsl(var(--border))] min-w-[100px] italic text-[hsl(var(--muted-foreground))]">No quotes yet</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[hsl(var(--border))]">
                                {(selectedPo.items && selectedPo.items.length > 0 ? selectedPo.items : [{_id: 'item-1', name: selectedPo.materialName || 'Material', quantity: 1, unit: 'unit'}]).map((item: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-3 font-medium text-[hsl(var(--foreground))]">{item.name} <span className="text-[9px] text-[hsl(var(--muted-foreground))] block mt-0.5">{item.quantity} {item.unit}</span></td>
                                    {selectedPo.quotes && selectedPo.quotes.length > 0 ? (
                                      selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const rate = quote.rates?.find((r: any) => r.itemId === (item._id || item.id) || r.name === item.name);
                                        return (
                                          <td key={qIdx} className="p-3 border-l border-[hsl(var(--border))] font-mono">
                                            {rate ? `${currencySymbol} ${rate.unitPrice}` : 'N/A'}
                                          </td>
                                        );
                                      })
                                    ) : (
                                      <td className="p-3 border-l border-[hsl(var(--border))] font-mono text-[hsl(var(--muted-foreground))]">-</td>
                                    )}
                                  </tr>
                                ))}
                                
                                {selectedPo.quotes && selectedPo.quotes.length > 0 && (
                                  <>
                                    <tr className="bg-[hsl(var(--muted)/0.1)]">
                                      <td className="p-3 font-bold text-[hsl(var(--foreground))] text-[10px] uppercase">Total Cost</td>
                                      {selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                        }, 0);
                                        
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const it = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (it?.quantity || 1));
                                          }, 0)
                                        );
                                        const isLowest = (myTotal === Math.min(...totals) && myTotal > 0 && selectedPo.quotes.length > 1);

                                        return (
                                          <td key={qIdx} className={`p-3 border-l border-[hsl(var(--border))] font-mono font-bold ${isLowest ? 'text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20' : ''}`}>
                                            {currencySymbol} {myTotal.toLocaleString()}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                    <tr>
                                      <td className="p-3 font-semibold text-[hsl(var(--muted-foreground))] text-[10px]">Action</td>
                                      {selectedPo.quotes.map((quote: any, qIdx: number) => {
                                        const myTotal = quote.rates.reduce((sum: number, r: any) => {
                                            const item = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (item?.quantity || 1));
                                        }, 0);
                                        
                                        const totals = selectedPo.quotes.map((q: any) => 
                                          q.rates.reduce((sum: number, r: any) => {
                                            const it = selectedPo.items?.find((i: any) => (i._id || i.id) === r.itemId || i.name === r.name);
                                            return sum + (r.unitPrice * (it?.quantity || 1));
                                          }, 0)
                                        );
                                        const isLowest = (myTotal === Math.min(...totals) && myTotal > 0 && selectedPo.quotes.length > 1);

                                        return (
                                          <td key={qIdx} className={`p-3 border-l border-[hsl(var(--border))] ${isLowest ? 'bg-emerald-50/30 dark:bg-emerald-950/10' : ''}`}>
                                            <Button 
                                              size="sm" 
                                              variant={isLowest ? 'default' : 'outline'} 
                                              className={`w-full h-7 text-[10px] ${isLowest ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                                              onClick={() => handleUpdateVendor(quote.vendorName)}
                                            >
                                              {isLowest ? 'Award PO' : 'Award'}
                                            </Button>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  </>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <p className="text-[9px] text-[hsl(var(--muted-foreground))] text-center mt-2 leading-relaxed">
                          Awarding a PO will automatically convert this request to an Approved Purchase Order and lock in the winning rates.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (() => {
                  const isApprovedOrLocked = ['approved', 'partially_delivered', 'delivered'].includes(selectedPo.status);
                  return (
                    <>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 border border-[hsl(var(--border))] rounded-lg p-2.5 bg-[hsl(var(--muted)/0.1)]">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[hsl(var(--muted-foreground))] uppercase text-[10px]">Approved Vendor</span>
                            {isApprovedOrLocked && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                          </div>
                          {isApprovedOrLocked ? (
                            <p className="font-bold text-xs text-[hsl(var(--foreground))] py-1.5 px-2 bg-[hsl(var(--muted)/0.4)] rounded border border-[hsl(var(--border))] truncate">
                              {selectedPo.vendorName || 'Not Assigned'}
                            </p>
                          ) : (
                            <select
                              value={selectedPo.vendorName || ''}
                              disabled={updatingPo}
                              onChange={(e) => setSelectedPo({ ...selectedPo, vendorName: e.target.value })}
                              className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-md px-2 py-1.5 text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                            >
                              <option value="" disabled>Select Approved Vendor...</option>
                              {vendors.map((v: any) => (
                                <option key={v._id} value={v.name}>{v.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="space-y-0.5 border border-[hsl(var(--border))] rounded-lg p-2.5 bg-[hsl(var(--muted)/0.1)]">
                          <span className="font-semibold text-[hsl(var(--muted-foreground))] block uppercase text-[10px]">Target Date</span>
                          <span className="font-bold text-[hsl(var(--foreground))]">
                            {selectedPo.deliveryDate ? new Date(selectedPo.deliveryDate).toLocaleDateString() : 'Not specified'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 border border-[hsl(var(--border))] rounded-lg p-4 bg-[hsl(var(--card))]">
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--foreground))] tracking-wider block">Procurement Status Pipeline</span>
                        <div className="relative">
                          <select
                            value={selectedPo.status}
                            disabled={updatingPo}
                            onChange={(e) => {
                              if (e.target.value === 'delivered' || e.target.value === 'partially_delivered') {
                                setIsGRNOpen(true);
                              } else {
                                setSelectedPo({ ...selectedPo, status: e.target.value });
                              }
                            }}
                            className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                          >
                            <option value="pending">Planned (Pending)</option>
                            <option value="rfq">RFQ (Quotation Stage)</option>
                            <option value="approved">Approved PO</option>
                            <option value="partially_delivered">Partially Delivered</option>
                            <option value="delivered">Delivered (Loads to Inventory)</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          {updatingPo && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-[hsl(var(--primary))]" />}
                        </div>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1 leading-normal">
                          Changing the status to &quot;Delivered&quot; automatically inserts these materials into your inventory system for site installation logging.
                        </p>
                      </div>

                      {(() => {
                        let parsedGrns = selectedPo.grns;
                        if (!parsedGrns && selectedPo.grnData?.allGrns) {
                          try { parsedGrns = JSON.parse(selectedPo.grnData.allGrns); } catch(e) {}
                        }
                        if (!parsedGrns && selectedPo.grnData) {
                          parsedGrns = [selectedPo.grnData];
                        }

                        if (parsedGrns && parsedGrns.length > 0) {
                          return (
                            <div className="space-y-3">
                              <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Delivery Proofs (GRN)
                              </span>
                              {parsedGrns.map((grn: any, idx: number) => (
                                <div key={idx} className="border border-emerald-200 bg-emerald-50/50 rounded-md p-2 flex items-center justify-between">
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs flex-1">
                                    <div>
                                      <p className="text-[9px] font-semibold text-emerald-600/70 uppercase">Challan No.</p>
                                      <p className="font-bold text-emerald-900 leading-tight">{grn.challanNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] font-semibold text-emerald-600/70 uppercase">Received On</p>
                                      <p className="font-bold text-emerald-900 leading-tight">{grn.receivedAt ? new Date(grn.receivedAt).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                    {grn.receivedBy && (
                                      <div className="col-span-2">
                                        <p className="text-[9px] font-semibold text-emerald-600/70 uppercase">Received By</p>
                                        <p className="font-bold text-emerald-900 leading-tight">{grn.receivedBy}</p>
                                      </div>
                                    )}
                                  </div>
                                  {(grn.proofUrl || grn.invoiceUrl) && (
                                    <div className="shrink-0 ml-2">
                                      <button 
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setViewingImages({ proofUrl: grn.proofUrl, invoiceUrl: grn.invoiceUrl });
                                        }}
                                        className="p-1.5 text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-md transition-colors"
                                        title="View Proof & Invoice"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1.5">
                            Ordered Products List
                            {isApprovedOrLocked && (
                              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/40">
                                <Lock className="w-2.5 h-2.5" /> Rates Locked
                              </span>
                            )}
                          </span>
                          {!isApprovedOrLocked && (
                            <button onClick={handleSaveRates} disabled={updatingPo} className="text-[10px] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-2 py-1 rounded font-bold hover:bg-[hsl(var(--primary)/0.2)] flex items-center gap-1 transition-colors">
                              {updatingPo ? <Loader2 className="w-3 h-3 animate-spin" /> : null} Save Rates
                            </button>
                          )}
                        </div>
                        <div className="border border-[hsl(var(--border))] rounded-lg divide-y divide-[hsl(var(--border))]">
                          {selectedPo.items && selectedPo.items.length > 0 ? (
                            selectedPo.items.map((item: any, idx: number) => (
                              <div key={idx} className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                                <div>
                                  <p className="font-bold text-[hsl(var(--foreground))]">{item.name}</p>
                                  <div className="flex items-center gap-1 mt-1 text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                                    <span>{item.quantity} {item.unit} @ </span>
                                    {isApprovedOrLocked ? (
                                      <span className="font-bold text-[hsl(var(--foreground))]">{currencySymbol} {item.unitPrice || 0}</span>
                                    ) : (
                                      <>
                                        <span>{currencySymbol}</span>
                                        <input 
                                          type="number" 
                                          min="0" 
                                          value={item.unitPrice || ''} 
                                          onChange={(e) => handleLocalRateChange(idx, parseFloat(e.target.value) || 0)}
                                          className="w-16 px-1 py-0.5 border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] text-right"
                                        />
                                      </>
                                    )}
                                    <span>each</span>
                                  </div>
                                </div>
                                <span className="font-bold font-mono text-[hsl(var(--foreground))]">{formatCost(item.quantity * (item.unitPrice || 0))}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 flex items-center justify-between text-xs bg-[hsl(var(--card))]">
                              <div>
                                <p className="font-bold text-[hsl(var(--foreground))]">{selectedPo.materialName}</p>
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                                  <span>1 unit @ </span>
                                  {isApprovedOrLocked ? (
                                    <span className="font-bold text-[hsl(var(--foreground))]">{currencySymbol} {selectedPo.amount || 0}</span>
                                  ) : (
                                    <>
                                      <span>{currencySymbol}</span>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        value={selectedPo.amount || ''} 
                                        onChange={(e) => {
                                          const newAmount = parseFloat(e.target.value) || 0;
                                          setSelectedPo({ ...selectedPo, amount: newAmount });
                                        }}
                                        className="w-16 px-1 py-0.5 border border-[hsl(var(--border))] rounded bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--primary))] text-right"
                                      />
                                    </>
                                  )}
                                  <span>each</span>
                                </div>
                              </div>
                              <span className="font-bold font-mono text-[hsl(var(--foreground))]">{formatCost(selectedPo.amount)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  );
                })()}

                {selectedPo.status !== 'requested' && selectedPo.status !== 'rfq' && (
                  <div className="p-4 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.25)] flex items-center justify-between text-xs font-bold">
                    <span className="text-[hsl(var(--muted-foreground))] uppercase">Total Amount</span>
                    <span className="text-sm font-extrabold text-[hsl(var(--foreground))] font-mono">{formatCost(selectedPo.amount)}</span>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center gap-3">
                <Button onClick={handleDeletePO} variant="outline" className="w-full text-red-500 hover:bg-red-50 hover:text-red-700 border-red-200">
                  <Trash2 className="w-4 h-4 mr-2" /> {selectedPo.status === 'requested' ? 'Delete Request' : 'Delete PO'}
                </Button>
                {selectedPo.status !== 'requested' && selectedPo.status !== 'rfq' && (
                  <Button 
                    onClick={async () => {
                      await handleSaveRates();
                      setIsDetailOpen(false);
                    }} 
                    className="w-full"
                    disabled={updatingPo}
                  >
                    {updatingPo ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Submit Details
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Install Material Modal */}
      <AnimatePresence>
        {isInstallOpen && selectedStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-500" /> Log Material Usage
                </h3>
                <button onClick={() => setIsInstallOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLogInstallation}>
                <div className="p-5 space-y-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-emerald-800 dark:text-emerald-400">Material Name: {selectedStock.productName}</p>
                    <p className="text-emerald-700 dark:text-emerald-500">
                      Available Stock: <span className="font-bold">{selectedStock.totalReceived - selectedStock.installedQuantity} {selectedStock.unit}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Quantity to Use ({selectedStock.unit}) *</label>
                    <Input required type="number" min="1" placeholder="e.g. 10" value={installQty} onChange={(e) => setInstallQty(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Usage Notes / Comments</label>
                    <Input
                      placeholder="e.g. Used primary copper lines on Floor 4, Zone Alpha"
                      value={installNotes}
                      onChange={(e) => setInstallNotes(e.target.value)}
                    />
                  </div>

                  {installError && (
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{installError}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsInstallOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loggingInstall || !installQty}>
                    {loggingInstall && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Confirm Usage
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Material Modal */}
      <AnimatePresence>
        {isCreateMaterialOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <Package className="w-5 h-5 text-[hsl(var(--primary))]" /> Add New Material
                </h3>
                <button onClick={() => setIsCreateMaterialOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateMaterial}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Material Name *</label>
                    <Input required placeholder="e.g. Copper pipes 22mm" value={newMaterialName} onChange={(e) => setNewMaterialName(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Measurement Unit *</label>
                    <Input required placeholder="e.g. rm, nos, sqft" value={newMaterialUnit} onChange={(e) => setNewMaterialUnit(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Initial Stock (Default: 0)</label>
                    <Input type="number" min="0" placeholder="0" value={newMaterialStock} onChange={(e) => setNewMaterialStock(e.target.value === '' ? '' : parseInt(e.target.value, 10))} />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsCreateMaterialOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creatingMaterial || !newMaterialName || !newMaterialUnit}>
                    {creatingMaterial && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Material
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Vendor / Record Outgoing Payment Modal */}
      <AnimatePresence>
        {isPayModalOpen && payingPo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))] shrink-0">
                <div>
                  <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-500" /> Record Vendor Payment
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    PO {payingPo.poNumber} • {payingPo.vendorName || 'Vendor'}
                  </p>
                </div>
                <button onClick={() => setIsPayModalOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPaymentSubmit} className="flex flex-col overflow-hidden">
                <div className="p-5 space-y-4 overflow-y-auto">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-emerald-800 dark:text-emerald-400">Material: {payingPo.materialName}</p>
                    <p className="text-emerald-700 dark:text-emerald-500">
                      Total PO Amount: <span className="font-bold">{currencySymbol} {(payingPo.amount || 0).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Payment Amount ({currencySymbol}) *</label>
                    <Input
                      required
                      type="number"
                      min="1"
                      placeholder="e.g. 50000"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Payment Method *</label>
                      <select
                        value={paymentForm.paymentMethod}
                        onChange={(e: any) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                      >
                        <option value="Bank Transfer">Bank Transfer / NEFT</option>
                        <option value="UPI">UPI</option>
                        <option value="Cheque">Cheque</option>
                        <option value="RTGS/NEFT">RTGS</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Payment Date *</label>
                      <Input
                        required
                        type="date"
                        value={paymentForm.paymentDate}
                        onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Ref / Transaction / Cheque No. *</label>
                    <Input
                      required
                      placeholder="e.g. TXN-982109283"
                      value={paymentForm.referenceNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Remarks / Notes</label>
                    <Input
                      placeholder="e.g. 50% advance for material delivery"
                      value={paymentForm.remarks}
                      onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Project Name</label>
                    <Input
                      placeholder="e.g. Skyline Residency"
                      value={paymentForm.projectName}
                      onChange={(e) => setPaymentForm({ ...paymentForm, projectName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Project Location</label>
                    <Input
                      placeholder="e.g. Mumbai, MH"
                      value={paymentForm.projectLocation}
                      onChange={(e) => setPaymentForm({ ...paymentForm, projectLocation: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[hsl(var(--foreground))]">Invoice No.</label>
                    <Input
                      placeholder="e.g. INV-2023-001"
                      value={paymentForm.invoiceNo}
                      onChange={(e) => setPaymentForm({ ...paymentForm, invoiceNo: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] shrink-0">
                  <Button variant="outline" type="button" onClick={() => setIsPayModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingPayment || !paymentForm.amount || !paymentForm.referenceNo}>
                    {isSubmittingPayment && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Confirm &amp; Record Payment
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Viewer Modal */}
      <AnimatePresence>
        {viewingImages && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setViewingImages(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-4xl border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[hsl(var(--primary))]" /> Document Viewer
                </h3>
                <button onClick={() => setViewingImages(null)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[hsl(var(--muted)/0.2)]">
                {viewingImages.proofUrl ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-center text-[hsl(var(--foreground))]">Delivery Proof</h4>
                    <img src={viewingImages.proofUrl} alt="Delivery Proof" className="w-full h-auto rounded-lg shadow-sm border border-[hsl(var(--border))]" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] border-2 border-dashed border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] text-sm">
                    No Delivery Proof Uploaded
                  </div>
                )}
                
                {viewingImages.invoiceUrl ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold text-center text-[hsl(var(--foreground))]">Invoice</h4>
                    <img src={viewingImages.invoiceUrl} alt="Invoice" className="w-full h-auto rounded-lg shadow-sm border border-[hsl(var(--border))]" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px] border-2 border-dashed border-[hsl(var(--border))] rounded-lg text-[hsl(var(--muted-foreground))] text-sm">
                    No Invoice Uploaded
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SendRFQModal 
        isOpen={isSendRFQOpen} 
        onClose={() => setIsSendRFQOpen(false)} 
        po={selectedPo} 
        vendors={vendors} 
        onSuccess={() => {
          handleUpdateStatus('rfq');
          setActivePipeline('rfq');
        }}
      />
      <InteriorGRNModal
        isOpen={isGRNOpen}
        onClose={() => setIsGRNOpen(false)}
        po={selectedPo}
        onSubmit={handleSubmitGRN}
      />
    </div>
  );
}
