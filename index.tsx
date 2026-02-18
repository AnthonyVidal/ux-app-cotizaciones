
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  LayoutDashboard, 
  Mail, 
  MessageCircle, 
  Search, 
  Filter, 
  ChevronRight, 
  MoreVertical, 
  Plus, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Car,
  User,
  ExternalLink,
  Sparkles,
  Send,
  ArrowLeft,
  RefreshCw,
  Eye,
  MousePointer2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
type QuoteStatus = 'Nuevo' | 'Contactado' | 'Cita Agendada' | 'Vendido' | 'Perdido';
type QuoteSource = 'WhatsApp' | 'Email';

interface Quote {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  vehicle: string;
  source: QuoteSource;
  status: QuoteStatus;
  date: string;
  lastMessage: string;
  clicks: number; // Reemplaza priority
}

// --- Mock Data (Con datos de interacción) ---
const MOCK_QUOTES: Quote[] = [
  {
    id: 'COT-DIV-001',
    clientName: 'Juan Pérez',
    email: 'juan.p@email.com',
    phone: '+56912345678',
    vehicle: 'Jeep Wrangler Rubicon 2024',
    source: 'WhatsApp',
    status: 'Nuevo',
    date: '2024-05-20 10:30',
    lastMessage: 'Hola, me interesa saber el precio del Wrangler Rubicon y si tienen entrega inmediata.',
    clicks: 12 // Caliente
  },
  {
    id: 'COT-DIV-002',
    clientName: 'María García',
    email: 'm.garcia@email.com',
    phone: '+56987654321',
    vehicle: 'Jeep Grand Cherokee L',
    source: 'Email',
    status: 'Contactado',
    date: '2024-05-19 15:45',
    lastMessage: 'Quisiera agendar una prueba de manejo para la Grand Cherokee este sábado.',
    clicks: 5 // Tibio
  },
  {
    id: 'COT-DIV-003',
    clientName: 'Carlos Soto',
    email: 'csoto@email.com',
    phone: '+56955544433',
    vehicle: 'Jeep Gladiator Overland',
    source: 'Email',
    status: 'Vendido',
    date: '2024-05-18 09:20',
    lastMessage: 'Confirmado el pago de la reserva. Muchas gracias por la gestión.',
    clicks: 2 // Frío
  },
  {
    id: 'COT-DIV-004',
    clientName: 'Ana Morales',
    email: 'ana.m@email.com',
    phone: '+56911122233',
    vehicle: 'Jeep Renegade Trailhawk',
    source: 'WhatsApp',
    status: 'Cita Agendada',
    date: '2024-05-20 08:15',
    lastMessage: '¿Tienen el Renegade en color verde militar disponible?',
    clicks: 8 // Caliente
  }
];

// --- Components ---

const Badge = ({ children, variant }: React.PropsWithChildren<{ variant: string }>) => {
  const baseClasses = "px-2.5 py-0.5 rounded-full text-xs font-medium";
  const variants: Record<string, string> = {
    'Nuevo': "bg-blue-100 text-blue-800",
    'Contactado': "bg-yellow-100 text-yellow-800",
    'Cita Agendada': "bg-purple-100 text-purple-800",
    'Vendido': "bg-green-100 text-green-800",
    'Perdido': "bg-red-100 text-red-800",
    'WhatsApp': "bg-emerald-100 text-emerald-800",
    'Email': "bg-sky-100 text-sky-800",
  };
  return <span className={`${baseClasses} ${variants[variant] || "bg-slate-100 text-slate-700"}`}>{children}</span>;
};

