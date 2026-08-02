// js/modules/12_ia_automatisation.js
import { getAIActivity, logAIAction, askChatbot, processDocumentOCR } from '../../services/aiService.js';

const COMPANY_ID = 'demo_company_001';
let ocrCounter = 0;

export async function initIA() {
    // 1. Chaje done yo
    const logs = await getAIActivity(COMPANY_ID);

    // 2. Kalkile metrik yo
    const aiInteractions = logs.filter(l => l.actionType === 'chat').length;
    const ocrProcessed = logs.filter(l => l.actionType === 'ocr').length;
    
    // Simile workflows aktif ak tan ekonomize
    const activeWorkflows = 8; // Fiks pou demo
    const timeSaved = 120; // Fiks pou demo

    // 3. Mete ajou UI
    document.getElementById('aiInteractions').textContent = aiInteractions;
    document.getElementById('ocrProcessed').textContent = ocrProcessed;
    document.getElementById('activeWorkflows').textContent = activeWorkflows;
    document.getElementById('timeSaved').textContent = timeSaved + 'h';

    // 4. Kreye graf yo
    createCharts();
}

function createCharts() {
    // Graf 1: Itilizasyon IA (Line)
    const ctxIa1 = document.getElementById('iaUsageChart')?.getContext('2d');
    if (ctxIa1) {
        new Chart(ctxIa1, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [{
                    label: 'Interaksyon',
                    data: [400, 550, 680, 900, 1100, 1240],
                    borderColor: '#4F46E5',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(79,70,229,0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Graf 2: Workflows & Tan (Bar)
    const ctxIa2 = document.getElementById('iaWorkflowChart')?.getContext('2d');
    if (ctxIa2) {
        new Chart(ctxIa2, {
            type: 'bar',
            data: {
                labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
                datasets: [
                    {
                        label: 'Tan Ekonomize (h)',
                        data: [40, 55, 65, 80, 110, 120],
                        backgroundColor: '#10B981',
                        borderRadius: 4
                    },
                    {
                        label: 'Workflows Aktif',
                        data: [2, 3, 3, 5, 6, 8],
                        backgroundColor: '#4F46E5',
                        borderRadius: 4
                    }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'top' } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } }, x: { grid: { display: false } } } }
        });
    }
}

// --- CHATBOT LOGIC ---
window.sendChatMessage = async function() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // 1. Ajoute mesaj itilizatè a
    const chatContainer = document.getElementById('chatMessages');
    chatContainer.innerHTML += `<div style="background:white; border:1px solid #E2E8F0; padding:8px 12px; border-radius:12px 12px 0 12px; width:fit-content; max-width:80%; align-self:flex-end; font-size:14px; margin-top:4px;">${message}</div>`;
    input.value = '';
    
    // 2. Simile repons IA a
    const response = await askChatbot(COMPANY_ID, message);
    chatContainer.innerHTML += `<div style="background:var(--secondary); color:white; padding:8px 12px; border-radius:12px 12px 12px 0; width:fit-content; max-width:80%; font-size:14px; margin-top:4px;">${response}</div>`;
    
    // 3. Log aksyon an
    await logAIAction(COMPANY_ID, 'chat', message);
    
    // 4. Refè KPI yo
    await initIA();
    chatContainer.scrollTop = chatContainer.scrollHeight;
};

// --- OCR LOGIC ---
window.processOCRFile = async function() {
    const fileInput = document.getElementById('ocrFileInput');
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const dropzone = document.getElementById('ocrDropzone');
    const originalText = dropzone.innerText;
    
    // 1. Simile tretman OCR
    dropzone.innerText = "⏳ Analiz an kou...";
    
    const result = await processDocumentOCR(COMPANY_ID, file.name);
    
    // 2. Ajoute rezilta nan lis la
    const resultList = document.getElementById('ocrResultList');
    resultList.innerHTML = `
        <div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid #f1f5f9;">
            <span>📄 ${result.fileName}</span>
            <span style="color:var(--secondary);">✅ ${result.status}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); padding:4px 0;">
            ${result.extractedData}
        </div>
    ` + resultList.innerHTML;
    
    // 3. Log aksyon OCR la
    await logAIAction(COMPANY_ID, 'ocr', file.name);
    
    // 4. Refè KPI yo
    await initIA();
    dropzone.innerText = originalText;
    fileInput.value = ''; // Reset input
};

window.openAIPrompt = function() {
    alert("🚀 Fenèt nouvo prompt IA ap ouvri nan pwochen vèsyon!");
};
