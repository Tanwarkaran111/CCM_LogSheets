import React, { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Header } from './components/Header';
import { LeftTable } from './components/LeftTable';
import { RightTable } from './components/RightTable';
import { Footer } from './components/Footer';

function App() {
  const [historyCount, setHistoryCount] = useState(0);
  const [isInIframe, setIsInIframe] = useState(false);
  const [oneDriveAvailable, setOneDriveAvailable] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
  }, []);

  // Load saved data and check OneDrive availability
  useEffect(() => {
    const loadData = async () => {
      try {
        // Check OneDrive availability (only for local development)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
          const oneDriveResponse = await fetch('/api/check-onedrive');
          if (oneDriveResponse.ok) {
            const oneDriveStatus = await oneDriveResponse.json();
            setOneDriveAvailable(oneDriveStatus.available);
          }
        }

        // 1. Load Draft State (Visual Inputs) from LocalStorage
        const savedData = localStorage.getItem('ccm-log-data');
        if (savedData) {
          const values = JSON.parse(savedData);
          const inputs = document.querySelectorAll('input, textarea');
          let valueIndex = 0;
          
          inputs.forEach((input) => {
            const el = input as HTMLInputElement | HTMLTextAreaElement;
            if (el.type === 'radio') {
               if (values[valueIndex] === el.value) {
                  (el as HTMLInputElement).checked = true;
               } else if (values[valueIndex] === '') {
                   (el as HTMLInputElement).checked = false;
               }
            } else {
               if (values[valueIndex] !== undefined) {
                 el.value = values[valueIndex];
               }
            }
            valueIndex++;
          });
        }

        // 2. Load History Count from LocalStorage (for static deployment)
        const savedHistory = localStorage.getItem('ccm-log-history');
        if (savedHistory) {
          const history = JSON.parse(savedHistory);
          setHistoryCount(history.length);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    // Small delay to ensure DOM is ready
    setTimeout(loadData, 100);
  }, []);

  // Helper to collect current form data into a key-value map
  const getFormDataMap = () => {
    const inputs = document.querySelectorAll('input, textarea');
    const dataMap: Record<string, string> = {};
    
    inputs.forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement;
      const label = el.getAttribute('data-label');
      if (label) {
         if (el.type === 'radio') {
            if ((el as HTMLInputElement).checked) {
               dataMap[label] = el.value;
            }
         } else {
            dataMap[label] = el.value;
         }
      }
    });
    return dataMap;
  };

  // Helper to save current draft state (array of values) for page reload persistence
  const saveDraftState = () => {
     const inputs = document.querySelectorAll('input, textarea');
     const valuesForStorage: string[] = [];
     inputs.forEach((input) => {
        const el = input as HTMLInputElement | HTMLTextAreaElement;
        if (el.type === 'radio') {
           valuesForStorage.push((el as HTMLInputElement).checked ? el.value : '');
        } else {
           valuesForStorage.push(el.value);
        }
     });
     localStorage.setItem('ccm-log-data', JSON.stringify(valuesForStorage));
  };

  const saveToOneDrive = async (workbook: XLSX.WorkBook) => {
    if (!oneDriveAvailable) {
      console.warn("OneDrive not available, skipping OneDrive save");
      return;
    }

    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const fileName = `CCM_Master_Log_${dateStr}.xlsx`;
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Convert Uint8Array to base64
      const uint8Array = new Uint8Array(excelBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64Data = btoa(binaryString);
      
      const response = await fetch('/api/save-to-onedrive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, fileData: base64Data })
      });

      const result = await response.json();
      if (result.success) {
        console.log("File saved to OneDrive:", result.path);
        return true;
      } else {
        console.error("Failed to save to OneDrive:", result.error);
        return false;
      }
    } catch (error) {
      console.error("Error saving to OneDrive:", error);
      return false;
    }
  };

  const generateAndSaveExcel = async (history: Record<string, string>[], isLocal: boolean) => {
    // --- GENERATE EXCEL (Horizontal Layout) ---
    const aoa: (string | number | null)[][] = [];
    const merges: any[] = [];
    
    // Layout Calculation:
    // Col 0: Parameter Labels
    // Entry 1: Col 1 & 2
    // Entry 2: Col 3 & 4
    // ...
    const numEntries = history.length;
    const totalCols = 1 + (numEntries * 2);

    // --- Titles ---
    aoa.push(["WELSPUN CORP LTD (STEEL DIVISION)"]);
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });
    
    aoa.push(["CCM LOG SHEET"]);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } });
    
    aoa.push([]); // Spacer

    // --- Header Rows for Columns ---
    const rowHeader1 = ["PARAMETER"];
    const rowHeader2 = [""]; // Empty cell under 'PARAMETER'

    for (let i = 0; i < numEntries; i++) {
        rowHeader1.push(`ENTRY #${i + 1}`, ""); 
        // Merge "ENTRY #X" across its 2 columns
        merges.push({ s: { r: 3, c: 1 + (i * 2) }, e: { r: 3, c: 2 + (i * 2) } });
        
        rowHeader2.push("STD 1 / VALUE", "STD 2");
    }
    aoa.push(rowHeader1); // Row Index 3
    aoa.push(rowHeader2); // Row Index 4
    
    let currentRowIndex = 5;

    // Helper to add a data row horizontally
    // keyBase: the data-label used in components (without "(STD 1)")
    const addRow = (label: string, keyBase: string, isSplit: boolean) => {
        const row = [label];
        for (let i = 0; i < numEntries; i++) {
            const data = history[i];
            if (isSplit) {
                // If split, use both columns for distinct values
                row.push(data[`${keyBase} (STD 1)`] || "");
                row.push(data[`${keyBase} (STD 2)`] || "");
            } else {
                // If single value, put value in first col, merge with second
                row.push(data[keyBase] || "");
                row.push("");
                merges.push({ s: { r: currentRowIndex, c: 1 + (i * 2) }, e: { r: currentRowIndex, c: 2 + (i * 2) } });
            }
        }
        aoa.push(row);
        currentRowIndex++;
    };

    // Helper for Section Headers
    const addSection = (label: string) => {
        const row = [label];
        // Merge section header across all columns
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: totalCols - 1 } });
        aoa.push(row);
        currentRowIndex++;
    };

    // --- BUILD ROWS ---

    // Basic Info
    addRow("DATE", "DATE", false);
    addRow("SHIFT", "SHIFT", false);
    addRow("HEAT NO", "HEAT NO", false);
    addRow("CAST NO", "CAST NO", false);
    addRow("SHIFT IN CHARGE", "SHIFT IN CHARGE", false);
    
    aoa.push([]); currentRowIndex++; // Spacer

    // Process Parameters
    addSection("--- PROCESS PARAMETERS ---");
    // TUNDISH TROLLEY added here
    addRow("TUNDISH TROLLEY", "TUNDISH TROLLEY", false);
    addRow("TUNDISH NO", "TUNDISH NO", false);
    addRow("TUNDISH BOARD", "TUNDISH BOARD", false);
    addRow("TUNDISH LIFE", "TUNDISH LIFE", false);

    const leftSplitItems = [
      "TUNDISH NOZZLE DIA",
      "TUNDISH OPENING", "MOULD JACKET NO", "SECTION", "MOULD TUBE NO",
      "MOULD TUBE LIFE", "MOULD TUBE CLEANING LIFE", "CASTING START TIME",
      "CASTING FINISH TIME", "TOTAL CASTING TIME", "AVG CASTING SPEED"
    ];
    leftSplitItems.forEach(item => addRow(item, item, true));
    
    addRow("RAPSEED OIL / CASTING POWDER", "RAPSEED OIL / CASTING POWDER", false);
    addRow("RHOMBOIDITY", "RHOMBOIDITY", true);
    addRow("PRIMARY MOULD WATER FLOW", "PRIMARY MOULD WATER", true); // Matches key: PRIMARY MOULD WATER (STD 1)

    // Nested Sections
    addSection("PRIMARY MOULD WATER PRESSURE");
    addRow("   INLET", "PRIMARY MOULD WATER PRESSURE - INLET", true);
    addRow("   OUTLET", "PRIMARY MOULD WATER PRESSURE - OUTLET", true);

    addSection("PRIMARY WATER TEMP");
    addRow("   INLET", "PRIMARY WATER TEMP - INLET", true);
    addRow("   OUTLET", "PRIMARY WATER TEMP - OUTLET", true);

    addSection("SECONDARY WATER (L/min)");
    addRow("ZONE 1", "ZONE 1", true);
    addRow("ZONE 2", "ZONE 2", true);
    addRow("ZONE 3", "ZONE 3", true);

    // Moved Remarks here to match visual layout
    aoa.push([]); currentRowIndex++;
    addRow("REMARKS", "REMARKS", false);
    aoa.push([]); currentRowIndex++;

    // Timings & Checks
    addSection("--- TIMINGS & CHECKS ---");
    const rightSingleItems = [
      "TAPPING TIME",
      "PURGING TIME",
      "LIFTING TEMP",
      "TUNDISH TEMP",
      "LADLE NO",
      "LADLE LIFE",
      "LADLE OPENING",
      "LADLE OPEN TIME",
      "LADLE CLOSE TIME"
    ];
    rightSingleItems.forEach(item => addRow(item, item, false));

    addRow("TOTAL NO OF BILLET", "TOTAL NO OF BILLET", true);
    addRow("TOTAL WT", "TOTAL WT", false);
    addRow("LADLE SHROUD LIFE", "LADLE SHROUD LIFE", false);
    addRow("BILLET LENGTH", "BILLET LENGTH", true);

    const rightSingleItems2 = [
      "TOCB",
      "CASTING COMPLETED AT",
      "MACHINE READY AT"
    ];
    rightSingleItems2.forEach(item => addRow(item, item, false));
    
    aoa.push([]); currentRowIndex++;

    // Personnel
    addSection("--- PERSONNEL ---");
    addRow("MOULD OPERATOR", "MOULD OPERATOR", true);
    addRow("FITTER / SHIFT FITTER", "FITTER / SHIFT FITTER", false);
    addRow("S B O", "S B O", false);
    addRow("GAS CUTTER", "GAS CUTTER", true);
    addRow("TEEMER MAN", "TEEMER MAN", false);


    // 6. Create Sheet
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Set Column Widths
    const cols = [{ wch: 35 }]; // Label Column
    for(let i=0; i<numEntries; i++) {
        cols.push({ wch: 15 }, { wch: 15 });
    }
    ws['!cols'] = cols;

    // Apply Merges
    ws['!merges'] = merges;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CCM Log History");
    
    if (isLocal) {
      // Local: Save to OneDrive and download
      await saveToOneDrive(wb);
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `CCM_Log_Horizontal_${dateStr}.xlsx`);
      
      const oneDriveMsg = oneDriveAvailable ? "\n\nFile also saved to your OneDrive folder (CCM-LogSheet)." : "";
      alert(`Entry #${history.length} saved successfully!${oneDriveMsg}\n\nThe data remains in the form.`);
    } else {
      // GitHub Pages: Just download
      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `CCM_Log_Horizontal_${dateStr}.xlsx`);
      
      alert(`Entry #${history.length} saved successfully!\n\nExcel file downloaded. Data stored locally in browser.\n\nNote: OneDrive saving is only available in Local Mode.\n\nThe data remains in the form.`);
    }
  };

  const handleSave = async () => {
    try {
      // 1. Save current state to local storage (Draft)
      saveDraftState();

      // 2. Get Data Map for History
      const currentDataMap = getFormDataMap();

      // Check if we're running locally with server (npm run dev) or on GitHub Pages
      const isLocalWithServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isGitHubPages = window.location.hostname.includes('github.io');

      if (isLocalWithServer) {
        // Local development: Save to server
        const saveResponse = await fetch('/api/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentDataMap)
        });

        if (!saveResponse.ok) throw new Error("Failed to save to server");

        // Get full history from server for Excel generation
        const historyResponse = await fetch('/api/history');
        if (!historyResponse.ok) throw new Error("Failed to fetch history");
        const history: Record<string, string>[] = await historyResponse.json();
        
        setHistoryCount(history.length);

        // Generate Excel and save to OneDrive
        await generateAndSaveExcel(history, true);
      } else {
        // GitHub Pages: Save to localStorage
        const savedHistory = localStorage.getItem('ccm-log-history');
        let history: Record<string, string>[] = [];
        
        if (savedHistory) {
          history = JSON.parse(savedHistory);
        }
        
        history.push(currentDataMap);
        localStorage.setItem('ccm-log-history', JSON.stringify(history));
        setHistoryCount(history.length);

        // Generate Excel for download
        await generateAndSaveExcel(history, false);
      }
      
    } catch (error) {
      console.error("Error saving data:", error);
      alert('Failed to save data.');
    }
  };

  const handleClearForm = () => {
      // Confirmation prevents accidental data loss
      if (!confirm("Are you sure you want to clear all inputs? This is only needed if you want to start completely fresh.")) return;

      const inputs = document.querySelectorAll('input, textarea');
      inputs.forEach((input) => {
        const el = input as HTMLInputElement | HTMLTextAreaElement;
        if (el.type === 'radio') {
            (el as HTMLInputElement).checked = false;
        } else {
            el.value = '';
        }
      });
      // Clear draft in storage too so it doesn't come back on reload
      localStorage.removeItem('ccm-log-data');
  };

  const handleResetHistory = async () => {
      const isLocalWithServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalWithServer) {
          // Local: Clear server history
          if (confirm("Are you sure? This will delete the central history file on the server. This cannot be undone.")) {
              try {
                  const response = await fetch('/api/history', { method: 'DELETE' });
                  if (response.ok) {
                      setHistoryCount(0);
                      alert("Server history cleared. Next save will be Entry #1.");
                  } else {
                      alert("Failed to clear server history.");
                  }
              } catch (error) {
                  console.error("Error clearing history:", error);
                  alert("Error connecting to server.");
              }
          }
      } else {
          // GitHub Pages: Clear localStorage history
          if (confirm("Are you sure? This will delete all saved entries from your browser. This cannot be undone.")) {
              localStorage.removeItem('ccm-log-history');
              setHistoryCount(0);
              alert("Browser history cleared. Next save will be Entry #1.");
          }
      }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex justify-center items-start print:p-0">
      
      {/* Paper Container */}
      <div className="w-full max-w-[1000px] bg-white border-2 border-black shadow-2xl print:shadow-none print:border-2">
        
        {/* Header */}
        <Header />

        {/* Main Split Body */}
        <div className="flex flex-col md:flex-row print:flex-row">
          {/* Left Panel: ~55% width */}
          <div className="w-full md:w-[55%]">
            <LeftTable />
          </div>

          {/* Right Panel: ~45% width */}
          <div className="w-full md:w-[45%]">
            <RightTable />
          </div>
        </div>

        {/* Footer / Personnel */}
        <Footer />

      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-3 no-print items-end">
        
        {/* Status Badge */}
        {historyCount > 0 && (
            <div className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full shadow-md mb-2">
                {historyCount} Entr{historyCount === 1 ? 'y' : 'ies'} in File
            </div>
        )}

        {/* Environment Status Badge */}
        <div className={`text-white text-xs px-3 py-1 rounded-full shadow-md mb-2 flex items-center gap-1 ${
          window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.0.1' 
            ? 'bg-green-600' 
            : 'bg-purple-600'
        }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'Local Mode' : 'Web Mode'}
        </div>

        {/* OneDrive Status Badge */}
        {oneDriveAvailable && (
            <div className="bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow-md mb-2 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4c-1.48 0-2.85.43-4.01 1.17l1.46 1.46C10.21 5.23 11.08 5 12 5c3.04 0 5.5 2.46 5.5 5.5v.5H19c2.05 0 3.71 1.66 3.71 3.71 0 1.71-1.04 2.63-2.36 2.36z"/>
                </svg>
                OneDrive ready
            </div>
        )}

        {/* Open in New Tab Button (Gray) - Only shows in iframe */}
        {isInIframe && (
          <button 
            onClick={() => window.open(window.location.href, '_blank')}
            className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center justify-center group relative"
            title="Open in New Tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
               Open in New Tab
            </span>
          </button>
        )}

        {/* Download Master Excel Button (Indigo) */}
        {historyCount > 0 && (
          <button 
            onClick={async () => {
              const isLocalWithServer = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
              
              if (isLocalWithServer) {
                try {
                  const response = await fetch('/api/history');
                  const history = await response.json();
                  alert("The 'Save' button already downloads the complete master file with all entries. \n\nTotal entries currently in master: " + history.length);
                } catch (e) {
                  console.error(e);
                }
              } else {
                // GitHub Pages: Show info from localStorage
                const savedHistory = localStorage.getItem('ccm-log-history');
                if (savedHistory) {
                  const history = JSON.parse(savedHistory);
                  alert("The 'Save' button already downloads the complete master file with all entries. \n\nTotal entries currently in master: " + history.length);
                }
              }
            }}
            className="bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center group relative"
            title="Check Master History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
               View Master Info
            </span>
          </button>
        )}

        {/* Save Button (Green) */}
        <button 
          onClick={handleSave}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors flex items-center justify-center group relative"
          title={
            window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
              ? "Save & Append to Excel (downloads file + saves to OneDrive)"
              : "Save & Download Excel (data stored in browser)"
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             Save & Append
          </span>
        </button>

        {/* Clear Inputs Button (Orange) - Backspace Icon */}
        <button 
          onClick={handleClearForm}
          className="bg-orange-500 text-white p-3 rounded-full shadow-lg hover:bg-orange-600 transition-colors flex items-center justify-center group relative"
          title="Clear Visual Inputs"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
          <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             Clear Inputs
          </span>
        </button>

        {/* Reset History Button (Red) */}
        <button 
          onClick={handleResetHistory}
          className="bg-red-600 text-white p-3 rounded-full shadow-lg hover:bg-red-700 transition-colors flex items-center justify-center group relative"
          title="Reset Excel History"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
           <span className="absolute right-full mr-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
             Reset File
          </span>
        </button>

        {/* Print Button (Blue) */}
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center justify-center group relative"
          title="Print Sheet"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
      </div>

    </div>
  );
}

export default App;