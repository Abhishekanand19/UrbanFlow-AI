// import { useState } from "react";
// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import { LayerToggles } from "./CommandMap";

// export function OperationsPanel() {
//   // ── ISSUE 2: Map Layer Toggles State ──
//   const [layers, setLayers] = useState<LayerToggles>({
//     original: true,
//     diversion: true,
//     emergency: true,
//     flood: false,
//     impact: false,
//   });

//   const toggleLayer = (key: keyof LayerToggles) => {
//     setLayers(prev => ({ ...prev, [key]: !prev[key] }));
//   };

//   // ── ISSUE 6: Executive PDF Generation (Aggressively Sanitized) ──
//   const generateExecutiveReport = async () => {
//     const pdfDoc = await PDFDocument.create();
//     const page = pdfDoc.addPage([600, 800]);
//     const { height } = page.getSize();
    
//     const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
//     const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

//     let currentY = height - 50;

//     const drawText = (text: string, size: number, isBold = false, x = 50) => {
//       // AGGRESSIVE SANITIZER: 
//       // 1. Replaces arrows with "to"
//       // 2. Replaces Rupee symbols with "INR"
//       // 3. Replaces bullet points with standard dashes
//       // 4. Strips ALL remaining non-ASCII Unicode characters to prevent crashes
//       const sanitizedText = text
//         .replace(/→/g, ' to ')
//         .replace(/₹/g, 'INR ')
//         .replace(/•/g, '-')
//         .replace(/[^\x00-\x7F]/g, ''); // Strips anything outside basic ASCII

//       page.drawText(sanitizedText, {
//         x,
//         y: currentY,
//         size,
//         font: isBold ? boldFont : font,
//         color: rgb(0.1, 0.1, 0.1),
//       });
//       currentY -= (size + 10);
//     };

//     // Draw Header
//     drawText("URBANFLOW AI - EXECUTIVE OPERATIONS REPORT", 18, true);
//     currentY -= 20;

//     // Draw Event Summary Table
//     drawText("EVENT SUMMARY", 14, true);
//     drawText("Location: Jayanagar Corridor", 12);
//     drawText("Event Type: Political Rally", 12);
//     drawText("Impact Radius: 1.2 km", 12);
//     currentY -= 20;

//     // Draw Recommendations
//     drawText("RESOURCE DEPLOYMENT", 14, true);
//     drawText("Resource                  Count", 12, true);
//     drawText("Police Officers           12", 12);
//     drawText("Traffic Barricades        8", 12);
//     currentY -= 20;

//     // Draw AI Interventions
//     drawText("AI INTERVENTIONS", 14, true);
//     // ISSUE 5: Executive language replacing technical jargon
//     drawText("- Route Diverted: Majestic to KR Market to Jayanagar", 12);
//     drawText("- Signal timing adjusted to reduce delays.", 12);
//     drawText("- Emergency corridor prioritized for rapid response.", 12);
    
//     const pdfBytes = await pdfDoc.save();
//     const blob = new Blob([pdfBytes], { type: "application/pdf" });
//     const link = document.createElement("a");
//     link.href = URL.createObjectURL(blob);
//     link.download = "UrbanFlow_Executive_Report.pdf";
//     link.click();
//   };

//   return (
//     <div className="bg-[#17181C] text-[#F2F3F5] w-[400px] h-full p-6 flex flex-col gap-6 overflow-y-auto border-l border-[#2A2D34]">
      
//       {/* Layer Toggles Control */}
//       <div className="bg-[#1D1F24] p-4 rounded-lg border border-[#2A2D34]">
//         <h3 className="text-sm font-bold mb-3 tracking-wide text-[#A0A7B5]">MAP LAYERS</h3>
//         <div className="flex flex-col gap-2">
//           {Object.entries(layers).map(([key, value]) => (
//             <label key={key} className="flex items-center gap-3 cursor-pointer text-sm capitalize">
//               <input 
//                 type="checkbox" 
//                 checked={value} 
//                 onChange={() => toggleLayer(key as keyof LayerToggles)}
//                 className="w-4 h-4 rounded border-[#2A2D34] bg-transparent checked:bg-[#4A90FF]"
//               />
//               {key} Routes/Zones
//             </label>
//           ))}
//         </div>
//       </div>

//       {/* AI Operations Brief */}
//       <div className="bg-[#1D1F24] p-4 rounded-lg border border-[#2A2D34]">
//         <h3 className="text-sm font-bold mb-3 tracking-wide text-[#A0A7B5]">OPERATIONAL RECOMMENDATION</h3>
//         <ul className="text-sm space-y-2">
//           <li>- Deploy 12 officers</li>
//           <li>- Install 8 barricades</li>
//           {/* ISSUE 5: Executive terminology implemented here visually */}
//           <li>- Signal timing adjusted to reduce delays</li>
//         </ul>
//       </div>

//       <div className="mt-auto pt-6">
//         <button 
//           onClick={generateExecutiveReport}
//           className="w-full bg-[#4A90FF] text-white py-3 rounded-md font-semibold hover:bg-blue-600 transition-colors"
//         >
//           Export Executive Report
//         </button>
//       </div>
      
//     </div>
//   );
// }