// Nuevo Componente de Temperatura por Clicks
const TemperatureBar = ({ clicks }: { clicks: number }) => {
  const maxScale = 12; // Normalizamos la escala visual a 12 clics
  const percentage = Math.min((clicks / maxScale) * 100, 100);
  
  // Lógica de color: Azul (Frío) -> Naranja (Tibio) -> Rojo (Caliente)
  const getBarColor = () => {
    if (clicks >= 8) return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
    if (clicks >= 4) return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]';
    return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]';
  };

  return (
    <div className="flex items-center gap-3">
      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
        <div 
          className={`h-full ${getBarColor()} transition-all duration-700 ease-out`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold tabular-nums ${clicks >= 8 ? 'text-red-600' : clicks >= 4 ? 'text-orange-600' : 'text-blue-600'}`}>
        {clicks} clics
      </span>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
      </div>
      <div className="p-3 bg-slate-50 rounded-lg">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <TrendingUp className="w-4 h-4 text-emerald-500 mr-1" />
        <span className="text-emerald-500 font-medium">{trend}</span>
        <span className="text-slate-400 ml-2">vs mes anterior</span>
      </div>
    )}
  </div>
);

const App = () => {
  const [quotes, setQuotes] = useState<Quote[]>(MOCK_QUOTES);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(q => 
      q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [quotes, searchTerm]);

  const analyzeWithAI = async (quote: Quote) => {
    setIsAnalyzing(true);
    setAiError(null);
    setAiAnalysis('');
    
    const maxRetries = 2;
    let attempt = 0;

    const executeCall = async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Eres un asistente experto en ventas automotrices para DIVEMOTOR. 
        Analiza este lead y sugiere:
        1. Un resumen corto del interés del cliente considerando que ha hecho ${quote.clicks} clics en nuestra web.
        2. Un mensaje de respuesta ideal por ${quote.source} para cerrar una cita.
        3. Probabilidad de cierre (0-100%).
        
        Lead:
        Cliente: ${quote.clientName}
        Vehículo: ${quote.vehicle}
        Mensaje: ${quote.lastMessage}
        Interacción: ${quote.clicks} clics (Temperatura: ${quote.clicks >= 8 ? 'Caliente' : quote.clicks >= 4 ? 'Tibio' : 'Frío'})
        
        Responde en español con formato Markdown limpio.`
      });
      return response.text;
    };

    while (attempt <= maxRetries) {
      try {
        const text = await executeCall();
        setAiAnalysis(text || 'No se pudo generar el análisis.');
        setIsAnalyzing(false);
        return;
      } catch (error: any) {
        attempt++;
        if (attempt <= maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        } else {
          setAiError('Servicio de IA temporalmente no disponible.');
          setIsAnalyzing(false);
          return;
        }
      }
    }
  };

  useEffect(() => {
    if (selectedQuote) {
      analyzeWithAI(selectedQuote);
    } else {
      setAiAnalysis('');
      setAiError(null);
    }
  }, [selectedQuote]);

  const handleContact = (quote: Quote) => {
    const text = `Hola ${quote.clientName}, gracias por tu interés en el ${quote.vehicle}. Soy tu asesor de DIVEMOTOR. ¿Cuándo te gustaría venir a conocerlo?`;
    if (quote.source === 'WhatsApp') {
      window.open(`https://wa.me/${quote.phone.replace('+', '')}?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.location.href = `mailto:${quote.email}?subject=Información DIVEMOTOR - ${quote.vehicle}&body=${encodeURIComponent(text)}`;
    }
  };

  const handleAnular = (quoteId: string) => {
    if (confirm('¿Estás seguro que deseas anular esta cotización?')) {
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'Perdido' } : q));
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1e2329] text-white flex flex-col hidden lg:flex">
        <div className="p-8 pb-4 flex flex-col items-start gap-1">
          <div className="flex items-baseline font-black tracking-[-0.04em] text-[22px] leading-none text-slate-400">
            DIVE<span className="text-white">MOTOR</span>
          </div>
          <div className="h-[2px] w-full bg-indigo-500/30 mt-2"></div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Quotes Portal</span>
        </div>
        
        <nav className="flex-1 px-4 mt-6 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-600 rounded-lg text-white transition-colors">
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Mail className="w-5 h-5" />
            <span>Emails</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span>WhatsApp</span>
          </a>
          <div className="pt-6 pb-2 px-4 uppercase text-[10px] font-bold text-slate-600 tracking-widest">Administración</div>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <User className="w-5 h-5" />
            <span>Vendedores</span>
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-xs">DM</div>
            <div>
              <p className="text-sm font-medium text-slate-300">Asesor Jeep</p>
              <p className="text-[10px] text-emerald-400 font-bold uppercase">Online</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar cliente o modelo Jeep..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-transparent rounded-lg focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-8 w-px bg-slate-200 mx-2"></div>
            <button className="bg-[#1e2329] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-black transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Nuevo Lead
            </button>
          </div>
        </header>

        {/* Dashboard Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Leads Divemotor Hoy" value="24" icon={Clock} trend="+12%" />
            <StatCard title="Nuevas sin Leer" value="08" icon={AlertCircle} />
            <StatCard title="Tasa de Cierre" value="18.5%" icon={CheckCircle2} trend="+2.4%" />
            <StatCard title="Ventas del Mes" value="$1.2M" icon={TrendingUp} />
          </div>

          {/* List Section */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="font-bold text-slate-700 uppercase tracking-wider text-xs flex items-center gap-2">
                <Car className="w-4 h-4 text-slate-400" /> Cotizaciones Recibidas
              </h2>
              <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> WHATSAPP</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-sky-500"></div> EMAIL</span>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50/30">
                    <th className="px-6 py-4">ID REF</th>
                    <th className="px-6 py-4">Cliente / Vehículo</th>
                    <th className="px-6 py-4 text-center">Canal</th>
                    <th className="px-6 py-4">Interacción</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredQuotes.map((quote) => (
                    <tr 
                      key={quote.id} 
                      className={`hover:bg-slate-50 transition-colors group ${selectedQuote?.id === quote.id ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'}`}
                    >
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{quote.id}</td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{quote.clientName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{quote.vehicle}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={quote.source}>{quote.source}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <TemperatureBar clicks={quote.clicks} />
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={quote.status}>{quote.status}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => setSelectedQuote(quote)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm"
                            title="Ver Detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleContact(quote)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm"
                            title="Enviar Mensaje"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleAnular(quote.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all border border-transparent hover:border-slate-200 shadow-sm"
                            title="Anular"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedQuote && (
          <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col transform transition-transform animate-in slide-in-from-right">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-[#1e2329] text-white">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedQuote(null)}
                  className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-bold text-lg">{selectedQuote.clientName}</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">DIVEMOTOR REF: {selectedQuote.id}</p>
                </div>
              </div>
              <Badge variant={selectedQuote.status}>{selectedQuote.status}</Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Vehículo de Interés</p>
                  <p className="font-bold text-sm text-slate-800 flex items-center gap-2"><Car className="w-4 h-4 text-indigo-600" /> {selectedQuote.vehicle}</p>
                </div>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                    <MousePointer2 className="w-3 h-3" /> Interacción Web
                  </p>
                  <div className="mt-1">
                    <TemperatureBar clicks={selectedQuote.clicks} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Mensaje del Cliente</h4>
                <div className="bg-white border-l-4 border-l-indigo-500 border border-slate-200 p-5 rounded-r-2xl shadow-sm italic text-slate-700 text-sm leading-relaxed">
                  "{selectedQuote.lastMessage}"
                </div>
              </div>

              {/* AI Assistant DIVEMOTOR */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles className="w-20 h-20 text-indigo-600" />
                </div>
                
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                    <h4 className="font-bold text-slate-800 text-sm">Smart Analysis (Gemini AI)</h4>
                  </div>
                  {isAnalyzing && (
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  )}
                </div>

                {aiError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800">
                    <p className="text-xs font-medium">{aiError}</p>
                    <button onClick={() => analyzeWithAI(selectedQuote)} className="mt-3 text-[10px] bg-red-600 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-2">
                      <RefreshCw className="w-3 h-3" /> Reintentar Análisis
                    </button>
                  </div>
                )}

                {!isAnalyzing && !aiError && aiAnalysis && (
                  <div className="relative z-10">
                    <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line prose prose-sm prose-indigo">
                      {aiAnalysis}
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button 
                        className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-200"
                        onClick={() => handleContact(selectedQuote)}
                      >
                        <Send className="w-3 h-3" /> Contactar Vía {selectedQuote.source.toUpperCase()}
                      </button>
                      <button className="bg-white text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs hover:bg-slate-50 transition-colors font-bold">
                        Copiar
                      </button>
                    </div>
                  </div>
                )}
                
                {isAnalyzing && (
                  <div className="space-y-3 pt-2">
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-3/4"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-slate-200 rounded animate-pulse w-5/6"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-4 bg-white">
              <button className="flex-1 bg-white border border-slate-200 py-3 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" /> Historial CRM
              </button>
              <select 
                className="flex-1 bg-slate-50 border border-slate-200 py-3 rounded-xl text-xs font-bold text-slate-700 outline-none px-4 focus:ring-2 focus:ring-indigo-500"
                value={selectedQuote.status}
                onChange={(e) => {
                  const newStatus = e.target.value as QuoteStatus;
                  setQuotes(prev => prev.map(q => q.id === selectedQuote.id ? {...q, status: newStatus} : q));
                  setSelectedQuote(curr => curr ? {...curr, status: newStatus} : null);
                }}
              >
                <option value="Nuevo">Estado: Nuevo Lead</option>
                <option value="Contactado">Estado: Contactado</option>
                <option value="Cita Agendada">Estado: Cita Agendada</option>
                <option value="Vendido">Estado: Vendido</option>
                <option value="Perdido">Estado: Perdido / Anulado</option>
              </select>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
