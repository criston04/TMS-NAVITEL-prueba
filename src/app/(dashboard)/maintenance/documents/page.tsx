/**
 * @fileoverview Página de Documentos Vehiculares
 * Gestión de certificados, permisos y documentación legal de vehículos
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Search,
  Plus,
  Download,
  Upload,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  Shield,
  Car,
  Building,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Gauge,
  X,
} from 'lucide-react';
import Link from 'next/link';

// Tipos de documentos
const documentTypes = {
  soat: { label: 'SOAT', icon: Shield, color: 'text-blue-600' },
  technical_review: { label: 'Revisión Técnica', icon: Car, color: 'text-green-600' },
  operating_permit: { label: 'Permiso Operación', icon: Building, color: 'text-purple-600' },
  circulation_card: { label: 'Tarjeta de Circulación', icon: FileText, color: 'text-orange-600' },
  insurance: { label: 'Seguro', icon: Shield, color: 'text-blue-600' },
  property_card: { label: 'Tarjeta de Propiedad', icon: FileText, color: 'text-slate-600' },
  environmental_certificate: { label: 'Certificado Ambiental', icon: FileText, color: 'text-green-600' },
  other: { label: 'Otros', icon: FileText, color: 'text-gray-600' },
} as const;

const statusConfig = {
  valid: {
    label: 'Vigente',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle2,
  },
  expiring_soon: {
    label: 'Por Vencer',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Clock,
  },
  expired: {
    label: 'Vencido',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertTriangle,
  },
  pending: {
    label: 'Pendiente',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: AlertCircle,
  },
} as const;

// Tipo de documento
interface VehicleDocument {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  documentType: keyof typeof documentTypes;
  documentNumber: string;
  issueDate: string;
  expirationDate: string;
  status: keyof typeof statusConfig;
  issuer: string;
  notes?: string;
  fileUrl?: string;
  vehicleHours?: number;
  vehicleKm?: number;
  alertHours?: number;
  alertKm?: number;
}

// Tipos de alertas
interface Alert {
  id: string;
  type: 'date' | 'hours' | 'km';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  documentId: string;
  vehiclePlate: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  kmRemaining?: number;
}

export default function DocumentsPage() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<VehicleDocument[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDocument, setSelectedDocument] = useState<VehicleDocument | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showNewDocumentDialog, setShowNewDocumentDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState<VehicleDocument | null>(null);
  const [showExpiredAlert, setShowExpiredAlert] = useState(true);
  const [showExpiringAlert, setShowExpiringAlert] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    filterDocuments();
  }, [documents, searchTerm, statusFilter, typeFilter]);

  const generateAlerts = (docs: VehicleDocument[]) => {
    const newAlerts: Alert[] = [];

    docs.forEach((doc) => {
      // Alertas por fecha
      const daysRemaining = getDaysUntilExpiration(doc.expirationDate);
      if (daysRemaining <= 0) {
        newAlerts.push({
          id: `date-${doc.id}`,
          type: 'date',
          severity: 'critical',
          message: `${doc.vehiclePlate} - ${documentTypes[doc.documentType].label} VENCIDO`,
          documentId: doc.id,
          vehiclePlate: doc.vehiclePlate,
          daysRemaining,
        });
      } else if (daysRemaining <= 7) {
        newAlerts.push({
          id: `date-${doc.id}`,
          type: 'date',
          severity: 'critical',
          message: `${doc.vehiclePlate} - ${documentTypes[doc.documentType].label} vence en ${daysRemaining} días`,
          documentId: doc.id,
          vehiclePlate: doc.vehiclePlate,
          daysRemaining,
        });
      } else if (daysRemaining <= 30) {
        newAlerts.push({
          id: `date-${doc.id}`,
          type: 'date',
          severity: 'warning',
          message: `${doc.vehiclePlate} - ${documentTypes[doc.documentType].label} vence en ${daysRemaining} días`,
          documentId: doc.id,
          vehiclePlate: doc.vehiclePlate,
          daysRemaining,
        });
      }

      // Alertas por horas
      if (doc.alertHours && doc.vehicleHours) {
        const hoursRemaining = doc.alertHours - doc.vehicleHours;
        if (hoursRemaining <= 0) {
          newAlerts.push({
            id: `hours-${doc.id}`,
            type: 'hours',
            severity: 'critical',
            message: `${doc.vehiclePlate} - Límite de horas alcanzado (${doc.vehicleHours}h)`,
            documentId: doc.id,
            vehiclePlate: doc.vehiclePlate,
            hoursRemaining,
          });
        } else if (hoursRemaining <= 100) {
          newAlerts.push({
            id: `hours-${doc.id}`,
            type: 'hours',
            severity: 'warning',
            message: `${doc.vehiclePlate} - Quedan ${hoursRemaining} horas para mantenimiento`,
            documentId: doc.id,
            vehiclePlate: doc.vehiclePlate,
            hoursRemaining,
          });
        }
      }

      // Alertas por kilómetros
      if (doc.alertKm && doc.vehicleKm) {
        const kmRemaining = doc.alertKm - doc.vehicleKm;
        if (kmRemaining <= 0) {
          newAlerts.push({
            id: `km-${doc.id}`,
            type: 'km',
            severity: 'critical',
            message: `${doc.vehiclePlate} - Límite de km alcanzado (${doc.vehicleKm.toLocaleString()} km)`,
            documentId: doc.id,
            vehiclePlate: doc.vehiclePlate,
            kmRemaining,
          });
        } else if (kmRemaining <= 5000) {
          newAlerts.push({
            id: `km-${doc.id}`,
            type: 'km',
            severity: 'warning',
            message: `${doc.vehiclePlate} - Quedan ${kmRemaining.toLocaleString()} km para mantenimiento`,
            documentId: doc.id,
            vehiclePlate: doc.vehiclePlate,
            kmRemaining,
          });
        }
      }
    });

    setAlerts(newAlerts);
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      // Simulación de datos - reemplazar con servicio real
      const mockDocuments: VehicleDocument[] = [
        {
          id: '1',
          vehicleId: 'v1',
          vehiclePlate: 'ABC-123',
          documentType: 'soat',
          documentNumber: 'SOAT-2024-001234',
          issueDate: '2024-01-15',
          expirationDate: '2025-01-15',
          status: 'valid',
          issuer: 'Pacífico Seguros',
          vehicleHours: 8500,
          vehicleKm: 125000,
          alertHours: 10000,
          alertKm: 150000,
        },
        {
          id: '2',
          vehicleId: 'v1',
          vehiclePlate: 'ABC-123',
          documentType: 'technical_review',
          documentNumber: 'RT-2024-5678',
          issueDate: '2024-03-10',
          expirationDate: '2025-03-10',
          status: 'valid',
          issuer: 'Touring y Automóvil Club',
          vehicleHours: 8500,
          vehicleKm: 125000,
          alertHours: 9000,
          alertKm: 130000,
        },
        {
          id: '3',
          vehicleId: 'v2',
          vehiclePlate: 'XYZ-789',
          documentType: 'operating_permit',
          documentNumber: 'OP-2024-9876',
          issueDate: '2024-02-20',
          expirationDate: '2024-12-31',
          status: 'expiring_soon',
          issuer: 'MTC',
          vehicleHours: 9500,
          vehicleKm: 142000,
          alertHours: 10000,
          alertKm: 145000,
        },
        {
          id: '4',
          vehicleId: 'v3',
          vehiclePlate: 'DEF-456',
          documentType: 'soat',
          documentNumber: 'SOAT-2023-999',
          issueDate: '2023-06-01',
          expirationDate: '2024-06-01',
          status: 'expired',
          issuer: 'Rímac Seguros',
        },
        {
          id: '5',
          vehicleId: 'v2',
          vehiclePlate: 'XYZ-789',
          documentType: 'circulation_card',
          documentNumber: 'TC-2024-1111',
          issueDate: '2024-01-05',
          expirationDate: '2025-01-05',
          status: 'valid',
          issuer: 'SAT Lima',
        },
      ];
      
      setDocuments(mockDocuments);
      setFilteredDocuments(mockDocuments);
      generateAlerts(mockDocuments);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDocuments = () => {
    let filtered = [...documents];

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.documentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          documentTypes[doc.documentType].label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    // Filtro de tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter((doc) => doc.documentType === typeFilter);
    }

    setFilteredDocuments(filtered);
  };

  // Calcular días hasta vencimiento
  const getDaysUntilExpiration = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Funciones de acciones
  const handleViewDocument = (doc: VehicleDocument) => {
    setSelectedDocument(doc);
    setShowViewDialog(true);
  };

  const handleDownloadDocument = (doc: VehicleDocument) => {
    // Simulación de descarga
    if (doc.fileUrl) {
      window.open(doc.fileUrl, '_blank');
    } else {
      // Generar un PDF profesional usando HTML
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Documento Vehicular</title>
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 40px;
              background: #ffffff;
              color: #1e293b;
            }
            .header {
              border-bottom: 4px solid #3b82f6;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 5px;
            }
            .subtitle {
              color: #64748b;
              font-size: 14px;
            }
            .document-title {
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
              margin: 30px 0 20px 0;
            }
            .info-section {
              background: #f8fafc;
              border-left: 4px solid #3b82f6;
              padding: 20px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .info-row {
              display: flex;
              margin: 12px 0;
              padding: 8px 0;
              border-bottom: 1px solid #e2e8f0;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .label {
              font-weight: 600;
              color: #475569;
              min-width: 180px;
              font-size: 14px;
            }
            .value {
              color: #0f172a;
              font-size: 14px;
              flex: 1;
            }
            .status-badge {
              display: inline-block;
              padding: 6px 16px;
              border-radius: 20px;
              font-weight: 600;
              font-size: 13px;
            }
            .status-valid {
              background: #dcfce7;
              color: #166534;
            }
            .status-expiring {
              background: #fef3c7;
              color: #92400e;
            }
            .status-expired {
              background: #fee2e2;
              color: #991b1b;
            }
            .status-pending {
              background: #f1f5f9;
              color: #475569;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #94a3b8;
              font-size: 12px;
            }
            .date-generated {
              margin-top: 10px;
              font-size: 11px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">TMS NAVITEL</div>
            <div class="subtitle">Sistema de Gestión de Transporte</div>
          </div>

          <div class="document-title">Certificado de Documento Vehicular</div>

          <div class="info-section">
            <div class="info-row">
              <div class="label">Vehículo:</div>
              <div class="value"><strong>${doc.vehiclePlate}</strong></div>
            </div>
            <div class="info-row">
              <div class="label">Tipo de Documento:</div>
              <div class="value"><strong>${documentTypes[doc.documentType].label}</strong></div>
            </div>
            <div class="info-row">
              <div class="label">Número de Documento:</div>
              <div class="value"><strong>${doc.documentNumber}</strong></div>
            </div>
            <div class="info-row">
              <div class="label">Emisor:</div>
              <div class="value">${doc.issuer}</div>
            </div>
            <div class="info-row">
              <div class="label">Fecha de Emisión:</div>
              <div class="value">${new Date(doc.issueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <div class="info-row">
              <div class="label">Fecha de Vencimiento:</div>
              <div class="value">${new Date(doc.expirationDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
            </div>
            <div class="info-row">
              <div class="label">Días Restantes:</div>
              <div class="value">${getDaysUntilExpiration(doc.expirationDate) > 0 ? getDaysUntilExpiration(doc.expirationDate) + ' días' : 'Vencido'}</div>
            </div>
            <div class="info-row">
              <div class="label">Estado:</div>
              <div class="value">
                <span class="status-badge status-${doc.status === 'valid' ? 'valid' : doc.status === 'expiring_soon' ? 'expiring' : doc.status === 'expired' ? 'expired' : 'pending'}">
                  ${statusConfig[doc.status].label}
                </span>
              </div>
            </div>
            ${doc.notes ? `
            <div class="info-row">
              <div class="label">Notas:</div>
              <div class="value">${doc.notes}</div>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>TMS NAVITEL</strong> - Sistema de Gestión de Transporte y Mantenimiento</p>
            <p class="date-generated">Documento generado el ${new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </body>
        </html>
      `;

      // Crear blob HTML y descargarlo como PDF (el navegador puede imprimirlo como PDF)
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Abrir en nueva ventana para que el usuario pueda imprimirlo como PDF
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(url);
          }, 250);
        };
      }
    }
  };

  const handleEditDocument = (doc: VehicleDocument) => {
    setEditFormData({ ...doc });
    setShowEditDialog(true);
  };

  const handleSaveEdit = () => {
    if (editFormData) {
      // Aquí actualizarías el documento en el backend
      const updatedDocs = documents.map(doc => 
        doc.id === editFormData.id ? editFormData : doc
      );
      setDocuments(updatedDocs);
      setShowEditDialog(false);
      showToast('Documento actualizado exitosamente', 'success');
    }
  };

  const handleImport = () => {
    setShowImportDialog(true);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Aquí procesarías el archivo CSV/Excel
      console.log('Importando archivo:', file.name);
      setShowImportDialog(false);
      showToast(`Archivo ${file.name} importado correctamente`, 'success');
    }
  };

  const handleExport = () => {
    // Exportar documentos a CSV
    const csvContent = [
      ['Vehículo', 'Tipo', 'N° Documento', 'Emisor', 'Fecha Emisión', 'Vencimiento', 'Estado'].join(','),
      ...filteredDocuments.map(doc => [
        doc.vehiclePlate,
        documentTypes[doc.documentType].label,
        doc.documentNumber,
        doc.issuer,
        doc.issueDate,
        doc.expirationDate,
        statusConfig[doc.status].label
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentos_vehiculares_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleNewDocument = () => {
    setShowNewDocumentDialog(true);
  };

  // Estadísticas
  const stats = {
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring_soon').length,
    expired: documents.filter((d) => d.status === 'expired').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/maintenance">
            <Button variant="ghost" size="sm" className="mb-2">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            Documentos Vehiculares
          </h1>
          <p className="text-slate-500 mt-1">
            Gestión de certificados, permisos y documentación legal
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alerts.length > 0 && (
            <Button 
              variant="outline" 
              size="lg" 
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 relative"
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
            >
              <AlertTriangle className="h-5 w-5" />
              Alertas
              <Badge className="bg-orange-600 text-white ml-1">{alerts.length}</Badge>
            </Button>
          )}
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2"
            onClick={handleImport}
          >
            <Upload className="h-5 w-5" />
            Importar
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="gap-2"
            onClick={handleExport}
          >
            <Download className="h-5 w-5" />
            Exportar
          </Button>
          <Button 
            size="lg" 
            className="gap-2"
            onClick={handleNewDocument}
          >
            <Plus className="h-5 w-5" />
            Nuevo Documento
          </Button>
        </div>
      </div>

      {/* Panel de Alertas Detalladas */}
      {showAlertsPanel && alerts.length > 0 && (
        <Card className="border-orange-300 bg-gradient-to-r from-orange-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-orange-900">
                <AlertTriangle className="h-5 w-5" />
                Sistema de Alertas Activo
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowAlertsPanel(false)}>
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-900">Alertas por Fecha</span>
                </div>
                <p className="text-2xl font-bold text-red-700">
                  {alerts.filter(a => a.type === 'date').length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">Alertas por Horas</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  {alerts.filter(a => a.type === 'hours').length}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">Alertas por Km</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {alerts.filter(a => a.type === 'km').length}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              {alerts.map((alert) => {
                const Icon = alert.type === 'date' ? Calendar : alert.type === 'hours' ? Clock : Gauge;
                const bgColor = alert.severity === 'critical' 
                  ? 'bg-red-50 border-red-300 text-red-900' 
                  : 'bg-yellow-50 border-yellow-300 text-yellow-900';
                
                return (
                  <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border-2 ${bgColor}`}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{alert.message}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {alert.type === 'date' && `${Math.abs(alert.daysRemaining || 0)} días ${(alert.daysRemaining || 0) < 0 ? 'vencido' : 'restantes'}`}
                        {alert.type === 'hours' && `${Math.abs(alert.hoursRemaining || 0)} horas ${(alert.hoursRemaining || 0) < 0 ? 'excedidas' : 'restantes'}`}
                        {alert.type === 'km' && `${Math.abs(alert.kmRemaining || 0).toLocaleString()} km ${(alert.kmRemaining || 0) < 0 ? 'excedidos' : 'restantes'}`}
                      </p>
                    </div>
                    <Badge variant="secondary" className={alert.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-yellow-600 text-white'}>
                      {alert.severity === 'critical' ? 'CRÍTICO' : 'ADVERTENCIA'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alertas de Vencimiento */}
      {stats.expired > 0 && showExpiredAlert && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900">
                    {stats.expired} Documento{stats.expired > 1 ? 's' : ''} Vencido{stats.expired > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-red-700">Requiere renovación inmediata</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExpiredAlert(false)}
                className="h-8 w-8 p-0 hover:bg-red-100 rounded-full"
                title="Cerrar alerta"
              >
                <X className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stats.expiring > 0 && showExpiringAlert && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-yellow-600" />
                <div>
                  <h3 className="font-semibold text-yellow-900">
                    {stats.expiring} Documento{stats.expiring > 1 ? 's' : ''} por Vencer
                  </h3>
                  <p className="text-sm text-yellow-700">Vencen en los próximos 30 días</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExpiringAlert(false)}
                className="h-8 w-8 p-0 hover:bg-yellow-100 rounded-full"
                title="Cerrar alerta"
              >
                <X className="h-4 w-4 text-yellow-600" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">Total</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Vigentes</p>
                <p className="text-3xl font-bold text-green-700">{stats.valid}</p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 font-medium">Por Vencer</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.expiring}</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Vencidos</p>
                <p className="text-3xl font-bold text-red-700">{stats.expired}</p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  placeholder="Buscar por placa, número o tipo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="valid">Vigentes</SelectItem>
                <SelectItem value="expiring_soon">Por vencer</SelectItem>
                <SelectItem value="expired">Vencidos</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {Object.entries(documentTypes).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Documentos ({filteredDocuments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Tipo de Documento</TableHead>
                <TableHead>N° Documento</TableHead>
                <TableHead>Emisor</TableHead>
                <TableHead>Fecha Emisión</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                    No se encontraron documentos
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const Icon = documentTypes[doc.documentType].icon;
                  const StatusIcon = statusConfig[doc.status].icon;
                  const daysUntilExpiration = getDaysUntilExpiration(doc.expirationDate);

                  return (
                    <TableRow key={doc.id} className="hover:bg-slate-50">
                      <TableCell>
                        <div className="font-semibold text-slate-900">{doc.vehiclePlate}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${documentTypes[doc.documentType].color}`} />
                          <span className="font-medium">{documentTypes[doc.documentType].label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{doc.documentNumber}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">{doc.issuer}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="h-4 w-4" />
                          {new Date(doc.issueDate).toLocaleDateString('es-PE')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                            <Calendar className="h-4 w-4" />
                            {new Date(doc.expirationDate).toLocaleDateString('es-PE')}
                          </div>
                          {doc.status !== 'expired' && (
                            <p className="text-xs text-slate-500 mt-1">
                              {daysUntilExpiration > 0
                                ? `${daysUntilExpiration} días restantes`
                                : 'Vencido'}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${statusConfig[doc.status].color} flex items-center gap-1 w-fit`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusConfig[doc.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleDownloadDocument(doc)}
                            title="Descargar documento"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditDocument(doc)}
                            title="Editar documento"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Importación */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowImportDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Upload className="h-6 w-6 text-primary" />
                  Importar Documentos
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowImportDialog(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-sm text-slate-600 space-y-2">
                <p>Selecciona un archivo CSV o Excel con la siguiente estructura:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500">
                  <li>Placa del vehículo</li>
                  <li>Tipo de documento</li>
                  <li>Número de documento</li>
                  <li>Emisor</li>
                  <li>Fecha de emisión</li>
                  <li>Fecha de vencimiento</li>
                </ul>
              </div>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <label className="cursor-pointer">
                  <span className="text-primary font-semibold hover:underline">Click para seleccionar archivo</span>
                  <span className="text-slate-500"> o arrastra aquí</span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleImportFile}
                  />
                </label>
                <p className="text-xs text-slate-400 mt-2">Formatos: CSV, Excel</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nuevo Documento */}
      {showNewDocumentDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewDocumentDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Plus className="h-6 w-6 text-primary" />
                  Nuevo Documento Vehicular
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNewDocumentDialog(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Vehículo *</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar vehículo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ABC-123">ABC-123</SelectItem>
                      <SelectItem value="XYZ-789">XYZ-789</SelectItem>
                      <SelectItem value="DEF-456">DEF-456</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Tipo de Documento *</label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypes).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Número de Documento *</label>
                <Input placeholder="Ej: SOAT-2024-001234" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Emisor *</label>
                <Input placeholder="Ej: Pacífico Seguros" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Fecha de Emisión *</label>
                  <Input type="date" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Fecha de Vencimiento *</label>
                  <Input type="date" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Archivo (Opcional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-primary font-semibold hover:underline">Subir archivo</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Notas (Opcional)</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                  rows={3}
                  placeholder="Información adicional sobre el documento..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowNewDocumentDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => {
                setShowNewDocumentDialog(false);
                showToast('Documento creado exitosamente', 'success');
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Documento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición */}
      {showEditDialog && editFormData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Edit className="h-6 w-6 text-primary" />
                  Editar Documento: {editFormData.documentNumber}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowEditDialog(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Vehículo *</label>
                  <Input 
                    value={editFormData.vehiclePlate}
                    onChange={(e) => setEditFormData({ ...editFormData, vehiclePlate: e.target.value })}
                    disabled
                    className="bg-slate-50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Tipo de Documento *</label>
                  <Select 
                    value={editFormData.documentType}
                    onValueChange={(value) => setEditFormData({ ...editFormData, documentType: value as keyof typeof documentTypes })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypes).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Número de Documento *</label>
                <Input 
                  value={editFormData.documentNumber}
                  onChange={(e) => setEditFormData({ ...editFormData, documentNumber: e.target.value })}
                  placeholder="Ej: SOAT-2024-001234" 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Emisor *</label>
                <Input 
                  value={editFormData.issuer}
                  onChange={(e) => setEditFormData({ ...editFormData, issuer: e.target.value })}
                  placeholder="Ej: Pacífico Seguros" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Fecha de Emisión *</label>
                  <Input 
                    type="date" 
                    value={editFormData.issueDate}
                    onChange={(e) => setEditFormData({ ...editFormData, issueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">Fecha de Vencimiento *</label>
                  <Input 
                    type="date" 
                    value={editFormData.expirationDate}
                    onChange={(e) => setEditFormData({ ...editFormData, expirationDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Estado</label>
                <Select 
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value as keyof typeof statusConfig })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusConfig).map(([key, value]) => (
                      <SelectItem key={key} value={key}>
                        {value.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Archivo (Opcional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <label className="cursor-pointer">
                    <span className="text-primary font-semibold hover:underline">Actualizar archivo</span>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                  </label>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (máx. 5MB)</p>
                  {editFormData.fileUrl && (
                    <p className="text-xs text-green-600 mt-2">✓ Archivo existente</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">Notas (Opcional)</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg p-3 text-sm"
                  rows={3}
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Información adicional sobre el documento..."
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Visualización */}
      {showViewDialog && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowViewDialog(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  Detalles del Documento
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowViewDialog(false)}
                  className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                  title="Cerrar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Vehículo */}
              <div>
                <label className="text-sm font-medium text-slate-500">Vehículo</label>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedDocument.vehiclePlate}</p>
              </div>

              {/* Tipo de Documento */}
              <div>
                <label className="text-sm font-medium text-slate-500">Tipo de Documento</label>
                <div className="flex items-center gap-2 mt-1">
                  {(() => {
                    const Icon = documentTypes[selectedDocument.documentType].icon;
                    return (
                      <>
                        <Icon className={`h-5 w-5 ${documentTypes[selectedDocument.documentType].color}`} />
                        <span className="text-lg font-semibold text-slate-900">
                          {documentTypes[selectedDocument.documentType].label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Número de Documento */}
              <div>
                <label className="text-sm font-medium text-slate-500">Número de Documento</label>
                <p className="text-lg font-mono font-semibold text-slate-900 mt-1">{selectedDocument.documentNumber}</p>
              </div>

              {/* Emisor */}
              <div>
                <label className="text-sm font-medium text-slate-500">Emisor</label>
                <p className="text-lg text-slate-900 mt-1">{selectedDocument.issuer}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Fecha de Emisión */}
                <div>
                  <label className="text-sm font-medium text-slate-500">Fecha de Emisión</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-base text-slate-900">
                      {new Date(selectedDocument.issueDate).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* Fecha de Vencimiento */}
                <div>
                  <label className="text-sm font-medium text-slate-500">Fecha de Vencimiento</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <p className="text-base text-slate-900 font-semibold">
                      {new Date(selectedDocument.expirationDate).toLocaleDateString('es-PE', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {getDaysUntilExpiration(selectedDocument.expirationDate) > 0
                      ? `${getDaysUntilExpiration(selectedDocument.expirationDate)} días restantes`
                      : 'Vencido'}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div>
                <label className="text-sm font-medium text-slate-500">Estado</label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={`${statusConfig[selectedDocument.status].color} flex items-center gap-1 w-fit text-base px-3 py-1`}
                  >
                    {(() => {
                      const StatusIcon = statusConfig[selectedDocument.status].icon;
                      return <StatusIcon className="h-4 w-4" />;
                    })()}
                    {statusConfig[selectedDocument.status].label}
                  </Badge>
                </div>
              </div>

              {/* Notas */}
              {selectedDocument.notes && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Notas</label>
                  <p className="text-base text-slate-700 mt-1 bg-slate-50 p-3 rounded-lg">{selectedDocument.notes}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                Cerrar
              </Button>
              <Button variant="outline" onClick={() => handleDownloadDocument(selectedDocument)}>
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
              <Button onClick={() => {
                setShowViewDialog(false);
                handleEditDocument(selectedDocument);
              }}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Notificaciones */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border-2 min-w-[300px] ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-500 text-green-900'
                : toast.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-900'
                : 'bg-blue-50 border-blue-500 text-blue-900'
            }`}
          >
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              )}
              {toast.type === 'error' && (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
              {toast.type === 'info' && (
                <AlertCircle className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{toast.message}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setToast(null)}
              className="flex-shrink-0 h-6 w-6 p-0 hover:bg-white/50"
            >
              ✕
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
