'use client';

// Port of interior-os-frontend's projects/[projectId]/procurement/page.tsx.
// Uses window.confirm instead of the source app's useConfirm dialog context
// (not present in sky-lite-web).

import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { SendRFQModal } from './SendRFQModal';
import { InteriorGRNModal } from './InteriorGRNModal';
import { Card, CardContent, CardHeader, CardTitle, Button, Input } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import interiorApiClient from '@/services/interiorApi.client';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';
import { useConfirm } from '@/providers/ConfirmContext';

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

  const [activeTab, setActiveTab] = useState<'procurement' | 'inventory'>('procurement');
  const [activePipeline, setActivePipeline] = useState('requested');
  const [pos, setPos] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddPoOpen, setIsAddPoOpen] = useState(false);
  const [creatingPo, setCreatingPo] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [poItems, setPoItems] = useState<POItemInput[]>([]);
  const [newItem, setNewItem] = useState<POItemInput>({ name: '', quantity: 1, unit: 'nos', unitPrice: 0 });

  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [updatingPo, setUpdatingPo] = useState(false);
  const [isSendRFQOpen, setIsSendRFQOpen] = useState(false);
  const [isGRNOpen, setIsGRNOpen] = useState(false);

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

  const fetchPOs = async () => {
    try {
      const res = await interiorProjectService.getPurchaseOrders(projectId);
      if (res.success && res.data) {
        setPos(res.data);
      }
    } catch (err) {
      console.error('Failed to load POs', err);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await interiorProjectService.getInventory(projectId);
      if (res.success && res.data) {
        setInventory(res.data);
      }
    } catch (err) {
      console.error('Failed to load inventory', err);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await interiorApiClient.get('/vendors');
      setVendors(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load vendors', err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchPOs(), fetchInventory(), fetchVendors()]);
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

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
    const selectedItem = inventory.find(i => i.productName === materialName);
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
      fetchInventory();
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
      fetchInventory();
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
      loadAllData();
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
      setPos((prev) => prev.map((po) => (po._id === selectedPo._id ? { ...po, status } : po)));
      const res = await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { status });
      if (res.success) {
        setSelectedPo(res.data);
      }
      loadAllData();
    } catch (err) {
      console.error('Failed to update status', err);
      toast.error('Failed to update PO status');
      loadAllData();
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleUpdateVendor = async (vendorName: string) => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);
      setPos((prev) => prev.map((po) => (po._id === selectedPo._id ? { ...po, vendorName, status: 'approved' } : po)));
      setSelectedPo({ ...selectedPo, vendorName, status: 'approved' });
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { vendorName, status: 'approved' });
      toast.success('Vendor selected and PO approved!');
      setIsDetailOpen(false);
      loadAllData();
    } catch (err) {
      console.error('Failed to update vendor', err);
      toast.error('Failed to update vendor');
      loadAllData();
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

  const handleSubmitGRN = async (receivedItems: any[], challanNumber: string, proofUrl: string) => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);
      const newGrn = {
        receivedItems,
        challanNumber,
        proofUrl,
        receivedAt: new Date().toISOString()
      };
      
      const currentGrns = selectedPo.grns || (selectedPo.grnData ? [selectedPo.grnData] : []);
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
      
      const updatedPo = { ...selectedPo, status: newStatus, grns: updatedGrns };
      setPos(prev => prev.map(p => p._id === updatedPo._id ? updatedPo : p));
      
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { 
        status: newStatus,
        grns: updatedGrns 
      });
      
      setSelectedPo(updatedPo);
      loadAllData();
    } catch (err) {
      console.error('Failed to submit GRN', err);
      throw err;
    } finally {
      setUpdatingPo(false);
    }
  };

  const handleSaveRates = async () => {
    if (!selectedPo) return;
    try {
      setUpdatingPo(true);
      await interiorProjectService.updatePurchaseOrder(projectId, selectedPo._id, { 
        items: selectedPo.items, 
        amount: selectedPo.amount 
      });
      setPos(prev => prev.map(p => p._id === selectedPo._id ? selectedPo : p));
      toast.success('Rates saved successfully');
    } catch (err) {
      console.error('Failed to save rates', err);
      toast.error('Failed to save rates');
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
      loadAllData();
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
      loadAllData();
    } catch (err: any) {
      console.error('Failed to log material usage', err);
      setInstallError(err.response?.data?.message || 'Failed to log material usage');
    } finally {
      setLoggingInstall(false);
    }
  };

  const pipelines = [
    { key: 'requested', label: 'Material Request', icon: FileText, color: 'text-purple-500' },
    { key: 'pending', label: 'Purchase Order', icon: Clock, color: 'text-slate-500' },
    { key: 'approved', label: 'Approved PO', icon: ShoppingCart, color: 'text-blue-500' },
    { key: 'dispatched', label: 'In Transit', icon: Truck, color: 'text-indigo-500' },
    { key: 'partially_delivered', label: 'Partial Delivery', icon: AlertCircle, color: 'text-yellow-500' },
    { key: 'delivered', label: 'Delivered', icon: Wrench, color: 'text-emerald-500' },
  ];

  const formatCost = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
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
            <p className="text-xl font-bold mt-1">{formatCost(pos.reduce((acc, c) => acc + (c.amount || 0), 0))}</p>
          </div>
          <ShoppingCart className="w-8 h-8 text-blue-500/20" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Active Purchase Orders</p>
            <p className="text-xl font-bold mt-1">
              {pos.filter((po) => ['approved', 'dispatched'].includes(po.status)).length} POs
            </p>
          </div>
          <Truck className="w-8 h-8 text-amber-500/20" />
        </Card>
        <Card className="p-4 flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">POs Received / Delivered</p>
            <p className="text-xl font-bold mt-1">{pos.filter((po) => po.status === 'delivered').length} POs</p>
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
                  const items = pos.filter((po) => po.status === pipe.key);
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
              {pos.filter((po) => po.status === activePipeline).map((item) => (
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
                      <span className="font-mono font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded-md">{item.poNumber}</span>
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPo(item);
                        setIsSendRFQOpen(true);
                      }}
                      className="w-full mt-2"
                      size="sm"
                    >
                      Create PO
                    </Button>
                  )}
                  {activePipeline === 'dispatched' && (
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
                </motion.div>
              ))}
            </div>

            {pos.filter((po) => po.status === activePipeline).length === 0 && (
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
              {inventory.map((item) => {
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
                          placeholder="Rate (₹)"
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
                  <h3 className="text-base font-bold mt-1 text-[hsl(var(--foreground))]">Purchase Order Details</h3>
                </div>
                <button onClick={() => setIsDetailOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-6 flex-1 overflow-y-auto">
                {(() => {
                  const isApprovedOrLocked = ['approved', 'dispatched', 'partially_delivered', 'delivered'].includes(selectedPo.status);
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
                              onChange={(e) => handleUpdateVendor(e.target.value)}
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
                                handleUpdateStatus(e.target.value);
                              }
                            }}
                            className="w-full bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 text-xs font-semibold text-[hsl(var(--foreground))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                          >
                            <option value="pending">Planned (Pending)</option>
                            <option value="approved">Approved PO</option>
                            <option value="dispatched">In Transit (Dispatched)</option>
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

                      {selectedPo.grns && selectedPo.grns.length > 0 ? (
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Delivery Proofs (GRM)
                          </span>
                          {selectedPo.grns.map((grn: any, idx: number) => (
                            <div key={idx} className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3">
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-[10px] font-semibold text-emerald-600/70">Challan No.</p>
                                  <p className="font-bold text-emerald-900">{grn.challanNumber}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-semibold text-emerald-600/70">Received On</p>
                                  <p className="font-bold text-emerald-900">{new Date(grn.receivedAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              {grn.proofUrl && (
                                <div className="mt-2">
                                  <a href={grn.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline font-semibold bg-emerald-100/50 px-2 py-1 rounded">
                                    <Camera className="w-3 h-3" /> View Photo Proof
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : selectedPo.grnData && (
                        <div className="space-y-2 border border-emerald-200 bg-emerald-50/50 rounded-lg p-4">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Delivery Proof (GRM)
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-600/70">Challan No.</p>
                              <p className="font-bold text-emerald-900">{selectedPo.grnData.challanNumber}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-semibold text-emerald-600/70">Received On</p>
                              <p className="font-bold text-emerald-900">{new Date(selectedPo.grnData.receivedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          {selectedPo.grnData.proofUrl && (
                            <div className="mt-2">
                              <p className="text-[10px] font-semibold text-emerald-600/70 mb-1">Attached Photo</p>
                              <a href={selectedPo.grnData.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline font-semibold bg-emerald-100/50 px-2 py-1 rounded">
                                <Camera className="w-3 h-3" /> View Photo Proof
                              </a>
                            </div>
                          )}
                        </div>
                      )}

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
                                      <span className="font-bold text-[hsl(var(--foreground))]">₹{item.unitPrice || 0}</span>
                                    ) : (
                                      <>
                                        <span>₹</span>
                                        <input 
                                          type="number" 
                                          min="0" 
                                          value={item.unitPrice || 0} 
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
                                    <span className="font-bold text-[hsl(var(--foreground))]">₹{selectedPo.amount || 0}</span>
                                  ) : (
                                    <>
                                      <span>₹</span>
                                      <input 
                                        type="number" 
                                        min="0" 
                                        value={selectedPo.amount || 0} 
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

                <div className="p-4 border border-[hsl(var(--border))] rounded-lg bg-[hsl(var(--muted)/0.25)] flex items-center justify-between text-xs font-bold">
                  <span className="text-[hsl(var(--muted-foreground))] uppercase">Total Amount</span>
                  <span className="text-sm font-extrabold text-[hsl(var(--foreground))] font-mono">{formatCost(selectedPo.amount)}</span>
                </div>
              </div>

              <div className="p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)] flex items-center gap-3">
                <Button onClick={handleDeletePO} variant="outline" className="w-full text-red-500 hover:bg-red-50 hover:text-red-700 border-red-200">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete PO
                </Button>
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

      <SendRFQModal 
        isOpen={isSendRFQOpen} 
        onClose={() => setIsSendRFQOpen(false)} 
        po={selectedPo} 
        vendors={vendors} 
        onSuccess={() => handleUpdateStatus('pending')}
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
