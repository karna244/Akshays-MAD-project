import { useState, useEffect, useRef } from "react";
import { 
  TollBooth, 
  Transaction, 
  RfidAccount, 
  DashboardStats, 
  VehicleType 
} from "./types";
import { 
  Shield, 
  RefreshCw, 
  Activity, 
  DollarSign, 
  Car, 
  Truck, 
  AlertTriangle, 
  Sparkles, 
  Wifi, 
  Plus, 
  Search, 
  Tv, 
  Sliders, 
  User, 
  Zap, 
  CircleDot, 
  ChevronRight, 
  TrendingUp, 
  HelpCircle,
  Database,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [booths, setBooths] = useState<TollBooth[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rfidAccounts, setRfidAccounts] = useState<RfidAccount[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  
  // Simulation Controller Configuration
  const [simRunning, setSimRunning] = useState<boolean>(true);
  const [simFrequency, setSimFrequency] = useState<number>(5000);
  
  // Interactive Filter States
  const [txFilter, setTxFilter] = useState<"all" | "success" | "flagged" | "violation">("all");
  const [searchPlate, setSearchPlate] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"monitor" | "booths" | "rfid" | "analytics">("monitor");

  // RFID/FASTag Top-up states
  const [selectedRfidId, setSelectedRfidId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(500);
  const [topUpSuccessMsg, setTopUpSuccessMsg] = useState<string | null>(null);

  // AI Prompt State
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // Dynamic visual feedback for simulated events
  const [flashLedger, setFlashLedger] = useState<boolean>(false);
  const [visualLog, setVisualLog] = useState<{ id: string; text: string; type: "info" | "success" | "warning" | "error" }[]>([]);

  // Timer Ref for Polling live updates
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Add items to visual telemetry console
  const addVisualLog = (text: string, type: "info" | "success" | "warning" | "error" = "info") => {
    setVisualLog(prev => [
      { id: Math.random().toString(), text, type },
      ...prev.slice(0, 15)
    ]);
  };

  // Fetch Operations from Backend
  const fetchData = async (isPoll = false) => {
    try {
      const [boothsRes, txRes, rfidRes, statsRes, simRes] = await Promise.all([
        fetch("/api/booths"),
        fetch("/api/transactions"),
        fetch("/api/rfid"),
        fetch("/api/stats"),
        fetch("/api/simulation/config")
      ]);

      if (boothsRes.ok && txRes.ok && rfidRes.ok && statsRes.ok && simRes.ok) {
        const boothsData: TollBooth[] = await boothsRes.json();
        const txData: Transaction[] = await txRes.json();
        const rfidData: RfidAccount[] = await rfidRes.json();
        const statsData: DashboardStats = await statsRes.json();
        const simData = await simRes.json();

        // Trigger flash when new logs arrive on live updates
        if (isPoll && txData.length > 0 && transactions.length > 0) {
          if (txData[0].id !== transactions[0].id) {
            setFlashLedger(true);
            setTimeout(() => setFlashLedger(false), 500);
            
            const newTx = txData[0];
            const timestamp = new Date(newTx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            if (newTx.status === "violation") {
              addVisualLog(`[${timestamp}] OCR EVASION TARGET DETECTED: Plate ${newTx.licensePlate} bypass unpaid. Action Logged.`, "error");
            } else if (newTx.status === "flagged") {
              addVisualLog(`[${timestamp}] DEFICIT INSOLVENCY FLAG: ${newTx.licensePlate} Tag registered to ${newTx.ownerName} has low credit score.`, "warning");
            } else {
              addVisualLog(`[${timestamp}] FASTAG DEDUCTED PERFECTLY: ${newTx.licensePlate} paid ₹${newTx.amount.toFixed(2)} at ${newTx.boothName}.`, "success");
            }
          }
        }

        setBooths(boothsData);
        setTransactions(txData);
        setRfidAccounts(rfidData);
        setStats(statsData);
        setSimRunning(simData.isSimulationRunning);
        setSimFrequency(simData.simulationFrequency);
      }
    } catch (err) {
      console.error("Error polling toll network metadata:", err);
    }
  };

  useEffect(() => {
    fetchData();
    pollTimerRef.current = setInterval(() => {
      fetchData(true);
    }, 2500);

    // Initial system terminal sequence
    addVisualLog("Akshay's Intelligent Toll Gate Command Core initializing...", "info");
    addVisualLog("Establishing secure fast-link and encrypted FASTag payment gateways.", "success");
    addVisualLog("Neural OCR high-speed high-definition plate scanners: ONLINE.", "success");

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [transactions]);

  // Handle congestion pricing dynamic multipliers
  const adjustSurcharge = async (boothId: string, value: number) => {
    try {
      const response = await fetch(`/api/booths/${boothId}/price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rateMultiplier: value })
      });
      if (response.ok) {
        addVisualLog(`Congestion multiplier of booth ${boothId} updated to ${value.toFixed(2)}x.`, "success");
        fetchData();
      }
    } catch (err) {
      addVisualLog("Could not adjust dynamic surcharge rates.", "error");
    }
  };

  // Toggle booth barrier status
  const toggleLaneStatus = async (boothId: string, targetStatus: "active" | "maintenance" | "closed") => {
    try {
      const response = await fetch(`/api/booths/${boothId}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus })
      });
      if (response.ok) {
        addVisualLog(`Barrier gate status for lane ${boothId} set to [${targetStatus.toUpperCase()}].`, "info");
        fetchData();
      }
    } catch (err) {
      addVisualLog("Connection to physical lane controller failed.", "error");
    }
  };

  // Simulate Instant vehicle transits manually
  const triggerManualSimulation = async () => {
    try {
      const response = await fetch("/api/transactions/simulate", { method: "POST" });
      if (response.ok) {
        addVisualLog("Scanning vehicle loops... triggering instant lane transit event.", "info");
        fetchData(true);
      }
    } catch (err) {
      addVisualLog("Simulation injection failed.", "error");
    }
  };

  // Update backend simulation parameters
  const updateSimConfig = async (running: boolean, frequencyMs: number) => {
    try {
      const response = await fetch("/api/simulation/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ running, frequency: frequencyMs })
      });
      if (response.ok) {
        setSimRunning(running);
        setSimFrequency(frequencyMs);
        addVisualLog(`Autopilot Scheduler: ${running ? 'ENABLED' : 'PAUSED'}, Frequency: ${(frequencyMs / 1000).toFixed(1)}s`, "info");
        fetchData();
      }
    } catch (err) {
      addVisualLog("Failed to rewrite scheduler configurations.", "error");
    }
  };

  // Perform a deposit top-up for the FASTag account
  const submitRfidTopUp = async () => {
    if (!selectedRfidId) return;
    try {
      const response = await fetch("/api/rfid/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedRfidId, amount: Number(topUpAmount) })
      });

      if (response.ok) {
        const result = await response.json();
        setTopUpSuccessMsg(`Successfully credited ₹${topUpAmount.toLocaleString()} to ${result.account.ownerName}. Balance restored to ₹${result.account.balance.toFixed(2)}.`);
        addVisualLog(`Ledger Posted: ₹${topUpAmount.toLocaleString()} received via UPI for ${result.account.ownerName}.`, "success");
        fetchData();
        setTimeout(() => setTopUpSuccessMsg(null), 4000);
      }
    } catch (err) {
      addVisualLog("Gateway response error. Could not post payment.", "error");
    }
  };

  // Call the AI Dispatcher endpoint
  const dispatchAiCommander = async (customPrompt?: string) => {
    const activePrompt = customPrompt || aiPrompt;
    if (!activePrompt && !customPrompt) return;
    
    setAiLoading(true);
    setAiResponse("");
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: activePrompt })
      });

      if (response.ok) {
        const result = await response.json();
        setAiResponse(result.text);
        addVisualLog("Toll Intelligence Commander dispatch loaded successfully.", "success");
      } else {
        setAiResponse("Underlying AI cores are currently warming up or key credentials are blank.");
      }
    } catch (err) {
      setAiResponse("A local exception prevented remote neural command completion.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = txFilter === "all" || tx.status === txFilter;
    const matchesSearch = tx.licensePlate.toLowerCase().includes(searchPlate.toLowerCase()) || 
                          (tx.ownerName && tx.ownerName.toLowerCase().includes(searchPlate.toLowerCase())) ||
                          tx.boothName.toLowerCase().includes(searchPlate.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalRevenueEver = stats?.totalRevenue ?? 0;
  const totalVehiclesEver = stats?.totalVehicles ?? 0;
  const activeBoothsCount = booths.filter(b => b.status === "active").length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      
      {/* Immersive Cyber Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-indigo-500/20 sticky top-0 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-tr from-indigo-600 to-purple-650 rounded-xl text-white shadow-[0_0_15px_rgba(79,70,229,0.4)] border border-indigo-400/30 flex items-center justify-center animate-pulse">
              <Shield className="h-6 w-6 text-indigo-100" id="logo-icon" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl md:text-2xl font-bold font-display tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-300">
                  AKSHAY'S TOLL GATE SYSTEM
                </h1>
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 text-[10px] px-2.5 py-1 rounded-full font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span> Live Systems Active
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">NH-44 Expressway & Mumbai-Pune toll plaza monitoring command dashboard.</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3 text-xs">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl px-3.5 py-2 flex items-center space-x-2.5 shadow-inner">
              <Wifi className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono font-medium">Lanes: {activeBoothsCount}/{booths.length} Engaged</span>
            </div>
            <button 
              onClick={() => fetchData()}
              className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold px-4 py-2 rounded-xl flex items-center space-x-2 cursor-pointer shadow-lg shadow-indigo-600/20 border border-indigo-500/35"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Poll Data Stream</span>
            </button>
          </div>

        </div>
      </header>

      {/* Futuristic Glass KPI Strip (Rupee focused) */}
      <section className="border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-sm py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/30 rounded-2xl p-5 flex items-start justify-between shadow-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(16,185,129,0.05)]">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">gross revenue collected</span>
                <span className="text-2xl md:text-3xl font-bold font-display tracking-tight text-emerald-450 glow-emerald font-mono">
                  ₹{totalRevenueEver.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Avg ₹{(totalVehiclesEver > 0 ? totalRevenueEver / totalVehiclesEver : 0).toFixed(1)} per scan
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <span className="font-bold text-xl leading-none">₹</span>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-5 flex items-start justify-between shadow-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(99,102,241,0.05)]">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">automatic ocr scans</span>
                <span className="text-2xl md:text-3xl font-bold font-display tracking-tight text-white font-mono">
                  {totalVehiclesEver.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">Lanes transits registered successfully</span>
              </div>
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-rose-500/30 rounded-2xl p-5 flex items-start justify-between shadow-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(239,68,68,0.05)] relative overflow-hidden">
              <div className="space-y-1 relative z-10">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">evasion violations flagged</span>
                <span className="text-2xl md:text-3xl font-bold font-display tracking-tight text-rose-505 font-mono">
                  {stats?.violationsCount ?? 0}
                </span>
                <span className="text-xs text-rose-400 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 animate-bounce" /> {stats && totalVehiclesEver > 0 ? ((stats.violationsCount / totalVehiclesEver) * 100).toFixed(1) : 0}% of net transits
                </span>
              </div>
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-450 z-10">
                <AlertTriangle className="h-5 w-5" />
              </div>
              {/* Pulsing alarm glow red in bg if violations exist */}
              {(stats?.violationsCount ?? 0) > 0 && (
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/5 to-transparent h-full w-full pointer-events-none"></div>
              )}
            </div>

            {/* KPI 4 */}
            <div className="bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/30 rounded-2xl p-5 flex items-start justify-between shadow-xl transition-all duration-300 hover:translate-y-[-2px] hover:shadow-[0_4px_20px_rgba(99,102,241,0.05)] animate-glow">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">FASTag adoption rate</span>
                <span className="text-2xl md:text-3xl font-bold font-display tracking-tight text-indigo-300 font-mono">
                  {stats?.rfidPassAdoption ?? 0}%
                </span>
                <div className="w-full bg-slate-850 rounded-full h-1.5 mt-2 overflow-hidden border border-slate-800">
                  <div 
                    className="bg-indigo-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-1000" 
                    style={{ width: `${stats?.rfidPassAdoption ?? 0}%` }}
                  ></div>
                </div>
              </div>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Glass Console Work Desk Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Sleek Dark Menu Swapper Tabs */}
        <div className="flex border-b border-slate-800 mb-8 bg-slate-900/40 p-1.5 rounded-2xl shadow-inner inline-flex flex-wrap gap-1 border border-slate-800/50">
          <button
            onClick={() => setActiveTab("monitor")}
            className={`px-5 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "monitor" 
                ? "bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] border border-indigo-500/30" 
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Tv className="h-4 w-4" />
            <span>Telemetry & OCR Feeds</span>
          </button>
          
          <button
            onClick={() => setActiveTab("booths")}
            className={`px-5 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "booths" 
                ? "bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] border border-indigo-500/30" 
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Lane Settings & Surge</span>
          </button>

          <button
            onClick={() => setActiveTab("rfid")}
            className={`px-5 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "rfid" 
                ? "bg-indigo-600 text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] border border-indigo-500/30" 
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <User className="h-4 w-4" />
            <span>FASTag Account Bureau</span>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-5 py-3 rounded-xl flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "analytics" 
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_4px_15px_rgba(124,58,237,0.3)] border border-violet-500/30" 
                : "text-indigo-400 hover:bg-indigo-950/20 hover:text-indigo-300 font-bold"
            }`}
          >
            <Sparkles className="h-4 w-4 animate-spin-slow" />
            <span>Gemini AI Command Advisor</span>
          </button>
        </div>

        {/* ----------------- TAB 1: MONITOR & live TELEMETRY OCR LOGS ----------------- */}
        <AnimatePresence mode="wait">
          {activeTab === "monitor" && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              
              {/* Simulation Engine Autopilot Controls */}
              <div className="space-y-6 lg:col-span-1">
                
                {/* Simulation block */}
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display font-semibold text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-indigo-400 animate-pulse" /> Autopilot Simulator
                    </h3>
                    <span className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border uppercase tracking-wider leading-none ${
                      simRunning 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]" 
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {simRunning ? "LIVE LOOPING" : "AUTOPILOT PAUSED"}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs leading-relaxed mb-5">
                    Orchestrates continuous vehicle transits through NH-44 and Mumbai-Pune express lines. Seamlessly triggers cash deposits, FASTag scans, or optical violation actions.
                  </p>

                  {/* Toggle button layout */}
                  <div className="flex items-center justify-between py-3.5 border-y border-slate-800/80">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-200 text-xs uppercase tracking-wider">Automated traffic loop</span>
                      <span className="text-[10px] text-indigo-400/80 font-mono">Continuous vehicle generation</span>
                    </div>
                    <button
                      onClick={() => updateSimConfig(!simRunning, simFrequency)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        simRunning ? "bg-indigo-600" : "bg-slate-800"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                          simRunning ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Frequency Slider */}
                  <div className="space-y-3 pt-5">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Spawn Frequency Interval:</span>
                      <span className="text-amber-450 font-mono">{(simFrequency / 1000).toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min="1500"
                      max="15000"
                      step="500"
                      value={simFrequency}
                      onChange={(e) => updateSimConfig(simRunning, Number(e.target.value))}
                      disabled={!simRunning}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>1.5 seconds (Rush)</span>
                      <span>15.0 seconds (Idle)</span>
                    </div>
                  </div>

                  {/* Instant Manual Pass Trigger button */}
                  <div className="pt-6">
                    <button
                      onClick={triggerManualSimulation}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-[0_4px_15px_rgba(79,70,229,0.3)] cursor-pointer border border-indigo-400/30 text-xs uppercase tracking-wider"
                    >
                      <Zap className="h-4 w-4 text-amber-300 animate-bounce" />
                      <span>Simulate Manual Lane Transit</span>
                    </button>
                  </div>

                </div>

                {/* Encrypted OCR Console Activity Log Stream */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 text-slate-100 shadow-2xl relative">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-850">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                      <h3 className="font-mono text-slate-300 font-semibold text-xs uppercase tracking-widest leading-none">
                        Live Plate OCR Scans
                      </h3>
                    </div>
                    <button 
                      onClick={() => setVisualLog([])}
                      className="text-slate-500 hover:text-slate-200 text-[10px] font-mono border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      Dump Feed
                    </button>
                  </div>

                  {/* Raw Telemetries list wrapper */}
                  <div className="font-mono text-[11px] space-y-2.5 max-h-[224px] overflow-y-auto pr-1">
                    {visualLog.length === 0 ? (
                      <p className="text-slate-600 italic">Listening for vehicle transits...</p>
                    ) : (
                      visualLog.map(log => (
                        <div key={log.id} className={`p-2.5 rounded-lg border tracking-tight leading-relaxed ${
                          log.type === "error" ? "bg-rose-950/20 border-rose-900/40 text-rose-300" :
                          log.type === "warning" ? "bg-amber-950/20 border-amber-900/40 text-amber-300" :
                          log.type === "success" ? "bg-emerald-950/25 border-emerald-900/45 text-emerald-300" :
                          "bg-slate-900/60 border-slate-850 text-slate-400"
                        }`}>
                          {log.text}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="text-[9px] text-slate-600 font-mono mt-4 text-left leading-normal">
                    SECURED HIGHWAY GATEWAY NETWORK // ID-PLATE-STREAM // SECURE LOGGED IP-PROMPT
                  </div>
                </div>

              </div>

              {/* simulated Live table logs Ledger */}
              <div className="space-y-6 lg:col-span-2">
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
                  
                  {/* Ledger header filters */}
                  <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-850">
                    <div>
                      <h3 className="font-semibold text-white text-lg">Central Toll-Booth Telemetry Ledger</h3>
                      <p className="text-slate-400 text-xs">Real-time highway OCR records audited against automated payment scores</p>
                    </div>
                    
                    {/* Status selection pills */}
                    <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850">
                      {(['all', 'success', 'flagged', 'violation'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setTxFilter(f)}
                          className={`text-[11px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                            txFilter === f 
                              ? "bg-indigo-600 text-white shadow-sm" 
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {f === "all" ? "SHOW ALL" : f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search License Plate Bar */}
                  <div className="relative mb-5">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-550">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search MH, DL, KA license plates, owner name, or booth expressway..."
                      value={searchPlate}
                      onChange={(e) => setSearchPlate(e.target.value)}
                      className="w-full bg-slate-950/80 hover:bg-slate-950 text-slate-100 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl py-2.5 px-10 text-xs transition-all focus:outline-none placeholder-slate-500"
                    />
                    {searchPlate && (
                      <button 
                        onClick={() => setSearchPlate("")} 
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-250 text-xs font-semibold py-1 hover:scale-105 transition-all"
                      >
                        CLEAR
                      </button>
                    )}
                  </div>

                  {/* Live audited table block */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[620px] text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 border-y border-slate-850 text-slate-400 font-mono font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">Timestamp / Transit ID</th>
                          <th className="px-4 py-3">Vehicle Class / Plate Details</th>
                          <th className="px-4 py-3">Expressway Gate Location</th>
                          <th className="px-4 py-3">Amount Fare</th>
                          <th className="px-4 py-3">Method</th>
                          <th className="px-4 py-3 text-right">OCR Integrity Status</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y divide-slate-800/60 transition-opacity duration-300 ${flashLedger ? 'bg-indigo-950/10 opacity-90' : ''}`}>
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-10 text-slate-550 italic">
                              No vehicle records matched the active filter conditions. Try engaging the Autopilot Simulator first.
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map(tx => {
                            const VehicleIcon = tx.vehicleType === "truck" || tx.vehicleType === "bus" ? Truck : Car;
                            const scanTime = new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            
                            return (
                              <tr key={tx.id} className="hover:bg-slate-850/30 transition-colors">
                                <td className="px-4 py-3.5">
                                  <div className="text-slate-200 font-bold font-mono text-[12px]">{scanTime}</div>
                                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{tx.id}</div>
                                </td>
                                
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center space-x-3">
                                    <div className={`p-1.5 rounded-lg border shadow-inner ${
                                      tx.vehicleType === 'truck' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                      tx.vehicleType === 'bus' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                                      tx.vehicleType === 'motorcycle' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                      'bg-slate-800 border-slate-700 text-slate-350'
                                    }`}>
                                      <VehicleIcon className="h-4 w-4" />
                                    </div>
                                    <div>
                                      {/* Beautiful Indian Registration Plate layout standard */}
                                      <div className="inline-flex items-center rounded overflow-hidden border border-slate-400/20 font-mono text-[10px] font-bold bg-white text-slate-900 shadow-sm leading-none h-6">
                                        <div className="bg-indigo-700 text-[8px] text-white h-full px-1.5 flex items-center justify-center font-bold tracking-tighter uppercase">
                                          IND
                                        </div>
                                        <div className="px-2 py-0.5 tracking-wide text-slate-950">
                                          {tx.licensePlate}
                                        </div>
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">{tx.ownerName || "Unrecorded Occupant"}</div>
                                    </div>
                                  </div>
                                </td>

                                <td className="px-4 py-3.5 text-slate-300 font-semibold font-display">
                                  {tx.boothName}
                                </td>

                                <td className="px-4 py-3.5 font-bold font-mono text-slate-100 text-sm">
                                  ₹{tx.amount.toFixed(2)}
                                </td>

                                <td className="px-4 py-3.5 uppercase font-mono text-[10px] font-bold">
                                  <span className={`px-2.5 py-1 rounded-md border tracking-wider ${
                                    tx.paymentMethod === 'rfid' 
                                      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_8px_rgba(99,102,241,0.1)]' 
                                      : tx.paymentMethod === 'cash' 
                                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]' 
                                      : 'bg-rose-500/10 text-rose-350 border-rose-500/20 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                                  }`}>
                                    {tx.paymentMethod === 'rfid' ? 'FASTag' : tx.paymentMethod === 'cash' ? 'Cash' : 'Unpaid'}
                                  </span>
                                </td>

                                <td className="px-4 py-3.5 text-right">
                                  <div className="inline-flex flex-col items-end">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border ${
                                      tx.status === 'success' 
                                        ? 'bg-emerald-500/10 text-emerald-350 border-emerald-500/30' 
                                        : tx.status === 'flagged' 
                                        ? 'bg-amber-500/10 text-amber-350 border-amber-500/30' 
                                        : 'bg-rose-500/10 text-rose-350 border-rose-500/30 animate-pulse'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${
                                        tx.status === 'success' ? 'bg-emerald-400' :
                                        tx.status === 'flagged' ? 'bg-amber-400' : 'bg-rose-450'
                                      }`}></span>
                                      {tx.status === 'success' ? 'APPROVED' : tx.status === 'flagged' ? 'FLAGGED DEFICIT' : 'EVASION VIOLATION'}
                                    </span>
                                    {tx.violationDetails && (
                                      <p className="text-[10px] text-rose-300 mt-1 max-w-[280px] leading-tight text-right italic font-medium">
                                        {tx.violationDetails}
                                      </p>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-5 pt-4.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <p>Auditor View // Rendered {filteredTransactions.length} scans of {transactions.length} network events.</p>
                    <p>SSL Encryption Secured</p>
                  </div>

                </div>
              </div>

            </motion.div>
          )}

          {/* ----------------- TAB 2: LANE MANAGEMENT CONFIG ----------------- */}
          {activeTab === "booths" && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
                <div className="mb-6">
                  <h3 className="font-semibold text-white text-lg">Expressway Lane Congestion Tower</h3>
                  <p className="text-slate-400 text-xs">Configure physical lane barrier closures, override tolls dynamically, and configure peak surge congestion pricing.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {booths.map(booth => {
                    const isMaintenance = booth.status === "maintenance";
                    const isClosed = booth.status === "closed";
                    const isActive = booth.status === "active";

                    return (
                      <div 
                        key={booth.id} 
                        className={`border rounded-2xl p-5 shadow-xl transition-all relative flex flex-col justify-between group ${
                          isActive 
                            ? "bg-slate-950/90 border-slate-800 hover:border-indigo-500/40" 
                            : isMaintenance 
                            ? "bg-amber-950/10 border-amber-950/40" 
                            : "bg-slate-950/20 border-slate-900 opacity-60"
                        }`}
                      >
                        {/* Booth title status */}
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-slate-200 group-hover:text-white transition-colors font-display text-[15px]">{booth.name}</h4>
                              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{booth.id}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border leading-none ${
                              isActive 
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]" 
                                : isMaintenance 
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-400" 
                                : "bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse"
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-450' : isMaintenance ? 'bg-amber-450' : 'bg-rose-450'}`}></span>
                              {booth.status}
                            </span>
                          </div>

                          {/* Base fare grid matrix */}
                          <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 mb-4 space-y-3 shadow-inner">
                            <span className="text-[9px] font-mono text-slate-500 font-bold uppercase tracking-widest block border-b border-slate-850 pb-1.5">Registered Base Rates (INR)</span>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px] text-slate-400 font-mono">
                              <div className="flex justify-between">
                                <span>Car:</span>
                                <strong className="text-slate-250">₹{booth.baseRate.car}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Truck:</span>
                                <strong className="text-slate-250">₹{booth.baseRate.truck}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Bus:</span>
                                <strong className="text-slate-250">₹{booth.baseRate.bus}</strong>
                              </div>
                              <div className="flex justify-between">
                                <span>Bike:</span>
                                <strong className="text-slate-250">₹{booth.baseRate.motorcycle}</strong>
                              </div>
                            </div>
                            
                            {/* Adjusted Price multipliers */}
                            <div className="pt-2.5 border-t border-slate-850 flex justify-between items-center text-[10px] font-mono text-slate-450">
                              <span className="uppercase font-bold tracking-wider">Dynamic Multiplier:</span>
                              <span className="text-indigo-400 font-bold text-xs">{booth.rateMultiplier.toFixed(2)}x</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-semibold text-white">
                              <span>Effective Car Toll:</span>
                              <span className="text-emerald-400 font-bold font-mono text-sm shadow-emerald">₹{(booth.baseRate.car * booth.rateMultiplier).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Lane adjustments */}
                        <div className="space-y-4 pt-3.5 border-t border-slate-850">
                          {/* Congestion slider */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                              <span>Congestion Surcharge</span>
                              <span className="text-indigo-400 font-mono">{booth.rateMultiplier.toFixed(2)}x</span>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="2.5"
                              step="0.05"
                              value={booth.rateMultiplier}
                              onChange={(e) => adjustSurcharge(booth.id, Number(e.target.value))}
                              disabled={!isActive}
                              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-40"
                            />
                            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                              <span>1.0x Normal</span>
                              <span>2.5x Max peak surge</span>
                            </div>
                          </div>

                          {/* Barrier Controls */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Oversee Lane Gate barrier:</span>
                            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 flex-wrap gap-1">
                              {(["active", "maintenance", "closed"] as const).map(st => (
                                <button
                                  key={st}
                                  onClick={() => toggleLaneStatus(booth.id, st)}
                                  className={`flex-1 text-[10px] uppercase tracking-wider font-bold py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                                    booth.status === st 
                                      ? "bg-indigo-600 text-white shadow-md border border-indigo-400/30" 
                                      : "text-slate-450 hover:text-slate-200 hover:bg-slate-850/50"
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Quick details */}
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-850/50">
                            <span>Scanned: {booth.totalVehicles} items</span>
                            <span>Total Tolls: ₹{booth.totalRevenue.toLocaleString()}</span>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ----------------- TAB 3: FASTAG ACCOUNTS REGISTER & DEPOSITS ----------------- */}
          {activeTab === "rfid" && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              
              {/* FASTag Registry database list */}
              <div className="lg:col-span-2">
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
                  <div className="mb-6">
                    <h3 className="font-semibold text-white text-lg">National FASTag Registry Bureau</h3>
                    <p className="text-slate-400 text-xs">Registered physical RFID tags authorized for automated electronic passage deduction</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[500px] text-xs">
                      <thead>
                        <tr className="bg-slate-950/60 border-y border-slate-850 text-slate-400 font-mono font-bold uppercase tracking-wider">
                          <th className="px-4 py-3">FASTag Registered Owner</th>
                          <th className="px-4 py-3 font-mono">Tag identification</th>
                          <th className="px-4 py-3">Active Status score</th>
                          <th className="px-4 py-3">Prepaid Credit Balance</th>
                          <th className="px-4 py-3 text-right">Top-up Desk</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {rfidAccounts.map(account => {
                          const isLow = account.balance < 100.0 && account.status !== "suspended";
                          const isSuspended = account.status === "suspended";
                          
                          return (
                            <tr key={account.id} className="hover:bg-slate-850/20 transition-colors">
                              <td className="px-4 py-4">
                                <div className="font-bold text-slate-200 text-sm">{account.ownerName}</div>
                                <div className="inline-flex mt-1 items-center rounded overflow-hidden border border-slate-400/20 font-mono text-[9px] font-bold bg-white text-slate-950 leading-none h-5">
                                  <div className="bg-indigo-700 text-[8px] text-white h-full px-1 flex items-center justify-center font-bold tracking-tighter">IND</div>
                                  <div className="px-1.5 py-0.5 tracking-wider text-slate-900">{account.licensePlate}</div>
                                </div>
                              </td>

                              <td className="px-4 py-4 font-mono font-bold text-slate-400">
                                {account.tagNumber}
                              </td>

                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full font-bold uppercase border ${
                                  isSuspended 
                                    ? "bg-rose-500/10 text-rose-350 border-rose-550/20 animate-pulse" 
                                    : isLow 
                                    ? "bg-amber-500/10 text-amber-350 border-amber-550/20" 
                                    : "bg-emerald-500/10 text-emerald-350 border-emerald-550/20 shadow-emerald"
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${isSuspended ? 'bg-rose-450' : isLow ? 'bg-amber-450' : 'bg-emerald-450'}`}></span>
                                  {isSuspended ? "SUSPENDED INSOLVENT" : isLow ? "LOW BALANCE ALERT" : "ACTIVE / SOLVENT"}
                                </span>
                              </td>

                              <td className="px-4 py-4 font-bold font-mono text-sm">
                                <span className={account.balance < 0 ? "text-rose-405 font-bold" : account.balance < 100 ? "text-amber-400" : "text-emerald-400"}>
                                  ₹{account.balance.toFixed(2)}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedRfidId(account.id);
                                    setTopUpSuccessMsg(null);
                                  }}
                                  className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-indigo-650 hover:bg-indigo-550 text-white rounded-lg px-3 py-2 transition-all cursor-pointer shadow-md"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Deposit Desk</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              </div>

              {/* Instant Prepaid Top Up Form Box */}
              <div className="lg:col-span-1">
                <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl">
                  <h3 className="font-semibold text-white text-[16px] mb-2 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-indigo-400" /> FASTag Prepaid Desk
                  </h3>
                  <p className="text-slate-400 text-xs mb-5 leading-normal">
                    Instantly load digital UPI balance onto registration vehicle tag to recover suspended/deficit status loops instantly.
                  </p>

                  <div className="space-y-4">
                    
                    {/* Select account holder */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Select Owner Profile:</label>
                      <select
                        value={selectedRfidId || ""}
                        onChange={(e) => {
                          setSelectedRfidId(e.target.value || null);
                          setTopUpSuccessMsg(null);
                        }}
                        className="w-full bg-slate-950 text-slate-100 border border-slate-800 focus:border-indigo-500 font-medium text-xs py-2.5 px-3 rounded-xl transition-all outline-none"
                      >
                        <option value="">-- Click to select account holder --</option>
                        {rfidAccounts.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.ownerName} ({a.licensePlate} - Bal: ₹{a.balance.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedRfidId && (
                      <div className="space-y-4 pt-3.5 border-t border-slate-800/80 animate-fadeIn">
                        
                        {/* Selected info card preview */}
                        {(() => {
                          const activeAcc = rfidAccounts.find(a => a.id === selectedRfidId);
                          if (!activeAcc) return null;
                          return (
                            <div className="bg-slate-950/80 border border-slate-850 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed font-mono">
                              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold block mb-1.5">Account Status Record:</span>
                              <p>Tag Holder: <strong className="text-slate-200">{activeAcc.ownerName}</strong></p>
                              <p>Tag Ident: <strong className="text-slate-200">{activeAcc.tagNumber}</strong></p>
                              <p>Current Credit: <strong className="text-slate-200">₹{activeAcc.balance}</strong></p>
                            </div>
                          );
                        })()}

                        {/* Amount selector buttons */}
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Configure Deposit amount:</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[200, 500, 1000].map(val => (
                              <button
                                key={val}
                                onClick={() => setTopUpAmount(val)}
                                className={`py-2 text-xs font-bold rounded-xl border font-mono transition-all text-center cursor-pointer ${
                                  topUpAmount === val 
                                    ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/20" 
                                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                ₹{val}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom input box */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">Or custom refill amount (INR):</label>
                          <input
                            type="number"
                            min="50"
                            max="10000"
                            value={topUpAmount}
                            onChange={(e) => setTopUpAmount(Number(e.target.value))}
                            className="w-full bg-slate-950 text-slate-100 border border-slate-850 focus:border-indigo-500 font-mono text-xs py-2.5 px-3 rounded-xl transition-all outline-none"
                          />
                        </div>

                        {/* Submit Button */}
                        <button
                          onClick={submitRfidTopUp}
                          disabled={topUpAmount <= 0}
                          className="w-full mt-2 cursor-pointer bg-emerald-650 hover:bg-emerald-555 text-white font-bold tracking-wider uppercase py-3 rounded-xl transition-all shadow-[0_4px_15px_rgba(16,185,129,0.2)] text-[11px] flex items-center justify-center space-x-2 border border-emerald-500/30"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Dispatch Deposit Funds</span>
                        </button>

                      </div>
                    )}

                    {topUpSuccessMsg && (
                      <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 text-emerald-400 rounded-xl text-xs leading-relaxed animate-pulse">
                        {topUpSuccessMsg}
                      </div>
                    )}

                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ----------------- TAB 4: GEMINI AI CONTROL TOWARDS ADVISORY ----------------- */}
          {activeTab === "analytics" && (
            <motion.div 
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="bg-slate-900/40 border border-slate-850 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
                {/* Neon decorative background glow blur */}
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-650/10 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="flex items-center space-x-3 mb-4 relative z-10">
                  <div className="p-2.5 bg-indigo-50/10 border border-indigo-400/30 rounded-xl text-indigo-400 animate-pulse">
                    <Sparkles className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">Gemini AI Toll Network Control Advisor</h3>
                    <p className="text-slate-400 text-xs text-indigo-300">Intelligent dispatch hub for forecasting congestion, dynamic rate optimization, and leak audits on FASTag gates</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10 pt-4">
                  
                  {/* Prompt terminal panel */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-950/90 border border-slate-850 rounded-2xl p-5 shadow-2xl">
                      <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-widest block mb-4">Prompt Commander Gate</span>
                      
                      <div className="space-y-4">
                        <textarea
                          rows={4}
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="Example: Ask Gemini to recommend peak hour congestion rates, audit the latest FASTag transits deficit lists, or optimize high-speed plate evasion audits..."
                          className="w-full bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-xl p-3 text-xs leading-relaxed transition-all outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                        />

                        <button
                          onClick={() => dispatchAiCommander()}
                          disabled={aiLoading}
                          className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-550 hover:to-indigo-550 text-white font-bold tracking-wider uppercase py-3 px-4 rounded-xl transition-all shadow-[0_4px_15px_rgba(124,58,237,0.3)] disabled:opacity-40 text-xs flex items-center justify-center space-x-2 border border-violet-500/30 cursor-pointer"
                        >
                          {aiLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin text-white" />
                              <span>Analyzing plaza streams...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-violet-200 animate-pulse" />
                              <span>Call AI Commander Control</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Quick advice preset cards */}
                      <div className="mt-6 pt-5 border-t border-slate-850 space-y-2.5">
                        <span className="text-[9px] font-mono font-bold text-slate-505 block uppercase tracking-widest">Plaza Scenario Presets:</span>
                        
                        <button
                          onClick={() => {
                            const prompt = "Analyze the latest FASTag transits, and flag any low-balance Tag accounts or vehicles with repeated deficits.";
                            setAiPrompt(prompt);
                            dispatchAiCommander(prompt);
                          }}
                          className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl p-3 text-[11px] text-slate-350 hover:text-white transition-all cursor-pointer leading-normal block"
                        >
                          Audit FASTag balances & low credit scores
                        </button>

                        <button
                          onClick={() => {
                            const prompt = "Recommend dynamic peak congestion surge pricing multiplier percentages for the Akshay NH-44 Express & Mumbai-Pune lanes.";
                            setAiPrompt(prompt);
                            dispatchAiCommander(prompt);
                          }}
                          className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl p-3 text-[11px] text-slate-350 hover:text-white transition-all cursor-pointer leading-normal block"
                        >
                          Optimize peak dynamic surge multipliers
                        </button>

                        <button
                          onClick={() => {
                            const prompt = "Highlight potential revenue leakages, plate scanner OCR bypass rates, and recommend enforcement improvements.";
                            setAiPrompt(prompt);
                            dispatchAiCommander(prompt);
                          }}
                          className="w-full text-left bg-slate-900 hover:bg-slate-850 border border-slate-850 rounded-xl p-3 text-[11px] text-slate-350 hover:text-white transition-all cursor-pointer leading-normal block"
                        >
                          Audit plate evasion and leakage points
                        </button>
                      </div>

                    </div>
                  </div>

                  {/* Analysis output stream terminal view */}
                  <div className="lg:col-span-2">
                    <div className="bg-slate-950/90 border border-slate-850 rounded-2xl p-6 shadow-2xl h-full flex flex-col justify-between font-mono relative min-h-[400px]">
                      
                      <div>
                        {/* Terminal title */}
                        <div className="flex items-center justify-between pb-3.5 border-b border-slate-850 text-slate-400 text-xs mb-4">
                          <span className="flex items-center gap-1.5 uppercase font-bold text-slate-300">
                            <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping inline-block"></span> Secure AI Telecommunication
                          </span>
                          <span>STATION: METRO-COMMAND-IN</span>
                        </div>

                        {/* Actual text body formatted beautifully */}
                        <div className="text-slate-300 text-xs leading-relaxed space-y-3 max-h-[360px] overflow-y-auto pr-1">
                          {aiLoading ? (
                            <div className="py-10 text-center space-y-3">
                              <RefreshCw className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
                              <p className="text-slate-500 text-xs italic">Processing neural transaction metadata matrices... please hold...</p>
                            </div>
                          ) : aiResponse ? (
                            <div className="whitespace-pre-line prose prose-invert font-sans text-[13px] text-slate-300">
                              {aiResponse}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-slate-650 italic text-xs">
                              <HelpCircle className="h-8 w-8 text-indigo-500/20 mx-auto mb-3" />
                              <p>Enter a custom prompt or click on one of the scenario preset templates on the left side to compile dynamic intelligent forecasts.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-3.5 mt-5 text-[9px] text-slate-600 leading-normal flex items-center justify-between">
                        <span>MODEL: GEMINI-3.5-FLASH // DIRECT INJECTION SECURE TUNNEL</span>
                        <span>DETERMINISM: BALANCED</span>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>

      {/* Cyberpunk Footer */}
      <footer className="bg-slate-950 border-t border-slate-850 py-6 text-center text-xs text-slate-550 flex flex-col sm:flex-row sm:justify-between sm:px-8 max-w-7xl mx-auto w-full gap-4 font-mono">
        <p>© 2026 METROPASS™ Akshay's Electronic Gateways. System Version 4.1-India.</p>
        <div className="flex justify-center space-x-4">
          <span className="hover:text-slate-450 transition-colors">FASTag Secure Tunnel</span>
          <span>•</span>
          <span className="hover:text-slate-450 transition-colors">METROPASS Protocol v2</span>
        </div>
      </footer>

    </div>
  );
}
