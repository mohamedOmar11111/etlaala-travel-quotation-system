/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { useState, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Hotel, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  Download, 
  Save, 
  Trash2, 
  AlertTriangle,
  CheckCircle2,
  Plus,
  MapPin,
  Users,
  Image,
  Pencil,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define the Quotation type
interface Quotation {
  id: string;
  bookingNumber: string;
  clientName: string;
  hotelName: string;
  hotelAddress: string;
  hotelImageUrl: string;
  companyLogoUrl: string;
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  costPerNight: number;
  markup: number;
  totalRevenue: number;
  margin: number;
  nights: number;
  createdAt: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-red-100 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-black text-slate-800">Something went wrong</h1>
            <p className="text-slate-500 text-sm">
              The application encountered an error. Please try refreshing the page.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <pre className="text-[10px] text-red-400 bg-red-50 p-4 rounded-xl overflow-auto max-h-32 text-left">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [startTime] = useState(Date.now());
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    bookingNumber: '',
    clientName: '',
    hotelName: '',
    hotelAddress: '',
    hotelImageUrl: '',
    companyLogoUrl: '',
    city: '',
    checkIn: '',
    checkOut: '',
    rooms: 1,
    adults: 2,
    children: 0,
    costPerNight: 0,
    markup: 10
  });

  // Load saved quotations and logo from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('etlaala_quotations');
    if (saved) {
      try {
        setQuotations(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved quotations", e);
      }
    }
    
    const savedLogo = localStorage.getItem('etlaala_company_logo');
    if (savedLogo) {
      setFormData(prev => ({ ...prev, companyLogoUrl: savedLogo }));
    }
  }, []);

  // Save quotations to localStorage
  useEffect(() => {
    localStorage.setItem('etlaala_quotations', JSON.stringify(quotations));
  }, [quotations]);

  // Save logo to localStorage
  useEffect(() => {
    if (formData.companyLogoUrl) {
      localStorage.setItem('etlaala_company_logo', formData.companyLogoUrl);
    }
  }, [formData.companyLogoUrl]);

  // Derived State (Calculations)
  const calculations = useMemo(() => {
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const nights = isNaN(diffTime) || diffTime <= 0 ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const sellingPricePerNight = formData.costPerNight * (1 + formData.markup / 100);
    const totalCost = formData.costPerNight * nights * formData.rooms;
    const totalRevenue = sellingPricePerNight * nights * formData.rooms;
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return { nights, totalRevenue, margin, totalCost, profit };
  }, [formData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, hotelImageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSaveQuotation = () => {
    if (!formData.clientName || !formData.hotelName || !formData.checkIn || !formData.checkOut) {
      setErrorMsg("Please fill in all required fields.");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    const bookingNumber = formData.bookingNumber || `ETL-${Math.floor(100000 + Math.random() * 900000)}`;

    if (editingId) {
      setQuotations(quotations.map(q => q.id === editingId ? {
        ...formData,
        id: editingId,
        bookingNumber,
        totalRevenue: calculations.totalRevenue,
        margin: calculations.margin,
        nights: calculations.nights,
        createdAt: q.createdAt // Keep original creation date
      } : q));
      setEditingId(null);
    } else {
      const newQuote: Quotation = {
        ...formData,
        id: Math.random().toString(36).substr(2, 9),
        bookingNumber,
        totalRevenue: calculations.totalRevenue,
        margin: calculations.margin,
        nights: calculations.nights,
        createdAt: Date.now()
      };
      setQuotations([newQuote, ...quotations]);
    }

    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    // Reset form after saving
    setFormData(prev => ({
      ...prev,
      bookingNumber: '',
      clientName: '',
      hotelName: '',
      hotelAddress: '',
      hotelImageUrl: '',
      city: '',
      checkIn: '',
      checkOut: '',
      rooms: 1,
      adults: 2,
      children: 0,
      costPerNight: 0,
      markup: 10
    }));
  };

  const editQuotation = (quote: Quotation) => {
    setFormData({
      bookingNumber: quote.bookingNumber,
      clientName: quote.clientName,
      hotelName: quote.hotelName,
      hotelAddress: quote.hotelAddress,
      hotelImageUrl: quote.hotelImageUrl,
      companyLogoUrl: quote.companyLogoUrl,
      city: quote.city,
      checkIn: quote.checkIn,
      checkOut: quote.checkOut,
      rooms: quote.rooms,
      adults: quote.adults,
      children: quote.children,
      costPerNight: quote.costPerNight,
      markup: quote.markup
    });
    setEditingId(quote.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteQuotation = (id: string) => {
    setQuotations(quotations.filter(q => q.id !== id));
  };

  const handleExportPDF = async (quote: Quotation | null = null) => {
    try {
      // If quote is provided, use its data and recalculate nights
      let exportNights = 0;
      if (quote) {
        const checkInDate = new Date(quote.checkIn);
        const checkOutDate = new Date(quote.checkOut);
        const diffTime = checkOutDate.getTime() - checkInDate.getTime();
        exportNights = isNaN(diffTime) || diffTime <= 0 ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      const data = quote || { 
        ...formData, 
        ...calculations, 
        bookingNumber: formData.bookingNumber || `ETL-${Math.floor(100000 + Math.random() * 900000)}` 
      };

      const nightsCount = quote ? exportNights : calculations.nights;
      
      if (!data.clientName || !data.hotelName) {
        setErrorMsg("Please fill in Client Name and Hotel Name before exporting.");
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }

      const doc = new jsPDF();
      
      // Brand Colors
      const brandBlue: [number, number, number] = [37, 99, 235]; // #2563eb
      const brandOrange: [number, number, number] = [249, 115, 22]; // #f97316
      const slate800: [number, number, number] = [30, 41, 59];
      const slate500: [number, number, number] = [100, 116, 139];
      const slate200: [number, number, number] = [226, 232, 240];

      // Header Background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 60, 'F');
      doc.setDrawColor(...slate200);
      doc.line(0, 60, 210, 60);

      // Logo Section
      const getFormat = (url: string) => {
        if (url.startsWith('data:image/png')) return 'PNG';
        if (url.startsWith('data:image/jpeg') || url.startsWith('data:image/jpg')) return 'JPEG';
        if (url.startsWith('data:image/webp')) return 'WEBP';
        return 'PNG';
      };

      if (data.companyLogoUrl) {
        try {
          const format = getFormat(data.companyLogoUrl);
          doc.addImage(data.companyLogoUrl, format, 15, 10, 45, 25);
        } catch (e) {
          // Fallback if image fails
          doc.setDrawColor(...brandBlue);
          doc.setLineWidth(1.5);
          doc.circle(20, 22, 10, 'S');
          doc.setFontSize(14);
          doc.setTextColor(...brandBlue);
          doc.setFont("helvetica", "bold");
          doc.text("e", 20, 24, { align: "center" });
          doc.setFontSize(24);
          doc.text("etlaala", 35, 25);
          doc.setFontSize(10);
          doc.setTextColor(...brandOrange);
          doc.text("Travel & Tourism", 35, 31);
        }
      } else {
        // Default Logo Placeholder
        doc.setDrawColor(...brandBlue);
        doc.setLineWidth(1.5);
        doc.circle(20, 22, 10, 'S');
        doc.setFontSize(14);
        doc.setTextColor(...brandBlue);
        doc.setFont("helvetica", "bold");
        doc.text("e", 20, 24, { align: "center" });
        doc.setFontSize(24);
        doc.text("etlaala", 35, 25);
        doc.setFontSize(10);
        doc.setTextColor(...brandOrange);
        doc.text("Travel & Tourism", 35, 31);
      }

      // Voucher Title
      doc.setFontSize(20);
      doc.setTextColor(...slate800);
      doc.setFont("helvetica", "bold");
      doc.text("BOOKING VOUCHER", 190, 28, { align: "right" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...slate500);
      doc.text("Official Confirmation Document", 190, 34, { align: "right" });

      // Confirmation Bar
      doc.setFillColor(...brandBlue);
      doc.rect(20, 45, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`CONFIRMATION: ${data.bookingNumber}`, 25, 51.5);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 185, 51.5, { align: "right" });

      // Two Column Layout for Info
      let currentY = 75;

      // Column 1: Guest Info
      doc.setTextColor(...brandBlue);
      doc.setFontSize(12);
      doc.text("GUEST DETAILS", 20, currentY);
      doc.setDrawColor(...brandBlue);
      doc.setLineWidth(0.5);
      doc.line(20, currentY + 2, 90, currentY + 2);

      doc.setTextColor(...slate800);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Primary Guest:", 20, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.text(data.clientName, 50, currentY + 10);

      doc.setFont("helvetica", "bold");
      doc.text("City:", 20, currentY + 16);
      doc.setFont("helvetica", "normal");
      doc.text(data.city || 'N/A', 50, currentY + 16);

      doc.setFont("helvetica", "bold");
      doc.text("Occupancy:", 20, currentY + 22);
      doc.setFont("helvetica", "normal");
      doc.text(`${data.adults} Adults, ${data.children} Children`, 50, currentY + 22);

      // Column 2: Stay Info
      doc.setTextColor(...brandBlue);
      doc.setFontSize(12);
      doc.text("STAY DETAILS", 110, currentY);
      doc.line(110, currentY + 2, 190, currentY + 2);

      doc.setTextColor(...slate800);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Check-in:", 110, currentY + 10);
      doc.setFont("helvetica", "normal");
      doc.text(data.checkIn || 'N/A', 140, currentY + 10);

      doc.setFont("helvetica", "bold");
      doc.text("Check-out:", 110, currentY + 16);
      doc.setFont("helvetica", "normal");
      doc.text(data.checkOut || 'N/A', 140, currentY + 16);

      doc.setFont("helvetica", "bold");
      doc.text("Duration:", 110, currentY + 22);
      doc.setFont("helvetica", "normal");
      doc.text(`${nightsCount || 0} Nights, ${data.rooms} Room(s)`, 140, currentY + 22);

      // Hotel Section
      currentY = 115;
      doc.setTextColor(...brandBlue);
      doc.setFontSize(12);
      doc.text("ACCOMMODATION", 20, currentY);
      doc.line(20, currentY + 2, 190, currentY + 2);

      if (data.hotelImageUrl) {
        try {
          doc.addImage(data.hotelImageUrl, 'JPEG', 20, currentY + 8, 60, 40);
          
          doc.setTextColor(...slate800);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(data.hotelName, 85, currentY + 15);
          
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...slate500);
          doc.text(data.hotelAddress || "Address not provided", 85, currentY + 22, { maxWidth: 105 });
        } catch (e) {
          doc.setTextColor(...slate800);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.text(data.hotelName, 20, currentY + 15);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(data.hotelAddress || "Address not provided", 20, currentY + 22, { maxWidth: 170 });
        }
      } else {
        doc.setTextColor(...slate800);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(data.hotelName, 20, currentY + 15);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(data.hotelAddress || "Address not provided", 20, currentY + 22, { maxWidth: 170 });
      }

      // Financial Summary Table
      const nights = quote ? exportNights : calculations.nights;
      const rooms = data.rooms || 1;
      const rate = data.totalRevenue / (nights * rooms || 1);

      autoTable(doc, {
        startY: currentY + 55,
        head: [['Description', 'Quantity', 'Rate', 'Total Amount']],
        body: [
          [
            'Hotel Accommodation', 
            `${rooms} Room(s) x ${nights} Night(s)`, 
            `${rate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SAR`, 
            `${data.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} SAR`
          ],
        ],
        headStyles: { fillColor: brandBlue, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center' },
          2: { halign: 'right' },
          3: { halign: 'right', fontStyle: 'bold' }
        },
        bodyStyles: { fontSize: 10 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 20, right: 20 }
      });

      // Total Bar
      const tableFinalY = (doc as any).lastAutoTable.finalY || 180;
      doc.setFillColor(...slate800);
      doc.rect(120, tableFinalY + 5, 70, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("TOTAL:", 125, tableFinalY + 13);
      doc.text(`${data.totalRevenue.toLocaleString()} SAR`, 185, tableFinalY + 13, { align: "right" });

      // Policy Section
      doc.setTextColor(...brandOrange);
      doc.setFontSize(12);
      doc.text("IMPORTANT INFORMATION", 20, tableFinalY + 30);
      doc.setDrawColor(...brandOrange);
      doc.line(20, tableFinalY + 32, 190, tableFinalY + 32);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text("CANCELLATION POLICY:", 20, tableFinalY + 40);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...slate800);
      const policyText = "This booking is strictly NON-CANCELLABLE and NON-MODIFIABLE. Once confirmed, no refunds or changes will be permitted under any circumstances. Failure to arrive at your hotel will be treated as a No-Show and no refund will be given.";
      doc.text(policyText, 20, tableFinalY + 45, { maxWidth: 170 });
      
      doc.setTextColor(...brandBlue);
      doc.setFont("helvetica", "bold");
      doc.text("Terms & Conditions:", 20, tableFinalY + 58);
      doc.setFont("helvetica", "normal");
      doc.text("https://etlaala.com/terms-and-conditions/", 55, tableFinalY + 58);

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFillColor(...slate800);
      doc.rect(0, pageHeight - 25, 210, 25, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.text("ETLAALA TRAVEL & TOURISM", 105, pageHeight - 15, { align: "center" });
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text("Makkah, Saudi Arabia | contact@etlaala.com | www.etlaala.com", 105, pageHeight - 10, { align: "center" });

      doc.save(`Voucher_${data.bookingNumber}_${data.clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error("PDF Generation Error:", error);
      setErrorMsg("Failed to generate PDF. Please check the console for details.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  const handleExportHTML = (quote: Quotation | null = null) => {
    try {
      const data = quote || { 
        ...formData, 
        ...calculations, 
        bookingNumber: formData.bookingNumber || `ETL-${Math.floor(100000 + Math.random() * 900000)}` 
      };

      if (!data.clientName || !data.hotelName) {
        setErrorMsg("Please fill in Client Name and Hotel Name before exporting.");
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }

      const checkInDate = new Date(data.checkIn);
      const checkOutDate = new Date(data.checkOut);
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const nightsCount = isNaN(diffTime) || diffTime <= 0 ? 0 : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const totalRevenue = data.totalRevenue || 0;

      const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Voucher - ${data.bookingNumber}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; }
        @media print {
            .no-print { display: none; }
            body { background: white; }
        }
    </style>
</head>
<body class="bg-slate-50 p-4 md:p-12">
    <div class="max-w-4xl mx-auto bg-white shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-100">
        <!-- Header -->
        <div class="bg-slate-50 p-8 md:p-12 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
            <div class="flex items-center gap-4">
                ${data.companyLogoUrl ? `<img src="${data.companyLogoUrl}" class="h-16 w-auto" alt="Logo">` : `
                <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <span class="text-white text-3xl font-black italic transform -skew-x-12">e</span>
                </div>
                <div class="space-y-0">
                    <h1 class="text-2xl font-black text-slate-800">etlaala <span class="text-blue-600">Travel</span></h1>
                    <p class="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Premium Quality</p>
                </div>
                `}
            </div>
            <div class="text-center md:text-right">
                <h2 class="text-2xl font-black text-slate-800 tracking-tight">BOOKING VOUCHER</h2>
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Official Confirmation Document</p>
            </div>
        </div>

        <!-- Confirmation Bar -->
        <div class="bg-blue-600 px-8 py-3 flex justify-between items-center text-white">
            <span class="font-bold">CONFIRMATION: ${data.bookingNumber}</span>
            <span class="text-sm font-medium">DATE: ${new Date().toLocaleDateString()}</span>
        </div>

        <!-- Details Grid -->
        <div class="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
            <!-- Guest Details -->
            <div class="space-y-6">
                <div class="border-b-2 border-blue-600 pb-2">
                    <h3 class="text-blue-600 font-bold uppercase tracking-widest text-sm">Guest Details</h3>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">Primary Guest</span>
                        <span class="text-slate-800 font-bold">${data.clientName}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">City</span>
                        <span class="text-slate-800 font-bold">${data.city || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">Occupancy</span>
                        <span class="text-slate-800 font-bold">${data.adults} Adults, ${data.children} Children</span>
                    </div>
                </div>
            </div>

            <!-- Stay Details -->
            <div class="space-y-6">
                <div class="border-b-2 border-blue-600 pb-2">
                    <h3 class="text-blue-600 font-bold uppercase tracking-widest text-sm">Stay Details</h3>
                </div>
                <div class="space-y-4">
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">Check-in</span>
                        <span class="text-slate-800 font-bold">${data.checkIn || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">Check-out</span>
                        <span class="text-slate-800 font-bold">${data.checkOut || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-slate-400 font-bold text-xs uppercase">Duration</span>
                        <span class="text-slate-800 font-bold">${nightsCount} Nights, ${data.rooms} Room(s)</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Accommodation -->
        <div class="px-8 md:px-12 pb-12 space-y-6">
            <div class="border-b-2 border-blue-600 pb-2">
                <h3 class="text-blue-600 font-bold uppercase tracking-widest text-sm">Accommodation</h3>
            </div>
            <div class="flex flex-col md:flex-row gap-8 items-center bg-slate-50 p-6 rounded-3xl">
                ${data.hotelImageUrl ? `<img src="${data.hotelImageUrl}" class="w-full md:w-64 h-40 object-cover rounded-2xl shadow-lg">` : ''}
                <div class="space-y-2 text-center md:text-left">
                    <h4 class="text-2xl font-black text-slate-800">${data.hotelName}</h4>
                    <p class="text-slate-500 text-sm leading-relaxed">${data.hotelAddress || 'Address not provided'}</p>
                </div>
            </div>
        </div>

        <!-- Financial Summary -->
        <div class="px-8 md:px-12 pb-12">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-blue-600 text-white">
                        <th class="p-4 rounded-tl-2xl font-bold uppercase text-xs">Description</th>
                        <th class="p-4 font-bold uppercase text-xs text-center">Quantity</th>
                        <th class="p-4 font-bold uppercase text-xs text-right">Rate</th>
                        <th class="p-4 rounded-tr-2xl font-bold uppercase text-xs text-right">Total Amount</th>
                    </tr>
                </thead>
                <tbody class="text-slate-700">
                    <tr class="border-b border-slate-100">
                        <td class="p-4 font-medium">Hotel Accommodation</td>
                        <td class="p-4 text-center">${data.rooms} Room(s) x ${nightsCount} Night(s)</td>
                        <td class="p-4 text-right">${(totalRevenue / (nightsCount * data.rooms || 1)).toLocaleString(undefined, {minimumFractionDigits: 2})} SAR</td>
                        <td class="p-4 text-right font-black">${totalRevenue.toLocaleString()} SAR</td>
                    </tr>
                </tbody>
            </table>
            <div class="flex justify-end mt-4">
                <div class="bg-slate-800 text-white px-8 py-4 rounded-2xl flex items-center gap-8 shadow-xl">
                    <span class="font-bold uppercase tracking-widest text-xs">Total Amount</span>
                    <span class="text-2xl font-black">${totalRevenue.toLocaleString()} SAR</span>
                </div>
            </div>
        </div>

        <!-- Important Info -->
        <div class="px-8 md:px-12 pb-12 space-y-4">
            <div class="border-b-2 border-orange-500 pb-2">
                <h3 class="text-orange-500 font-bold uppercase tracking-widest text-sm">Important Information</h3>
            </div>
            <div class="space-y-4">
                <div>
                    <h4 class="text-red-600 font-black text-xs uppercase mb-1">Cancellation Policy</h4>
                    <p class="text-slate-600 text-xs leading-relaxed">This booking is strictly NON-CANCELLABLE and NON-MODIFIABLE. Once confirmed, no refunds or changes will be permitted under any circumstances. Failure to arrive at your hotel will be treated as a No-Show and no refund will be given.</p>
                </div>
                <div>
                    <h4 class="text-blue-600 font-black text-xs uppercase mb-1">Terms & Conditions</h4>
                    <p class="text-slate-600 text-xs">https://etlaala.com/terms-and-conditions/</p>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="bg-slate-800 p-8 text-center text-white space-y-2">
            <h5 class="font-black tracking-tight">ETLAALA TRAVEL & TOURISM</h5>
            <p class="text-[10px] text-slate-400 uppercase tracking-[0.2em]">Makkah, Saudi Arabia | contact@etlaala.com | www.etlaala.com</p>
        </div>
    </div>

    <!-- Print Button -->
    <div class="max-w-4xl mx-auto mt-8 flex justify-center no-print">
        <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5"/><rect width="12" height="8" x="6" y="14" rx="1"/></svg>
            Print This Voucher
        </button>
    </div>
</body>
</html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Voucher_${data.bookingNumber}_${data.clientName.replace(/\s+/g, '_')}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("HTML Generation Error:", error);
      setErrorMsg("Failed to generate HTML. Please check the console for details.");
      setTimeout(() => setErrorMsg(null), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50 rounded-full -mr-48 -mt-48 blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-50 rounded-full -ml-48 -mb-48 blur-3xl opacity-50 pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-8 relative">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-orange-500 to-blue-600" />
          <div className="flex items-center gap-6 relative">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-blue-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
              <div className="relative w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 overflow-hidden border border-slate-100">
                {formData.companyLogoUrl ? (
                  <img src={formData.companyLogoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <div className="w-full h-full bg-blue-600 flex items-center justify-center">
                    <div className="relative">
                      <div className="text-white font-black text-4xl italic transform -skew-x-12">e</div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-blue-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
                etlaala <span className="text-blue-600">Travel</span>
              </h1>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tourism & Services</span>
                <div className="h-1 w-1 bg-slate-300 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-500">Premium Quality</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Status</p>
              <div className="text-xs font-bold text-emerald-500 flex items-center justify-end gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Operational
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-50 bg-gradient-to-r from-blue-50/50 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Plus className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">New Booking Voucher</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Official Confirmation Document</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Voucher Mode</span>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" /> Company Logo
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer flex-1">
                        <div className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-500">
                          <Plus className="w-4 h-4" />
                          {formData.companyLogoUrl ? "Change Logo" : "Upload Company Logo"}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, companyLogoUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {formData.companyLogoUrl && (
                        <div className="relative group">
                          <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-white">
                            <img src={formData.companyLogoUrl} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                          </div>
                          <button 
                            onClick={() => {
                              setFormData({ ...formData, companyLogoUrl: "" });
                              localStorage.removeItem('etlaala_company_logo');
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Confirmation Number
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. ETL-123456"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.bookingNumber}
                      onChange={(e) => setFormData({...formData, bookingNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Client Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ahmed Salem"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.clientName}
                      onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5" /> Hotel Name
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Hilton Makkah"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.hotelName}
                      onChange={(e) => setFormData({...formData, hotelName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Hotel Address
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ibrahim Al Khalil St, Makkah 24231, Saudi Arabia"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.hotelAddress}
                      onChange={(e) => setFormData({...formData, hotelAddress: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Hotel className="w-3.5 h-3.5" /> Hotel Image
                    </label>
                    <div className="flex items-center gap-4">
                      <label className="cursor-pointer flex-1">
                        <div className="w-full px-4 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-500">
                          <Plus className="w-4 h-4" />
                          {formData.hotelImageUrl ? "Change Image" : "Upload Hotel Image"}
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleImageUpload}
                        />
                      </label>
                      {formData.hotelImageUrl && (
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                          <img src={formData.hotelImageUrl} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setFormData({...formData, hotelImageUrl: ''})}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> City
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. Makkah"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Occupancy & Quantity
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="Rooms"
                          className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center focus:border-blue-500 outline-none"
                          value={formData.rooms}
                          onChange={(e) => setFormData({...formData, rooms: parseInt(e.target.value) || 0})}
                        />
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase">Rooms</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="Adults"
                          className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center focus:border-blue-500 outline-none"
                          value={formData.adults}
                          onChange={(e) => setFormData({...formData, adults: parseInt(e.target.value) || 0})}
                        />
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase">Adults</span>
                      </div>
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="Kids"
                          className="w-full px-2 py-2 rounded-lg border border-slate-200 text-center focus:border-blue-500 outline-none"
                          value={formData.children}
                          onChange={(e) => setFormData({...formData, children: parseInt(e.target.value) || 0})}
                        />
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[8px] font-bold text-slate-400 uppercase">Kids</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dates & Costs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Check-in
                    </label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                      value={formData.checkIn}
                      onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Check-out
                    </label>
                    <input 
                      type="date" 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                      value={formData.checkOut}
                      onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" /> Cost / Night (SAR)
                    </label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-blue-500"
                      value={formData.costPerNight}
                      onChange={(e) => setFormData({...formData, costPerNight: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                {/* Markup & Margin */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-slate-800">Financial Summary</h3>
                      <p className="text-xs text-slate-500">Real-time margin calculation</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <label className="text-[10px] font-bold uppercase text-slate-400 block">Markup %</label>
                        <input 
                          type="number" 
                          className="w-20 text-right font-bold text-blue-600 bg-transparent border-b-2 border-blue-200 focus:border-blue-500 outline-none"
                          value={formData.markup}
                          onChange={(e) => setFormData({...formData, markup: parseFloat(e.target.value) || 0})}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Nights</span>
                      <span className="text-lg font-bold text-slate-700">{calculations.nights}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Cost</span>
                      <span className="text-lg font-bold text-slate-700">{calculations.totalCost.toLocaleString()} <span className="text-xs font-normal">SAR</span></span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Selling Price</span>
                      <span className="text-lg font-bold text-blue-600">{calculations.totalRevenue.toLocaleString()} <span className="text-xs font-normal">SAR</span></span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Margin</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-blue-600">
                          {calculations.margin.toFixed(1)}%
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-4 pt-4 relative">
                  <AnimatePresence>
                    {errorMsg && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -top-12 left-0 right-0 flex justify-center"
                      >
                        <div className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> {errorMsg}
                        </div>
                      </motion.div>
                    )}
                    {showSuccess && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute -top-12 left-0 right-0 flex justify-center"
                      >
                        <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Voucher Saved Successfully!
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    onClick={handleSaveQuotation}
                    className={`flex-1 font-semibold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${editingId ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white`}
                  >
                    <Save className="w-5 h-5" /> {editingId ? 'Update Voucher' : 'Save Quotation'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleExportPDF()}
                      className="px-4 bg-slate-800 text-white font-semibold py-3 rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg"
                      title="Export as PDF"
                    >
                      <Download className="w-5 h-5" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button 
                      onClick={() => handleExportHTML()}
                      className="px-4 bg-orange-500 text-white font-semibold py-3 rounded-xl hover:bg-orange-600 transition-all flex items-center gap-2 shadow-lg"
                      title="Export as HTML"
                    >
                      <FileText className="w-5 h-5" />
                      <span className="hidden sm:inline">HTML</span>
                    </button>
                  </div>
                  {editingId && (
                    <button 
                      onClick={() => {
                        setEditingId(null);
                        setFormData(prev => ({
                          ...prev,
                          bookingNumber: '',
                          clientName: '',
                          hotelName: '',
                          hotelAddress: '',
                          hotelImageUrl: '',
                          city: '',
                          checkIn: '',
                          checkOut: '',
                          rooms: 1,
                          adults: 2,
                          children: 0,
                          costPerNight: 0,
                          markup: 10
                        }));
                      }}
                      className="px-6 bg-white text-slate-700 font-semibold py-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <X className="w-5 h-5" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* History Section */}
          <aside className="space-y-6">
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden h-full flex flex-col">
              <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-3 text-slate-700">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  Voucher History
                </h2>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full">
                    {quotations.length}
                  </span>
                  {quotations.length > 0 && (
                    <button 
                      onClick={() => {
                        // Using a simple state-based confirmation would be better, 
                        // but for now we'll just clear it or add a double-click protection
                        setQuotations([]);
                      }}
                      onDoubleClick={() => setQuotations([])}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Double click to clear all history"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[700px] scrollbar-hide">
                {quotations.length === 0 ? (
                  <div className="text-center py-20 space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto border border-slate-100">
                      <FileText className="w-8 h-8 text-slate-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-400">No Vouchers Yet</p>
                      <p className="text-xs text-slate-300 mt-1">Saved vouchers will appear here</p>
                    </div>
                  </div>
                ) : (
                  quotations.map((quote) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={quote.id}
                      className="group p-5 rounded-3xl border border-slate-100 bg-white hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      <div className="relative">
                        <div className="flex justify-between items-start mb-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-800 text-sm truncate max-w-[140px]">{quote.clientName}</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black tracking-widest bg-blue-600 text-white px-2 py-0.5 rounded-md">
                                {quote.bookingNumber}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">{new Date(quote.createdAt).toLocaleDateString()}</span>
                              <div className="h-1 w-1 bg-slate-200 rounded-full" />
                              <span className="text-[10px] font-bold text-blue-500">{quote.nights} Nights</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleExportPDF(quote)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleExportHTML(quote)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                              title="Download HTML"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => editQuotation(quote)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-all"
                              title="Edit Voucher"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => deleteQuotation(quote.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-medium flex items-center gap-2">
                              <div className="w-5 h-5 bg-slate-50 rounded flex items-center justify-center">
                                <Hotel className="w-3 h-3 text-slate-400" />
                              </div>
                              {quote.hotelName}
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <div className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-600">
                                {quote.margin.toFixed(1)}% MARGIN
                              </div>
                              <div className="text-[9px] font-bold text-slate-400">
                                {quote.rooms} Room(s)
                              </div>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                            <div className="text-xs font-black text-blue-600">
                              {quote.totalRevenue.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">SAR</span>
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {quote.city}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
