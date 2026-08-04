'use client';

// Port of interior-os-frontend's projects/[projectId]/wbs/page.tsx.
// Permission gating (useProjectPermissions) and the custom useConfirm dialog
// are not present in sky-lite-web; actions are always shown and deletions
// use window.confirm instead.

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Layers,
  MapPin,
  Maximize2,
  Hammer,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';
import { Button, Input, Card } from '@/components/interior/ui';
import { interiorProjectService } from '@/services/interiorProject.service';
import { cn } from '@/lib/utils';
import { useToast } from '@/providers/ToastContext';

interface InteriorWbsViewProps {
  projectId: string;
}

type NodeType = 'building' | 'floor' | 'zone' | 'area' | 'package';

export default function InteriorWbsView({ projectId }: InteriorWbsViewProps) {
  const toast = useToast();

  const [wbsData, setWbsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentNodeType, setCurrentNodeType] = useState<NodeType>('building');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [currentNodeId, setCurrentNodeId] = useState('');
  const [nodeName, setNodeName] = useState('');
  const [packageTrade, setPackageTrade] = useState('interior');
  const [submitting, setSubmitting] = useState(false);

  const fetchWbs = async () => {
    try {
      setLoading(true);
      const res = await interiorProjectService.getWbs(projectId);
      setWbsData(res?.success && res?.data ? res.data : []);
    } catch (err) {
      console.warn('Failed to load WBS', err);
      setWbsData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchWbs();
  }, [projectId]);

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => (prev.includes(id) ? prev.filter((nodeId) => nodeId !== id) : [...prev, id]));
  };

  const handleOpenCreateModal = (type: 'floor' | 'zone' | 'area' | 'package', parentId: string) => {
    setModalType('create');
    setCurrentNodeType(type);
    setSelectedParentId(parentId);
    setNodeName('');
    setPackageTrade('interior');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (type: NodeType, node: any) => {
    setModalType('edit');
    setCurrentNodeType(type);
    setCurrentNodeId(node.id);
    setNodeName(node.name);
    if (node.trade) setPackageTrade(node.trade);
    setIsModalOpen(true);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (modalType === 'create') {
        await interiorProjectService.addWbsNode(projectId, {
          type: currentNodeType,
          name: nodeName,
          parentId: selectedParentId || undefined,
          trade: currentNodeType === 'package' ? packageTrade : undefined,
        });
      } else {
        await interiorProjectService.updateWbsNode(projectId, {
          type: currentNodeType,
          id: currentNodeId,
          name: nodeName,
          trade: currentNodeType === 'package' ? packageTrade : undefined,
        });
      }
      setIsModalOpen(false);
      fetchWbs();
    } catch (err) {
      console.error('Save WBS Node failed', err);
      toast.error('Failed to save node');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNode = async (type: string, id: string) => {
    if (!window.confirm(`Delete this ${type}? Doing so will remove it and any associated associations.`)) return;
    try {
      await interiorProjectService.deleteWbsNode(projectId, type, id);
      toast.success(`${type.toUpperCase()} deleted successfully`);
      fetchWbs();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete node. Check if it contains children.');
    }
  };

  const renderTree = (nodes: any[], depth = 0) => {
    return (
      <div className="space-y-2 mt-2">
        {nodes.map((node) => {
          const hasChildren =
            (node.floors && node.floors.length > 0) ||
            (node.zones && node.zones.length > 0) ||
            (node.areas && node.areas.length > 0) ||
            (node.packages && node.packages.length > 0);
          const isExpanded = expandedNodes.includes(node.id);

          let Icon = Building2;
          let childType: 'floor' | 'zone' | 'area' | 'package' | null = null;
          let childrenField = '';

          if (node.type === 'building') {
            Icon = Building2;
            childType = 'floor';
            childrenField = 'floors';
          } else if (node.type === 'floor') {
            Icon = Layers;
            childType = 'zone';
            childrenField = 'zones';
          } else if (node.type === 'zone') {
            Icon = MapPin;
            childType = 'area';
            childrenField = 'areas';
          } else if (node.type === 'area') {
            Icon = Maximize2;
            childType = 'package';
            childrenField = 'packages';
          } else if (node.type === 'package') {
            Icon = Hammer;
            childType = null;
          }

          return (
            <div key={node.id} className="select-none">
              <div
                className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] group hover:border-[hsl(var(--primary)/0.3)] transition-all duration-150',
                  depth > 0 && `ml-${depth * 4}`
                )}
              >
                <div className="flex items-center gap-2">
                  {childType ? (
                    <button onClick={() => toggleNode(node.id)} className="p-1 rounded hover:bg-[hsl(var(--muted))]">
                      {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}
                  <Icon className="w-4 h-4 text-[hsl(var(--primary))]" />
                  <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{node.name}</span>
                  {node.trade && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono rounded bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]">
                      {node.trade}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {childType && (
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenCreateModal(childType!, node.id)}>
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenEditModal(node.type, node)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                    onClick={() => handleDeleteNode(node.type, node.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && hasChildren && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden pl-4 border-l border-[hsl(var(--border))] ml-4"
                  >
                    {renderTree(node[childrenField], depth + 1)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">Work Breakdown Structure (WBS)</h2>
          <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Define logical physical areas and assign trade packages.</p>
        </div>
        <Button
          onClick={() => {
            setModalType('create');
            setCurrentNodeType('building');
            setSelectedParentId('');
            setNodeName('');
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add Building
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
        </div>
      ) : (
        <Card className="p-4 bg-[hsl(var(--card)/0.5)] backdrop-blur-md">
          {wbsData.length === 0 ? (
            <div className="text-center py-12 text-sm text-[hsl(var(--muted-foreground))]">
              No buildings defined yet. Click &quot;Add Building&quot; to initialize project scope.
            </div>
          ) : (
            renderTree(wbsData)
          )}
        </Card>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md border border-[hsl(var(--border))] rounded-xl bg-[hsl(var(--card))] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[hsl(var(--border))]">
                <h3 className="text-base font-bold text-[hsl(var(--foreground))] capitalize">
                  {modalType === 'create' ? `Add New ${currentNodeType}` : `Edit ${currentNodeType}`}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-1 rounded-md text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveNode}>
                <div className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold">Node Name</label>
                    <Input
                      required
                      placeholder={`e.g. ${currentNodeType === 'building' ? 'Tower A' : currentNodeType === 'floor' ? '12th Floor' : 'Name'}`}
                      value={nodeName}
                      onChange={(e) => setNodeName(e.target.value)}
                    />
                  </div>

                  {currentNodeType === 'package' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold">Trade/Discipline</label>
                      <select
                        className="w-full px-3 py-2 text-sm rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none"
                        value={packageTrade}
                        onChange={(e) => setPackageTrade(e.target.value)}
                      >
                        <option value="civil">Civil & Structural</option>
                        <option value="interior">Interior Finishing</option>
                        <option value="mep">MEP Services</option>
                        <option value="electrical">Electrical Works</option>
                        <option value="hvac">HVAC Install</option>
                        <option value="phe">PHE Services</option>
                        <option value="fire_fighting">Fire Fighting</option>
                        <option value="elv">ELV Systems</option>
                        <option value="other">Other Trades</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 p-5 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                  <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Node
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
